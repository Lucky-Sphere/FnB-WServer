# FNB Ordering System

## Project Structure
- **Server/** - Go API (chi router + embedded PostgreSQL)
- **Client/** - React Native Expo mobile app (Expo Router)
- **Admin/** - React SPA (Vite) for admin management

## How to Run

### Server
```powershell
cd Server
$env:Path = "C:\Go\bin;$env:Path"
go run ./cmd/server
```
Server starts on HTTP :20080 and HTTPS :20443 (auto-generated self-signed cert for dev).
Uses **embedded PostgreSQL** (auto-downloads and starts in-process).
Data stored in `Server/data/pg/data`. PostgreSQL binaries cached in `Server/data/pg/bin`.

**First run**: downloads PostgreSQL (~60MB), may take a minute.
**Copy to new server**: copy the `Server/` folder and run — PG binaries auto-download on first run.

Set `DATABASE_URL` env var to use an external PostgreSQL instead of embedded.
Set env vars for production HTTPS: `TLS_CERT_FILE`, `TLS_KEY_FILE`, `TLS_PORT`.

### Admin
```powershell
cd Admin
npm run dev
```
Admin runs on :5173, proxied to :8080.

### Client
```powershell
cd Client
npx expo start
```

## Seed Data
1. Start the Go server
2. Open Admin app → click "Seed Sample Data" button
3. Login with `admin` / `admin123`

## API Endpoints

### Public
- `POST /api/auth/register` - Register customer
- `POST /api/auth/login` - Login
- `GET /api/menu` - Available menu items
- `GET /api/menu/{id}` - Menu item detail
- `GET /api/categories` - Categories

### Customer (auth required)
- `POST /api/orders` - Place order
- `GET /api/orders` - My orders
- `GET /api/orders/{id}` - Order detail

### Admin (admin auth required)
- `GET /api/admin/orders` - All orders
- `GET /api/admin/orders/{id}` - Order detail
- `PUT /api/admin/orders/{id}/status` - Update status
- CRUD `/api/admin/menu` - Menu management
- CRUD `/api/admin/categories` - Category management
- `GET /api/admin/users` - User list
- `POST /api/admin/seed` - Seed sample data

## Database
Embedded PostgreSQL (auto-downloads and starts in-process).
Data in `Server/data/pg/data`, binaries cached in `Server/data/pg/bin`.

Tables: users, categories, menu_items, orders, order_items
