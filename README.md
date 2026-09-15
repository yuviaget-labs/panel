# YUVI PANEL - Cloudflare Workers Edition

PHP panel ka complete JavaScript conversion jo Cloudflare Workers + D1 + R2 pe host ho sakta hai.

## Project Structure

```
yuvi-panel/
├── package.json              # NPM config
├── wrangler.toml             # Cloudflare Workers config
├── schema.sql                # D1 database schema
├── src/
│   ├── index.js              # Worker entry point
│   ├── router.js             # Request routing
│   ├── auth.js               # JWT auth + utilities
│   ├── db.js                 # D1 database helpers
│   ├── api/
│   │   ├── auth-api.js       # Login/Register/Logout
│   │   ├── connect.js        # C++ mod connect API
│   │   ├── encrypt.js        # AES encrypted API
│   │   ├── keys.js           # Key generation/management
│   │   ├── users.js          # User management
│   │   └── server-settings.js # Server & settings API
│   ├── pages/
│   │   ├── login.js          # Login page
│   │   ├── register.js       # Register page
│   │   ├── dashboard.js      # Dashboard page
│   │   ├── generate.js       # Key generator page
│   │   ├── keys.js           # Key manager page
│   │   ├── users.js          # User management page
│   │   ├── server.js         # Server control page
│   │   ├── settings.js       # Settings page
│   │   ├── reset-device.js   # Device reset page
│   │   └── join-panel.js     # Join panel page
│   ├── templates/
│   │   └── layout.js         # Main layout template
│   └── styles/
│       └── main.css          # Claymorphic UI styles
```

## Setup Guide

### 1. Prerequisites
- Node.js installed
- Cloudflare account (free tier works)
- Wrangler CLI installed globally

### 2. Install Dependencies
```bash
cd yuvi-panel
npm install
```

### 3. Create D1 Database
```bash
wrangler d1 create yuvi-panel-db
```
Copy the `database_id` from output and paste it in `wrangler.toml`.

### 4. Initialize Database
```bash
wrangler d1 execute yuvi-panel-db --file=schema.sql
```

### 5. Create R2 Bucket (optional, for file storage)
```bash
wrangler r2 bucket create yuvi-panel-r2
```

### 6. Update Configuration
Edit `wrangler.toml`:
- Set your `database_id`
- Set a strong `JWT_SECRET` in `[vars]`
- Set your domain if using custom domain

### 7. Create First Owner Account
After deployment, you need to manually insert an owner account into D1:
```bash
wrangler d1 execute yuvi-panel-db --command="INSERT INTO users (full_name, username, password, role, balance, panel_code) VALUES ('Owner', 'admin', 'YOUR_HASHED_PASSWORD', 'OWNER', 999999, 'YUVI_001')"
```

Password hash can be generated using the SHA-256 hash function used in the code.

### 8. Deploy
```bash
wrangler deploy
```

### 9. Create First Panel
After logging in as OWNER (user_id=1), you can create panels from the "New Tenant" section.

## Features

- **Mobile Responsive** - Same glassmorphism/claymorphic UI as original
- **Role-Based Access** - OWNER, ADMIN, RESELLER with proper permissions
- **Key Generation** - Single and bulk with live price calculator
- **Device Locking** - SHA-256 based device fingerprinting
- **API Endpoints** - Both normal and AES-256-CBC encrypted
- **Server Control** - Remote mod configuration, maintenance mode
- **User Management** - Balance management, block/unblock
- **JWT Authentication** - HttpOnly cookies, 7-day expiry

## API Endpoints

### Connect API (for C++ mods)
```
POST /connect/{PANEL_CODE}
Body: game=PUBG&user_key=KEY&serial=DEVICE_UUID
```

### Encrypted API
```
POST /encrypt/{PANEL_CODE}
Body: game=PUBG&user_key=KEY&serial=DEVICE_UUID
Response: { status: true, payload: "base64_aes_encrypted_data" }
```

## Differences from PHP Version

| Feature | PHP Version | JS (Workers) Version |
|---------|-------------|---------------------|
| Database | MySQL | Cloudflare D1 (SQLite) |
| Sessions | PHP Session | JWT + HttpOnly Cookie |
| Encryption | OpenSSL | Web Crypto API |
| Hosting | cPanel/Apache | Cloudflare Workers |
| File Storage | Local disk | Cloudflare R2 |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT signing (change in production!) |
| `DOMAIN` | Your workers.dev domain (for API URLs) |
