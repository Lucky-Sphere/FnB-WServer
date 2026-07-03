# FnB Ordering System

A food & beverage ordering system with a Go API backend, React admin panel, React Native customer app, and kitchen display system.

## Project Structure

```
├── Server/        # Go API (chi router + embedded PostgreSQL)
├── Admin/         # React SPA (Vite) - admin management
├── Cashier/       # React SPA (Vite) - cashier operations
├── Client/        # React Native (Expo) - customer mobile app
└── Kitchen/       # React Native (Expo) - kitchen display
```

## Prerequisites

- **Go** 1.26+ (for Server)
- **Node.js** 20+ (for Admin, Cashier, Client, Kitchen)
- **PowerShell** 7+ (for startup scripts on Windows)

## Getting Started

### 1. Server

```powershell
cd Server
go run ./cmd/server
```

- Starts on **HTTP :20080** and **HTTPS :20443**
- Auto-downloads and starts embedded PostgreSQL on first run (~60MB)
- Login: `admin` / `admin123`

Set `DATABASE_URL` env var to use an external PostgreSQL instead of embedded.

### 2. Admin Panel

```powershell
cd Admin
npm install
npm run dev
```

- Runs on **:5173**, proxied to **:8080**
- Click "Seed Sample Data" after logging in to populate menu items

### 3. Cashier

```powershell
cd Cashier
npm install
npm run dev
```

### 4. Customer Mobile App (Client)

```powershell
cd Client
npm install
npx expo start
```

- Scan QR code with Expo Go app on your phone, or press `a` for Android emulator / `i` for iOS simulator

### 5. Kitchen Display

```powershell
cd Kitchen
npm install
npx expo start
```

## One-Click Start

Run all services from the root folder:

```powershell
.\start-all.bat
```

## API Endpoints

### Public
- `POST /api/auth/register` - Register customer
- `POST /api/auth/login` - Login
- `GET /api/menu` - Available menu items
- `GET /api/menu/{id}` - Menu item detail
- `GET /api/categories` - Categories
- `GET /api/events` - Server-Sent Events (real-time updates)

### Customer (auth required)
- `POST /api/orders` - Place order
- `GET /api/orders` - My orders
- `GET /api/orders/{id}` - Order detail

### Admin (admin auth required)
- CRUD `/api/admin/menu` - Menu management
- CRUD `/api/admin/categories` - Category management
- CRUD `/api/admin/orders` - Order management
- `GET /api/admin/users` - User management
- `POST /api/admin/seed` - Seed sample data
- `GET /api/admin/sales` - Sales reports
- `GET /api/admin/stats/today` - Today's statistics

### Kitchen (kitchen auth required)
- `GET /api/kitchen/orders` - All orders
- `PUT /api/kitchen/orders/{id}/status` - Update order status
- `PUT /api/kitchen/orders/{id}/items/{itemId}` - Update item status
