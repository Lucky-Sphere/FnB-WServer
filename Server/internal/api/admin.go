package api

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "strconv"
    "strings"
    "time"

    "github.com/fnb/server/internal/models"
    "github.com/fnb/server/internal/sse"
    "github.com/fnb/server/internal/store"
    "golang.org/x/crypto/bcrypt"
)

type AdminHandler struct {
    store *store.Store
}

func NewAdminHandler(s *store.Store) *AdminHandler {
    return &AdminHandler{store: s}
}

func (h *AdminHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
    startDate := r.URL.Query().Get("start_date")
    endDate := r.URL.Query().Get("end_date")
    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
    if page < 1 {
        page = 1
    }
    if perPage < 1 || perPage > 100 {
        perPage = 50
    }
    orders, total, err := h.store.ListAllOrders(startDate, endDate, page, perPage)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to list orders"})
        return
    }
    writeJSON(w, http.StatusOK, models.PaginatedOrders{
        Orders:  orders,
        Total:   total,
        Page:    page,
        PerPage: perPage,
    })
}

func (h *AdminHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    order, err := h.store.GetOrder(id)
    if err != nil {
        writeJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "order not found"})
        return
    }

    writeJSON(w, http.StatusOK, order)
}

func (h *AdminHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    var req models.UpdateOrderStatusRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    validStatuses := map[string]bool{"pending": true, "confirmed": true, "preparing": true, "ready": true, "paid": true, "cancelled": true}
    if !validStatuses[req.Status] {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid status"})
        return
    }

    order, err := h.store.UpdateOrderStatus(id, req.Status)
    if err != nil {
        writeJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "order not found"})
        return
    }

    sse.NotifyOrderUpdated(id)
    writeJSON(w, http.StatusOK, order)
}

func (h *AdminHandler) UpdateOrderItem(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    itemIDStr := r.PathValue("itemId")
    orderID, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid order id"})
        return
    }
    itemID, err := strconv.ParseInt(itemIDStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid item id"})
        return
    }
    var req struct {
        Quantity *int  `json:"quantity"`
        IsDone   *bool `json:"is_done"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }
    if req.Quantity != nil && *req.Quantity < 1 {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "quantity must be at least 1"})
        return
    }
    order, err := h.store.UpdateOrderItem(orderID, itemID, req.Quantity, req.IsDone)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
        return
    }
    sse.NotifyOrderUpdated(orderID)
    writeJSON(w, http.StatusOK, order)
}

func (h *AdminHandler) DeleteOrderItem(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    itemIDStr := r.PathValue("itemId")
    orderID, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid order id"})
        return
    }
    itemID, err := strconv.ParseInt(itemIDStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid item id"})
        return
    }
    order, err := h.store.DeleteOrderItem(orderID, itemID)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
        return
    }
    writeJSON(w, http.StatusOK, order)
}

func (h *AdminHandler) GetTodayStats(w http.ResponseWriter, r *http.Request) {
    stats, err := h.store.GetTodayStats()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get stats"})
        return
    }
    writeJSON(w, http.StatusOK, stats)
}

func (h *AdminHandler) GetItemSalesPie(w http.ResponseWriter, r *http.Request) {
    data, err := h.store.GetItemSalesPie()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get item sales"})
        return
    }
    writeJSON(w, http.StatusOK, data)
}

func (h *AdminHandler) GetHourlySalesToday(w http.ResponseWriter, r *http.Request) {
    data, err := h.store.GetHourlySalesToday()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get hourly sales"})
        return
    }
    writeJSON(w, http.StatusOK, data)
}

func (h *AdminHandler) ListMenuItems(w http.ResponseWriter, r *http.Request) {
    items, err := h.store.ListMenuItems(true)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to list menu items"})
        return
    }
    writeJSON(w, http.StatusOK, items)
}

func (h *AdminHandler) CreateMenuItem(w http.ResponseWriter, r *http.Request) {
    var req models.CreateMenuItemRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    item, err := h.store.CreateMenuItem(req.CategoryID, req.Name, req.Description, req.Price, req.ImageURL, req.IsAvailable)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
        return
    }

    writeJSON(w, http.StatusCreated, item)
}

func (h *AdminHandler) UpdateMenuItem(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    var req models.CreateMenuItemRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    item, err := h.store.UpdateMenuItem(id, req)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
        return
    }

    writeJSON(w, http.StatusOK, item)
}

func (h *AdminHandler) DeleteMenuItem(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    if err := h.store.DeleteMenuItem(id); err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to delete"})
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
    categories, err := h.store.ListCategories()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to list categories"})
        return
    }
    writeJSON(w, http.StatusOK, categories)
}

func (h *AdminHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
    var req models.CreateCategoryRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    category, err := h.store.CreateCategory(req.Name, req.SortOrder)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
        return
    }

    writeJSON(w, http.StatusCreated, category)
}

func (h *AdminHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    var req models.CreateCategoryRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    category, err := h.store.UpdateCategory(id, req.Name, req.SortOrder)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
        return
    }

    writeJSON(w, http.StatusOK, category)
}

func (h *AdminHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    if err := h.store.DeleteCategory(id); err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to delete"})
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
    users, err := h.store.ListUsers()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to list users"})
        return
    }
    writeJSON(w, http.StatusOK, users)
}

func (h *AdminHandler) GetHourlySales(w http.ResponseWriter, r *http.Request) {
    days := 7
    if d := r.URL.Query().Get("days"); d != "" {
        if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 && parsed <= 365 {
            days = parsed
        }
    }
    data, err := h.store.GetHourlySales(days)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get hourly sales"})
        return
    }
    writeJSON(w, http.StatusOK, data)
}

func (h *AdminHandler) GetSales(w http.ResponseWriter, r *http.Request) {
    days := 7
    if d := r.URL.Query().Get("days"); d != "" {
        if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 && parsed <= 365 {
            days = parsed
        }
    }
    data, err := h.store.GetSalesByDay(days)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get sales"})
        return
    }
    writeJSON(w, http.StatusOK, data)
}

func (h *AdminHandler) SeedData(w http.ResponseWriter, r *http.Request) {
    categories := []struct {
        name string
        sort int
    }{
        {"Appetizers", 1},
        {"Main Course", 2},
        {"Desserts", 3},
        {"Beverages", 4},
    }

    for _, c := range categories {
        h.store.CreateCategory(c.name, c.sort)
    }

    items := []struct {
        category   string
        name       string
        desc       string
        price      float64
    }{
        {"Appetizers", "Spring Rolls", "Crispy spring rolls with dipping sauce", 8.50},
        {"Appetizers", "Bruschetta", "Toasted bread with tomatoes and basil", 9.00},
        {"Main Course", "Grilled Salmon", "Atlantic salmon with lemon butter sauce", 24.00},
        {"Main Course", "Beef Steak", "300g ribeye with mashed potatoes", 32.00},
        {"Main Course", "Chicken Alfredo", "Fettuccine in creamy alfredo sauce", 18.00},
        {"Main Course", "Margherita Pizza", "Classic tomato, mozzarella, basil", 16.00},
        {"Desserts", "Tiramisu", "Classic Italian coffee dessert", 10.00},
        {"Desserts", "Chocolate Lava Cake", "Warm chocolate cake with ice cream", 11.00},
        {"Beverages", "Fresh Lemonade", "House-made lemonade", 5.00},
        {"Beverages", "Iced Coffee", "Cold brew with milk", 6.00},
        {"Beverages", "Mineral Water", "Sparkling or still", 3.00},
    }

    cats, _ := h.store.ListCategories()
    catMap := make(map[string]int64)
    for _, c := range cats {
        catMap[c.Name] = c.ID
    }

    for _, item := range items {
        catID := catMap[item.category]
        h.store.CreateMenuItem(catID, item.name, item.desc, item.price, "", true)
    }

    hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
    h.store.CreateAdminUser("admin", string(hash), "Admin")

    writeJSON(w, http.StatusOK, map[string]string{"message": "sample data seeded successfully"})
}

func (h *AdminHandler) EnsureAdmin() error {
    _, err := h.store.GetUserByUsername("admin")
    if err == nil {
        return nil
    }

    hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
    if err != nil {
        return err
    }

    _, err = h.store.CreateAdminUser("admin", string(hash), "Admin")
    return err
}

func (h *AdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var body struct {
        Username string `json:"username"`
        Password string `json:"password"`
        Name     string `json:"name"`
        Role     string `json:"role"`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" || body.Password == "" || body.Name == "" {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "username, password, and name are required"})
        return
    }
    role := "customer"
    switch body.Role {
    case "admin", "cashier", "kitchen":
        role = body.Role
    }
    hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to hash password"})
        return
    }
    user, err := h.store.CreateAdminUser(body.Username, string(hash), body.Name, role)
    if err != nil {
        writeJSON(w, http.StatusConflict, models.ErrorResponse{Error: "username already exists"})
        return
    }
    writeJSON(w, http.StatusCreated, user)
}

func (h *AdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    var body struct {
        Username string `json:"username"`
        Name     string `json:"name"`
        Password string `json:"password"`
        Role     string `json:"role"`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    if body.Username != "" {
        if err := h.store.UpdateUserUsername(id, body.Username); err != nil {
            if strings.Contains(err.Error(), "UNIQUE") {
                writeJSON(w, http.StatusConflict, models.ErrorResponse{Error: "username already exists"})
                return
            }
            writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update username"})
            return
        }
    }
    if body.Name != "" {
        if err := h.store.UpdateUserName(id, body.Name); err != nil {
            writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update name"})
            return
        }
    }
    if body.Password != "" {
        hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
        if err != nil {
            writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to hash password"})
            return
        }
        if err := h.store.UpdateUserPassword(id, string(hash)); err != nil {
            writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update password"})
            return
        }
    }
    if body.Role != "" && (body.Role == "admin" || body.Role == "customer" || body.Role == "cashier" || body.Role == "kitchen") {
        if err := h.store.UpdateUserRole(id, body.Role); err != nil {
            writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update role"})
            return
        }
    }

    user, err := h.store.GetUser(id)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get user"})
        return
    }
    writeJSON(w, http.StatusOK, user)
}

type chatRequest struct {
    Message string `json:"message"`
}

type geminiResponse struct {
    Candidates []struct {
        Content struct {
            Parts []struct {
                Text string `json:"text"`
            } `json:"parts"`
        } `json:"content"`
    } `json:"candidates"`
}

func (h *AdminHandler) Chat(w http.ResponseWriter, r *http.Request) {
    var req chatRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    apiKey, err := h.store.GetSetting("ai_api_key")
    if err != nil || apiKey == "" {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "AI API key not configured. Set it in Settings."})
        return
    }

    menuItems, _ := h.store.ListMenuItems(true)
    categories, _ := h.store.ListCategories()
    orders, _, _ := h.store.ListAllOrders("", "", 1, 10)

    var menuList, catList, orderList strings.Builder
    for _, m := range menuItems {
        menuList.WriteString(fmt.Sprintf("- %s (RM%.2f)\n", m.Name, m.Price))
    }
    for _, c := range categories {
        catList.WriteString(fmt.Sprintf("- %s\n", c.Name))
    }
    for _, o := range orders {
        orderList.WriteString(fmt.Sprintf("- Order %s: Table %d, Status: %s, Total: RM%.2f\n",
            o.OrderID, o.TableNumber, o.Status, o.TotalAmount))
    }

    systemPrompt := fmt.Sprintf(`You are an AI assistant for a restaurant F&B ordering system called "FNB". You help restaurant staff with questions about menu, orders, and operations.

Current restaurant data:

MENU ITEMS:
%s

CATEGORIES:
%s

RECENT ORDERS:
%s

Answer concisely and helpfully based on this data.`, menuList.String(), catList.String(), orderList.String())

    geminiReq := map[string]interface{}{
        "contents": []map[string]interface{}{
            {
                "role": "user",
                "parts": []map[string]string{
                    {"text": systemPrompt + "\n\nUser question: " + req.Message},
                },
            },
        },
        "generationConfig": map[string]interface{}{
            "temperature": 0.3,
            "maxOutputTokens": 1024,
        },
    }

    url := "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=" + apiKey
    body, _ := json.Marshal(geminiReq)

    var (
        resp     *http.Response
        respBody []byte
        lastErr  string
    )
    for attempt := 0; attempt < 3; attempt++ {
        if attempt > 0 {
            time.Sleep(time.Duration(attempt*2) * time.Second)
        }
        resp, err = http.Post(url, "application/json", bytes.NewReader(body))
        if err != nil {
            lastErr = err.Error()
            continue
        }
        respBody, _ = io.ReadAll(resp.Body)
        resp.Body.Close()
        if resp.StatusCode == 500 {
            lastErr = fmt.Sprintf("AI API error (%d): %s", resp.StatusCode, string(respBody))
            continue
        }
        break
    }
    if resp == nil || resp.StatusCode != 200 {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: lastErr})
        return
    }

    var geminiResp geminiResponse
    json.Unmarshal(respBody, &geminiResp)
    if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
        writeJSON(w, http.StatusOK, map[string]string{"reply": "No response from AI."})
        return
    }

    writeJSON(w, http.StatusOK, map[string]string{"reply": geminiResp.Candidates[0].Content.Parts[0].Text})
}
