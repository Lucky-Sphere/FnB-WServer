package sse

import (
    "fmt"
    "log"
    "net/http"
    "sync"
)

type Broker struct {
    mu      sync.Mutex
    clients map[chan string]bool
}

func NewBroker() *Broker {
    b := &Broker{clients: make(map[chan string]bool)}
    go b.cleanup()
    return b
}

func (b *Broker) Subscribe() chan string {
    b.mu.Lock()
    defer b.mu.Unlock()
    ch := make(chan string, 10)
    b.clients[ch] = true
    return ch
}

func (b *Broker) Unsubscribe(ch chan string) {
    b.mu.Lock()
    defer b.mu.Unlock()
    if _, ok := b.clients[ch]; ok {
        delete(b.clients, ch)
        close(ch)
    }
}

func (b *Broker) Publish(event string) {
    b.mu.Lock()
    defer b.mu.Unlock()
    for ch := range b.clients {
        select {
        case ch <- event:
        default:
        }
    }
}

func (b *Broker) cleanup() {
    // This is handled by HTTP handler closing the channel on disconnect
}

func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "streaming not supported", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    ch := b.Subscribe()
    defer b.Unsubscribe(ch)

    ctx := r.Context()
    for {
        select {
        case <-ctx.Done():
            return
        case msg, ok := <-ch:
            if !ok {
                return
            }
            fmt.Fprintf(w, "data: %s\n\n", msg)
            flusher.Flush()
        }
    }
}

var DefaultBroker = NewBroker()

func NotifyOrderPlaced(orderID int64) {
    DefaultBroker.Publish(fmt.Sprintf(`{"type":"order_placed","order_id":%d}`, orderID))
    log.Printf("SSE: order_placed %d", orderID)
}

func NotifyOrderUpdated(orderID int64) {
    DefaultBroker.Publish(fmt.Sprintf(`{"type":"order_updated","order_id":%d}`, orderID))
    log.Printf("SSE: order_updated %d", orderID)
}
