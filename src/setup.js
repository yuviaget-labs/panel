import { hashPassword } from './auth.js';

export async function ensureSchema(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
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
    )`,
    `CREATE TABLE IF NOT EXISTS panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_code TEXT NOT NULL UNIQUE,
      connect_token TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS api_keys (
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
    )`,
    `CREATE TABLE IF NOT EXISTS key_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_id INTEGER NOT NULL,
      device_uuid TEXT NOT NULL,
      panel_code TEXT NOT NULL DEFAULT '',
      last_seen TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'RESELLER',
      balance INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 30,
      panel_code TEXT NOT NULL DEFAULT '',
      created_by INTEGER DEFAULT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS mod_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_name TEXT NOT NULL,
      setting_value TEXT DEFAULT '',
      panel_code TEXT NOT NULL DEFAULT '',
      UNIQUE(setting_name, panel_code)
    )`,
    `CREATE TABLE IF NOT EXISTS mod_maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_code TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 0,
      reason TEXT DEFAULT 'Server is updating. Please wait...',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      permission TEXT NOT NULL,
      panel_code TEXT NOT NULL DEFAULT '',
      UNIQUE(user_id, permission, panel_code)
    )`,
    `CREATE TABLE IF NOT EXISTS admin_loader (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_code TEXT NOT NULL DEFAULT '',
      loader_name TEXT DEFAULT '',
      loader_url TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_users_panel ON users(panel_code)`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
    `CREATE INDEX IF NOT EXISTS idx_keys_panel ON api_keys(panel_code)`,
    `CREATE INDEX IF NOT EXISTS idx_keys_value ON api_keys(key_value)`,
    `CREATE INDEX IF NOT EXISTS idx_keys_created_by ON api_keys(created_by)`,
    `CREATE INDEX IF NOT EXISTS idx_devices_key ON key_devices(key_id)`,
    `CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code)`,
    `CREATE INDEX IF NOT EXISTS idx_settings_panel ON mod_settings(panel_code)`,
  ];
  for (const sql of tables) {
    await db.prepare(sql).run();
  }
}

export async function ensureDefaultOwner(db) {
  try {
    const hash = await hashPassword('admin123');

    await db.prepare('INSERT OR IGNORE INTO panels (panel_code, is_active) VALUES (?, 1)').bind('YUVI_001').run();

    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind('admin').first();
    if (!existing) {
      await db.prepare(
        "INSERT INTO users (full_name, username, password, role, balance, panel_code) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind('Owner', 'admin', hash, 'OWNER', 999999, 'YUVI_001').run();
    }

    const defaultSettings = [
      ['modname', 'YUVI MOD'], ['mod_status', 'Online'], ['credit', 'Yuvi Panel'],
      ['ESP', 'on'], ['Item', 'on'], ['AIM', 'on'], ['SilentAim', 'on'],
      ['BulletTrack', 'on'], ['Floating', 'on'], ['Memory', 'on'], ['Setting', 'on'],
      ['panel_name', 'YUVI PANEL']
    ];
    for (const [name, value] of defaultSettings) {
      await db.prepare('INSERT OR IGNORE INTO mod_settings (setting_name, setting_value, panel_code) VALUES (?, ?, ?)').bind(name, value, 'YUVI_001').run();
    }

    await db.prepare('INSERT OR IGNORE INTO mod_maintenance (panel_code, is_active, reason) VALUES (?, 0, ?)').bind('YUVI_001', 'Server is updating. Please wait...').run();

    return true;
  } catch (e) {
    return false;
  }
}
