package models

import "time"

type User struct {
    ID           int64     `json:"id"`
    Username     string    `json:"username"`
    PasswordHash string    `json:"-"`
    Name         string    `json:"name"`
    Role         string    `json:"role"`
    CreatedAt    time.Time `json:"created_at"`
}

type Category struct {
    ID        int64     `json:"id"`
    Name      string    `json:"name"`
    SortOrder int       `json:"sort_order"`
    CreatedAt time.Time `json:"created_at"`
}

type MenuItem struct {
    ID          int64     `json:"id"`
    CategoryID  int64     `json:"category_id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    Price       float64   `json:"price"`
    ImageURL    string    `json:"image_url"`
    IsAvailable bool      `json:"is_available"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type Order struct {
	ID          int64       `json:"id"`
	OrderID     string      `json:"order_id"`
	UserID      int64       `json:"user_id"`
	TableNumber int         `json:"table_number"`
	Status      string      `json:"status"`
	TotalAmount float64     `json:"total_amount"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	Items       []OrderItem `json:"items,omitempty"`
}

type OrderItem struct {
	ID         int64   `json:"id"`
	OrderID    int64   `json:"order_id"`
	MenuItemID int64   `json:"menu_item_id"`
	Name       string  `json:"name"`
	Quantity   int     `json:"quantity"`
	UnitPrice  float64 `json:"unit_price"`
	Subtotal   float64 `json:"subtotal"`
	IsDone     bool    `json:"is_done"`
}

type RegisterRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
    Name     string `json:"name"`
}

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type AuthResponse struct {
    Token string `json:"token"`
    User  User   `json:"user"`
}

type CreateOrderRequest struct {
	Items       []CreateOrderItem `json:"items"`
	TableNumber int               `json:"table_number"`
}

type CreateOrderItem struct {
    MenuItemID int64 `json:"menu_item_id"`
    Quantity   int   `json:"quantity"`
}

type CreateCategoryRequest struct {
    Name      string `json:"name"`
    SortOrder int    `json:"sort_order"`
}

type CreateMenuItemRequest struct {
    CategoryID  int64   `json:"category_id"`
    Name        string  `json:"name"`
    Description string  `json:"description"`
    Price       float64 `json:"price"`
    ImageURL    string  `json:"image_url"`
    IsAvailable bool    `json:"is_available"`
}

type UpdateOrderStatusRequest struct {
    Status string `json:"status"`
}

type SalesDataPoint struct {
    Date  string  `json:"date"`
    Total float64 `json:"total"`
    Count int     `json:"count"`
}

type HourlyDataPoint struct {
    Hour        int     `json:"hour"`
    ItemsSold   int     `json:"items_sold"`
    Total       float64 `json:"total"`
    UnpaidTotal float64 `json:"unpaid_total"`
}

type TodayStats struct {
    TotalOrders int     `json:"total_orders"`
    TotalSales  float64 `json:"total_sales"`
    UsersToday  int     `json:"users_today"`
    UnpaidTotal float64 `json:"unpaid_total"`
}

type ItemPieDataPoint struct {
    Name  string `json:"name"`
    Count int    `json:"count"`
}

type PaginatedOrders struct {
    Orders []Order `json:"orders"`
    Total  int     `json:"total"`
    Page   int     `json:"page"`
    PerPage int    `json:"per_page"`
}

type ErrorResponse struct {
    Error string `json:"error"`
}
