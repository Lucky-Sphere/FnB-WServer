package middleware

import (
    "context"
    "net/http"
    "strings"
    "sync"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

const (
    UserContextKey = "user_id"
    RoleContextKey = "user_role"
)

type RateLimiter struct {
    mu       sync.Mutex
    visitors map[int64]time.Time
    window   time.Duration
}

func NewRateLimiter(window time.Duration) *RateLimiter {
    rl := &RateLimiter{
        visitors: make(map[int64]time.Time),
        window:   window,
    }
    go rl.cleanup()
    return rl
}

func (rl *RateLimiter) Allow(userID int64) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    last, ok := rl.visitors[userID]
    now := time.Now()
    if ok && now.Sub(last) < rl.window {
        return false
    }
    rl.visitors[userID] = now
    return true
}

func (rl *RateLimiter) cleanup() {
    for {
        time.Sleep(5 * time.Minute)
        rl.mu.Lock()
        cutoff := time.Now().Add(-rl.window)
        for k, v := range rl.visitors {
            if v.Before(cutoff) {
                delete(rl.visitors, k)
            }
        }
        rl.mu.Unlock()
    }
}

var OrderRateLimiter = NewRateLimiter(10 * time.Second)

func JWTAuth(secret string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
                return
            }

            parts := strings.SplitN(authHeader, " ", 2)
            if len(parts) != 2 || parts[0] != "Bearer" {
                http.Error(w, `{"error":"invalid authorization header"}`, http.StatusUnauthorized)
                return
            }

            token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
                if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                    return nil, jwt.ErrSignatureInvalid
                }
                return []byte(secret), nil
            })
            if err != nil || !token.Valid {
                http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
                return
            }

            claims, ok := token.Claims.(jwt.MapClaims)
            if !ok {
                http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
                return
            }

            userID := int64(claims["user_id"].(float64))
            role := claims["role"].(string)

            ctx := context.WithValue(r.Context(), UserContextKey, userID)
            ctx = context.WithValue(ctx, RoleContextKey, role)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func RateLimit(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        userID, ok := r.Context().Value(UserContextKey).(int64)
        if ok && !OrderRateLimiter.Allow(userID) {
            w.Header().Set("Retry-After", "10")
            http.Error(w, `{"error":"rate limit exceeded, try again later"}`, http.StatusTooManyRequests)
            return
        }
        next(w, r)
    }
}

func AdminOnly(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        role, ok := r.Context().Value(RoleContextKey).(string)
        if !ok || (role != "admin" && role != "cashier") {
            http.Error(w, `{"error":"admin access required"}`, http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func KitchenOnly(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        role, ok := r.Context().Value(RoleContextKey).(string)
        if !ok || (role != "admin" && role != "kitchen") {
            http.Error(w, `{"error":"kitchen access required"}`, http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func CORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}
