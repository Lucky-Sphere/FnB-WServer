package store

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/fnb/server/internal/models"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const tz = "Asia/Kuching"

type Store struct {
	db *sql.DB
}

func New(connStr string) (*Store, error) {
	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	db.SetMaxOpenConns(20)

	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return s, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		name TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin', 'kitchen')),
		created_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE TABLE IF NOT EXISTS categories (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		sort_order INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE TABLE IF NOT EXISTS menu_items (
		id SERIAL PRIMARY KEY,
		category_id INTEGER NOT NULL REFERENCES categories(id),
		name TEXT NOT NULL,
		description TEXT DEFAULT '',
		price REAL NOT NULL CHECK(price > 0),
		image_url TEXT DEFAULT '',
		is_available INTEGER NOT NULL DEFAULT 1,
		created_at TIMESTAMPTZ DEFAULT NOW(),
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE TABLE IF NOT EXISTS orders (
		id SERIAL PRIMARY KEY,
		order_id TEXT NOT NULL DEFAULT '',
		user_id INTEGER NOT NULL REFERENCES users(id),
		table_number INTEGER NOT NULL DEFAULT 0,
		status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'preparing', 'ready', 'paid', 'cancelled')),
		total_amount REAL NOT NULL DEFAULT 0,
		created_at TIMESTAMPTZ DEFAULT NOW(),
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE TABLE IF NOT EXISTS order_items (
		id SERIAL PRIMARY KEY,
		order_id INTEGER NOT NULL REFERENCES orders(id),
		menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
		quantity INTEGER NOT NULL CHECK(quantity > 0),
		unit_price REAL NOT NULL,
		subtotal REAL NOT NULL
	);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
	ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin', 'cashier', 'kitchen'));
	`
	if _, err := s.db.Exec(query); err != nil {
		return err
	}

	// Add missing columns (idempotent for existing databases)
	for _, col := range []struct{ table, name, typ string }{
		{"orders", "order_id", "TEXT NOT NULL DEFAULT ''"},
		{"orders", "table_number", "INTEGER NOT NULL DEFAULT 0"},
		{"order_items", "is_done", "INTEGER NOT NULL DEFAULT 0"},
	} {
		var count int
		s.db.QueryRow(
			"SELECT COUNT(*) FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
			col.table, col.name,
		).Scan(&count)
		if count == 0 {
			s.db.Exec("ALTER TABLE " + col.table + " ADD COLUMN " + col.name + " " + col.typ)
		}
	}

	// Rename email to username if needed
	var emailExists int
	s.db.QueryRow(
		"SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name='email'",
	).Scan(&emailExists)
	if emailExists > 0 {
		s.db.Exec("ALTER TABLE users RENAME COLUMN email TO username")
	}

	// Migrate 'completed' status to 'paid'
	s.db.Exec("UPDATE orders SET status = 'paid', updated_at = NOW() WHERE status = 'completed'")

	return nil
}

func (s *Store) CreateUser(username, passwordHash, name string) (*models.User, error) {
	var id int64
	err := s.db.QueryRow(
		"INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, 'customer') RETURNING id",
		username, passwordHash, name,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetUser(id)
}

func (s *Store) CreateAdminUser(username, passwordHash, name string, role ...string) (*models.User, error) {
	r := "admin"
	if len(role) > 0 {
		r = role[0]
	}
	var id int64
	err := s.db.QueryRow(
		"INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
		username, passwordHash, name, r,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetUser(id)
}

func (s *Store) GetUser(id int64) (*models.User, error) {
	var u models.User
	var createdAt time.Time
	err := s.db.QueryRow(
		"SELECT id, username, password_hash, name, role, created_at FROM users WHERE id = $1", id,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Name, &u.Role, &createdAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}

func (s *Store) GetUserByUsername(username string) (*models.User, error) {
	var u models.User
	var createdAt time.Time
	err := s.db.QueryRow(
		"SELECT id, username, password_hash, name, role, created_at FROM users WHERE username = $1", username,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Name, &u.Role, &createdAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}

func (s *Store) UpdateUserPassword(id int64, passwordHash string) error {
	_, err := s.db.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", passwordHash, id)
	return err
}

func (s *Store) UpdateUserName(id int64, name string) error {
	_, err := s.db.Exec("UPDATE users SET name = $1 WHERE id = $2", name, id)
	return err
}

func (s *Store) UpdateUserRole(id int64, role string) error {
	_, err := s.db.Exec("UPDATE users SET role = $1 WHERE id = $2", role, id)
	return err
}

func (s *Store) UpdateUserUsername(id int64, username string) error {
	_, err := s.db.Exec("UPDATE users SET username = $1 WHERE id = $2", username, id)
	return err
}

func (s *Store) ListUsers() ([]models.User, error) {
	rows, err := s.db.Query("SELECT id, username, password_hash, name, role, created_at FROM users ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		var createdAt time.Time
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Name, &u.Role, &createdAt); err != nil {
			return nil, err
		}
		u.PasswordHash = ""
		u.CreatedAt = createdAt
		users = append(users, u)
	}
	return users, nil
}

func (s *Store) CreateCategory(name string, sortOrder int) (*models.Category, error) {
	var id int64
	err := s.db.QueryRow(
		"INSERT INTO categories (name, sort_order) VALUES ($1, $2) RETURNING id",
		name, sortOrder,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetCategory(id)
}

func (s *Store) GetCategory(id int64) (*models.Category, error) {
	var c models.Category
	var createdAt time.Time
	err := s.db.QueryRow(
		"SELECT id, name, sort_order, created_at FROM categories WHERE id = $1", id,
	).Scan(&c.ID, &c.Name, &c.SortOrder, &createdAt)
	if err != nil {
		return nil, err
	}
	c.CreatedAt = createdAt
	return &c, nil
}

func (s *Store) ListCategories() ([]models.Category, error) {
	rows, err := s.db.Query("SELECT id, name, sort_order, created_at FROM categories ORDER BY sort_order, name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := make([]models.Category, 0)
	for rows.Next() {
		var c models.Category
		var createdAt time.Time
		if err := rows.Scan(&c.ID, &c.Name, &c.SortOrder, &createdAt); err != nil {
			return nil, err
		}
		c.CreatedAt = createdAt
		categories = append(categories, c)
	}
	return categories, nil
}

func (s *Store) UpdateCategory(id int64, name string, sortOrder int) (*models.Category, error) {
	_, err := s.db.Exec("UPDATE categories SET name = $1, sort_order = $2 WHERE id = $3", name, sortOrder, id)
	if err != nil {
		return nil, err
	}
	return s.GetCategory(id)
}

func (s *Store) DeleteCategory(id int64) error {
	_, err := s.db.Exec("DELETE FROM categories WHERE id = $1", id)
	return err
}

func (s *Store) CreateMenuItem(categoryID int64, name, description string, price float64, imageURL string, isAvailable bool) (*models.MenuItem, error) {
	avail := 0
	if isAvailable {
		avail = 1
	}
	var id int64
	err := s.db.QueryRow(
		"INSERT INTO menu_items (category_id, name, description, price, image_url, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
		categoryID, name, description, price, imageURL, avail,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetMenuItem(id)
}

func (s *Store) GetMenuItem(id int64) (*models.MenuItem, error) {
	var m models.MenuItem
	var createdAt, updatedAt time.Time
	var avail int
	err := s.db.QueryRow(
		"SELECT id, category_id, name, description, price, image_url, is_available, created_at, updated_at FROM menu_items WHERE id = $1", id,
	).Scan(&m.ID, &m.CategoryID, &m.Name, &m.Description, &m.Price, &m.ImageURL, &avail, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	m.IsAvailable = avail == 1
	m.CreatedAt = createdAt
	m.UpdatedAt = updatedAt
	return &m, nil
}

func (s *Store) ListMenuItems(includeUnavailable bool) ([]models.MenuItem, error) {
	query := "SELECT id, category_id, name, description, price, image_url, is_available, created_at, updated_at FROM menu_items"
	if !includeUnavailable {
		query += " WHERE is_available = 1"
	}
	query += " ORDER BY category_id, name"

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.MenuItem, 0)
	for rows.Next() {
		var m models.MenuItem
		var createdAt, updatedAt time.Time
		var avail int
		if err := rows.Scan(&m.ID, &m.CategoryID, &m.Name, &m.Description, &m.Price, &m.ImageURL, &avail, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		m.IsAvailable = avail == 1
		m.CreatedAt = createdAt
		m.UpdatedAt = updatedAt
		items = append(items, m)
	}
	return items, nil
}

func (s *Store) UpdateMenuItem(id int64, req models.CreateMenuItemRequest) (*models.MenuItem, error) {
	avail := 0
	if req.IsAvailable {
		avail = 1
	}
	_, err := s.db.Exec(
		"UPDATE menu_items SET category_id=$1, name=$2, description=$3, price=$4, image_url=$5, is_available=$6, updated_at=NOW() WHERE id=$7",
		req.CategoryID, req.Name, req.Description, req.Price, req.ImageURL, avail, id,
	)
	if err != nil {
		return nil, err
	}
	return s.GetMenuItem(id)
}

func (s *Store) DeleteMenuItem(id int64) error {
	_, err := s.db.Exec("DELETE FROM menu_items WHERE id = $1", id)
	return err
}

func (s *Store) CreateOrder(userID int64, tableNumber int, items []models.CreateOrderItem) (*models.Order, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var totalAmount float64
	for _, item := range items {
		var price float64
		err := tx.QueryRow("SELECT price FROM menu_items WHERE id = $1 AND is_available = 1", item.MenuItemID).Scan(&price)
		if err != nil {
			return nil, fmt.Errorf("menu item %d not available: %w", item.MenuItemID, err)
		}
		totalAmount += price * float64(item.Quantity)
	}

	now := time.Now()
	orderIDStr := now.Format("0601021504") + fmt.Sprintf("-%d", tableNumber)

	var orderID int64
	err = tx.QueryRow(
		"INSERT INTO orders (order_id, user_id, table_number, status, total_amount) VALUES ($1, $2, $3, 'pending', $4) RETURNING id",
		orderIDStr, userID, tableNumber, totalAmount,
	).Scan(&orderID)
	if err != nil {
		return nil, err
	}

	for _, item := range items {
		var price float64
		tx.QueryRow("SELECT price FROM menu_items WHERE id = $1", item.MenuItemID).Scan(&price)
		_, err := tx.Exec(
			"INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)",
			orderID, item.MenuItemID, item.Quantity, price, price*float64(item.Quantity),
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.GetOrder(orderID)
}

func (s *Store) GetOrder(id int64) (*models.Order, error) {
	var o models.Order
	var createdAt, updatedAt time.Time
	err := s.db.QueryRow(
		"SELECT id, order_id, user_id, table_number, status, total_amount, created_at, updated_at FROM orders WHERE id = $1", id,
	).Scan(&o.ID, &o.OrderID, &o.UserID, &o.TableNumber, &o.Status, &o.TotalAmount, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	o.CreatedAt = createdAt
	o.UpdatedAt = updatedAt

	items, err := s.getOrderItems(id)
	if err != nil {
		return nil, err
	}
	o.Items = items

	return &o, nil
}

func (s *Store) getOrderItems(orderID int64) ([]models.OrderItem, error) {
	rows, err := s.db.Query(
		`SELECT oi.id, oi.order_id, oi.menu_item_id, COALESCE(mi.name, ''), oi.quantity, oi.unit_price, oi.subtotal, oi.is_done
		 FROM order_items oi
		 LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
		 WHERE oi.order_id = $1`, orderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.OrderItem, 0)
	for rows.Next() {
		var item models.OrderItem
		if err := rows.Scan(&item.ID, &item.OrderID, &item.MenuItemID, &item.Name, &item.Quantity, &item.UnitPrice, &item.Subtotal, &item.IsDone); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *Store) ListUserOrders(userID int64, startDate, endDate string, page, perPage int) ([]models.Order, int, error) {
	countQuery := "SELECT COUNT(*) FROM orders WHERE user_id = $1"
	dataQuery := "SELECT id, order_id, user_id, table_number, status, total_amount, created_at, updated_at FROM orders WHERE user_id = $1"
	var args []any
	args = append(args, userID)

	if startDate != "" && endDate != "" {
		countQuery += " AND (created_at AT TIME ZONE '" + tz + "')::date >= $2 AND (created_at AT TIME ZONE '" + tz + "')::date <= $3"
		dataQuery += " AND (created_at AT TIME ZONE '" + tz + "')::date >= $2 AND (created_at AT TIME ZONE '" + tz + "')::date <= $3"
		args = append(args, startDate, endDate)
	} else {
		countQuery += " AND (created_at AT TIME ZONE '" + tz + "')::date = (NOW() AT TIME ZONE '" + tz + "')::date"
		dataQuery += " AND (created_at AT TIME ZONE '" + tz + "')::date = (NOW() AT TIME ZONE '" + tz + "')::date"
	}

	var total int
	if err := s.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 50
	}
	offset := (page - 1) * perPage
	dataQuery += " ORDER BY created_at DESC LIMIT $4 OFFSET $5"
	dataArgs := append(args, perPage, offset)

	rows, err := s.db.Query(dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&o.ID, &o.OrderID, &o.UserID, &o.TableNumber, &o.Status, &o.TotalAmount, &createdAt, &updatedAt); err != nil {
			return nil, 0, err
		}
		o.CreatedAt = createdAt
		o.UpdatedAt = updatedAt
		orders = append(orders, o)
	}
	return orders, total, nil
}

func (s *Store) ListAllOrders(startDate, endDate string, page, perPage int) ([]models.Order, int, error) {
	countQuery := "SELECT COUNT(*) FROM orders"
	dataQuery := "SELECT id, order_id, user_id, table_number, status, total_amount, created_at, updated_at FROM orders"
	var args []any

	if startDate != "" && endDate != "" {
		countQuery += " WHERE (created_at AT TIME ZONE '" + tz + "')::date >= $1 AND (created_at AT TIME ZONE '" + tz + "')::date <= $2"
		dataQuery += " WHERE (created_at AT TIME ZONE '" + tz + "')::date >= $1 AND (created_at AT TIME ZONE '" + tz + "')::date <= $2"
		args = append(args, startDate, endDate)
	} else {
		countQuery += " WHERE (created_at AT TIME ZONE '" + tz + "')::date = (NOW() AT TIME ZONE '" + tz + "')::date"
		dataQuery += " WHERE (created_at AT TIME ZONE '" + tz + "')::date = (NOW() AT TIME ZONE '" + tz + "')::date"
	}
	dataQuery += " ORDER BY created_at DESC"

	var total int
	if err := s.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 50
	}
	offset := (page - 1) * perPage
	dataQuery += " LIMIT $3 OFFSET $4"
	dataArgs := append(args, perPage, offset)

	rows, err := s.db.Query(dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&o.ID, &o.OrderID, &o.UserID, &o.TableNumber, &o.Status, &o.TotalAmount, &createdAt, &updatedAt); err != nil {
			return nil, 0, err
		}
		o.CreatedAt = createdAt
		o.UpdatedAt = updatedAt
		orders = append(orders, o)
	}
	return orders, total, nil
}

func (s *Store) UpdateOrderStatus(id int64, status string) (*models.Order, error) {
	_, err := s.db.Exec(
		"UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", status, id,
	)
	if err != nil {
		return nil, err
	}
	return s.GetOrder(id)
}

func (s *Store) GetSalesByDay(days int) ([]models.SalesDataPoint, error) {
	rows, err := s.db.Query(
		`SELECT (created_at AT TIME ZONE '`+tz+`')::date as date,
		        SUM(total_amount) as total,
		        COUNT(*) as count
		 FROM orders
		 WHERE created_at >= NOW() + $1::INTERVAL
		 GROUP BY (created_at AT TIME ZONE '`+tz+`')::date
		 ORDER BY date`, fmt.Sprintf("-%d days", days),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	data := make([]models.SalesDataPoint, 0)
	for rows.Next() {
		var d models.SalesDataPoint
		if err := rows.Scan(&d.Date, &d.Total, &d.Count); err != nil {
			return nil, err
		}
		data = append(data, d)
	}
	return data, nil
}

func (s *Store) GetHourlySales(days int) ([]models.HourlyDataPoint, error) {
	rows, err := s.db.Query(
		`SELECT EXTRACT(HOUR FROM o.created_at)::INTEGER as hour,
		        SUM(oi.quantity) as items_sold,
		        SUM(oi.subtotal) as total
		 FROM orders o
		 JOIN order_items oi ON oi.order_id = o.id
		 WHERE o.created_at >= NOW() + $1::INTERVAL
		 GROUP BY hour
		 ORDER BY hour`, fmt.Sprintf("-%d days", days),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	data := make([]models.HourlyDataPoint, 0)
	for rows.Next() {
		var d models.HourlyDataPoint
		if err := rows.Scan(&d.Hour, &d.ItemsSold, &d.Total); err != nil {
			return nil, err
		}
		data = append(data, d)
	}
	return data, nil
}

func (s *Store) recalcOrderTotal(orderID int64) error {
	var total float64
	err := s.db.QueryRow("SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = $1", orderID).Scan(&total)
	if err != nil {
		return err
	}
	_, err = s.db.Exec("UPDATE orders SET total_amount = $1, updated_at = NOW() WHERE id = $2", total, orderID)
	return err
}

func (s *Store) UpdateOrderItem(orderID, itemID int64, quantity *int, isDone *bool) (*models.Order, error) {
	if quantity != nil {
		var unitPrice float64
		err := s.db.QueryRow("SELECT unit_price FROM order_items WHERE id = $1 AND order_id = $2", itemID, orderID).Scan(&unitPrice)
		if err != nil {
			return nil, fmt.Errorf("order item not found")
		}
		subtotal := unitPrice * float64(*quantity)
		_, err = s.db.Exec("UPDATE order_items SET quantity = $1, subtotal = $2 WHERE id = $3", *quantity, subtotal, itemID)
		if err != nil {
			return nil, err
		}
	}
	if isDone != nil {
		v := 0
		if *isDone {
			v = 1
		}
		_, err := s.db.Exec("UPDATE order_items SET is_done = $1 WHERE id = $2", v, itemID)
		if err != nil {
			return nil, err
		}
	}
	if err := s.recalcOrderTotal(orderID); err != nil {
		return nil, err
	}
	return s.GetOrder(orderID)
}

func (s *Store) DeleteOrderItem(orderID, itemID int64) (*models.Order, error) {
	_, err := s.db.Exec("DELETE FROM order_items WHERE id = $1 AND order_id = $2", itemID, orderID)
	if err != nil {
		return nil, err
	}
	if err := s.recalcOrderTotal(orderID); err != nil {
		return nil, err
	}
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM order_items WHERE order_id = $1", orderID).Scan(&count)
	if count == 0 {
		s.db.Exec("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1", orderID)
	}
	return s.GetOrder(orderID)
}

func (s *Store) GetTodayStats() (*models.TodayStats, error) {
	var stats models.TodayStats
	todayExpr := "(NOW() AT TIME ZONE '" + tz + "')::date"
	createdExpr := "(created_at AT TIME ZONE '" + tz + "')::date"
	row := s.db.QueryRow(fmt.Sprintf(`SELECT
		(SELECT COUNT(*) FROM orders WHERE %s = %s) as total_orders,
		(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE %s = %s AND status = 'paid') as total_sales,
		(SELECT COUNT(DISTINCT user_id) FROM orders WHERE %s = %s) as users_today,
		(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE %s = %s AND status NOT IN ('paid', 'cancelled')) as unpaid_total
	`, createdExpr, todayExpr, createdExpr, todayExpr, createdExpr, todayExpr, createdExpr, todayExpr))
	err := row.Scan(&stats.TotalOrders, &stats.TotalSales, &stats.UsersToday, &stats.UnpaidTotal)
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (s *Store) GetItemSalesPie() ([]models.ItemPieDataPoint, error) {
	todayExpr := "(NOW() AT TIME ZONE '" + tz + "')::date"
	createdExpr := "(o.created_at AT TIME ZONE '" + tz + "')::date"
	rows, err := s.db.Query(
		fmt.Sprintf(`SELECT mi.name, SUM(oi.quantity) as qty
		 FROM orders o
		 JOIN order_items oi ON oi.order_id = o.id
		 JOIN menu_items mi ON mi.id = oi.menu_item_id
		 WHERE %s = %s AND o.status = 'paid'
		 GROUP BY mi.name
		 ORDER BY qty DESC`, createdExpr, todayExpr),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	data := make([]models.ItemPieDataPoint, 0)
	for rows.Next() {
		var d models.ItemPieDataPoint
		if err := rows.Scan(&d.Name, &d.Count); err != nil {
			return nil, err
		}
		data = append(data, d)
	}
	return data, nil
}

func (s *Store) GetHourlySalesToday() ([]models.HourlyDataPoint, error) {
	todayExpr := "(NOW() AT TIME ZONE '" + tz + "')::date"
	createdExpr := "(o.created_at AT TIME ZONE '" + tz + "')::date"
	rows, err := s.db.Query(
		fmt.Sprintf(`SELECT EXTRACT(HOUR FROM o.created_at AT TIME ZONE '`+tz+`')::INTEGER as hour,
		        COALESCE(SUM(oi.subtotal), 0) as total
		 FROM orders o
		 JOIN order_items oi ON oi.order_id = o.id
		 WHERE %s = %s AND o.status = 'paid'
		 GROUP BY hour
		 ORDER BY hour`, createdExpr, todayExpr),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	data := make([]models.HourlyDataPoint, 0)
	for rows.Next() {
		var d models.HourlyDataPoint
		if err := rows.Scan(&d.Hour, &d.Total); err != nil {
			return nil, err
		}
		d.ItemsSold = 0
		data = append(data, d)
	}
	return data, nil
}

func (s *Store) GetSetting(key string) (string, error) {
	var value string
	err := s.db.QueryRow("SELECT value FROM settings WHERE key = $1", key).Scan(&value)
	if err != nil {
		return "", err
	}
	return value, nil
}

func (s *Store) GetAllSettings() (map[string]string, error) {
	rows, err := s.db.Query("SELECT key, value FROM settings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		settings[k] = v
	}
	return settings, nil
}

func (s *Store) SetSetting(key, value string) error {
	_, err := s.db.Exec(
		"INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
		key, value,
	)
	return err
}

func (s *Store) EnsureDefaultSettings() error {
	defaults := map[string]string{
		"currency_symbol": "RM",
		"business_name":   "FNB",
		"opening_hour":    "8",
		"closing_hour":    "22",
	}
	for k, v := range defaults {
		_, err := s.GetSetting(k)
		if err != nil {
			s.SetSetting(k, v)
		}
	}
	return nil
}
