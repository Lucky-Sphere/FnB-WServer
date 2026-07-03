package api

import (
    "encoding/json"
    "net/http"

    "github.com/fnb/server/internal/models"
    "github.com/fnb/server/internal/store"
)

type SettingsHandler struct {
    store *store.Store
}

func NewSettingsHandler(s *store.Store) *SettingsHandler {
    return &SettingsHandler{store: s}
}

func (h *SettingsHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
    settings, err := h.store.GetAllSettings()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get settings"})
        return
    }
    writeJSON(w, http.StatusOK, settings)
}

func (h *SettingsHandler) UpdateSetting(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Key   string `json:"key"`
        Value string `json:"value"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }
    if req.Key == "" {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "key is required"})
        return
    }

    if err := h.store.SetSetting(req.Key, req.Value); err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update setting"})
        return
    }

    writeJSON(w, http.StatusOK, map[string]string{"key": req.Key, "value": req.Value})
}
