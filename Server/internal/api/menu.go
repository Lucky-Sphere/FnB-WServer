package api

import (
    "encoding/json"
    "net/http"
    "strconv"

	"github.com/fnb/server/internal/models"
	"github.com/fnb/server/internal/sse"
	"github.com/fnb/server/internal/store"
)

type MenuHandler struct {
    store *store.Store
}

func NewMenuHandler(s *store.Store) *MenuHandler {
    return &MenuHandler{store: s}
}

func (h *MenuHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
    categories, err := h.store.ListCategories()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to list categories"})
        return
    }
    writeJSON(w, http.StatusOK, categories)
}

func (h *MenuHandler) ListMenuItems(w http.ResponseWriter, r *http.Request) {
    items, err := h.store.ListMenuItems(false)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to list menu items"})
        return
    }
    writeJSON(w, http.StatusOK, items)
}

func (h *MenuHandler) GetMenuItem(w http.ResponseWriter, r *http.Request) {
    idStr := r.PathValue("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid id"})
        return
    }

    item, err := h.store.GetMenuItem(id)
    if err != nil {
        writeJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "menu item not found"})
        return
    }

    writeJSON(w, http.StatusOK, item)
}

func (h *MenuHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int64)

	var req models.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	if len(req.Items) == 0 {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "order must have at least one item"})
		return
	}

	order, err := h.store.CreateOrder(userID, req.TableNumber, req.Items)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	sse.NotifyOrderPlaced(order.ID)
	writeJSON(w, http.StatusCreated, order)
}

func (h *MenuHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value("user_id").(int64)
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

    orders, total, err := h.store.ListUserOrders(userID, startDate, endDate, page, perPage)
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

func (h *MenuHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value("user_id").(int64)
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

    if order.UserID != userID {
        writeJSON(w, http.StatusForbidden, models.ErrorResponse{Error: "access denied"})
        return
    }

    writeJSON(w, http.StatusOK, order)
}
