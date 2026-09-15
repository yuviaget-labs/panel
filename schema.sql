-- =============================================
-- YUVI PANEL - D1 Database Schema
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'RESELLER',
    balance INTEGER NOT NULL DEFAULT 0,
    validity TEXT DEFAULT NULL,
    panel_code TEXT NOT NULL DEFAULT '',
    invited_by INTEGER DEFAULT NULL,
    device_fingerprint TEXT DEFAULT NULL,
    last_login TEXT DEFAULT NULL,
    last_reset TEXT DEFAULT NULL,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Panels table
CREATE TABLE IF NOT EXISTS panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_code TEXT NOT NULL UNIQUE,
    connect_token TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_value TEXT NOT NULL UNIQUE,
    duration TEXT NOT NULL DEFAULT '1D',
    device_limit INTEGER NOT NULL DEFAULT 1,
    panel_code TEXT NOT NULL DEFAULT '',
    created_by INTEGER DEFAULT NULL,
    uses INTEGER NOT NULL DEFAULT 0,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Key Devices table
CREATE TABLE IF NOT EXISTS key_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id INTEGER NOT NULL,
    device_uuid TEXT NOT NULL,
    panel_code TEXT NOT NULL DEFAULT '',
    last_seen TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'RESELLER',
    balance INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 30,
    panel_code TEXT NOT NULL DEFAULT '',
    created_by INTEGER DEFAULT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Mod Settings table
CREATE TABLE IF NOT EXISTS mod_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_name TEXT NOT NULL,
    setting_value TEXT DEFAULT '',
    panel_code TEXT NOT NULL DEFAULT '',
    UNIQUE(setting_name, panel_code)
);

-- Mod Maintenance table
CREATE TABLE IF NOT EXISTS mod_maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_code TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 0,
    reason TEXT DEFAULT 'Server is updating. Please wait...',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission TEXT NOT NULL,
    panel_code TEXT NOT NULL DEFAULT '',
    UNIQUE(user_id, permission, panel_code)
);

-- Admin Loader table
CREATE TABLE IF NOT EXISTS admin_loader (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_code TEXT NOT NULL DEFAULT '',
    loader_name TEXT DEFAULT '',
    loader_url TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_panel ON users(panel_code);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_keys_panel ON api_keys(panel_code);
CREATE INDEX IF NOT EXISTS idx_keys_value ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_devices_key ON key_devices(key_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE INDEX IF NOT EXISTS idx_settings_panel ON mod_settings(panel_code);
