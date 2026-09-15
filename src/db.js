export async function fetchAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(...params);
  const result = await stmt.all();
  return result.results || [];
}

export async function fetchOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(...params);
  return await stmt.first();
}

export async function execute(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(...params);
  return await stmt.run();
}

export async function executeBatch(db, statements) {
  return await db.batch(statements);
}

// Helper to get mod settings for a panel
export async function getModSettings(db, panelCode) {
  const rows = await fetchAll(db, 'SELECT setting_name, setting_value FROM mod_settings WHERE panel_code = ?', [panelCode]);
  const settings = {};
  for (const row of rows) {
    settings[row.setting_name] = row.setting_value;
  }
  return settings;
}

// Helper to set mod setting
export async function setModSetting(db, panelCode, name, value) {
  await execute(db,
    'INSERT INTO mod_settings (setting_name, setting_value, panel_code) VALUES (?, ?, ?) ON CONFLICT(setting_name, panel_code) DO UPDATE SET setting_value = ?',
    [name, value, panelCode, value]
  );
}
