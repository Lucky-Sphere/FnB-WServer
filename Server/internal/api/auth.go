package api

import (
    "encoding/json"
    "net/http"
    "time"

    "github.com/fnb/server/internal/models"
    "github.com/fnb/server/internal/store"
    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
    store  *store.Store
    secret string
}

func NewAuthHandler(s *store.Store, secret string) *AuthHandler {
    return &AuthHandler{store: s, secret: secret}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
    var req models.RegisterRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    if req.Username == "" || req.Password == "" || req.Name == "" {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "username, password, and name are required"})
        return
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to hash password"})
        return
    }

    user, err := h.store.CreateUser(req.Username, string(hash), req.Name)
    if err != nil {
        writeJSON(w, http.StatusConflict, models.ErrorResponse{Error: "username already exists"})
        return
    }

    token, err := h.generateToken(user)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to generate token"})
        return
    }

    writeJSON(w, http.StatusCreated, models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
    var req models.LoginRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
        return
    }

    user, err := h.store.GetUserByUsername(req.Username)
    if err != nil {
        writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "invalid username or password"})
        return
    }

    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
        writeJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "invalid username or password"})
        return
    }

    token, err := h.generateToken(user)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "failed to generate token"})
        return
    }

    writeJSON(w, http.StatusOK, models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) generateToken(user *models.User) (string, error) {
    claims := jwt.MapClaims{
        "user_id":  user.ID,
        "username": user.Username,
        "role":     user.Role,
        "exp":      time.Now().Add(24 * time.Hour).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(h.secret))
}
