export async function fetchAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length === 1) stmt.bind(params[0]);
  else if (params.length === 2) stmt.bind(params[0], params[1]);
  else if (params.length === 3) stmt.bind(params[0], params[1], params[2]);
  else if (params.length === 4) stmt.bind(params[0], params[1], params[2], params[3]);
  else if (params.length === 5) stmt.bind(params[0], params[1], params[2], params[3], params[4]);
  else if (params.length === 6) stmt.bind(params[0], params[1], params[2], params[3], params[4], params[5]);
  else if (params.length > 6) stmt.bind(...params);
  const result = await stmt.all();
  return result.results || [];
}

export async function fetchOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length === 1) stmt.bind(params[0]);
  else if (params.length === 2) stmt.bind(params[0], params[1]);
  else if (params.length === 3) stmt.bind(params[0], params[1], params[2]);
  else if (params.length === 4) stmt.bind(params[0], params[1], params[2], params[3]);
  else if (params.length === 5) stmt.bind(params[0], params[1], params[2], params[3], params[4]);
  else if (params.length === 6) stmt.bind(params[0], params[1], params[2], params[3], params[4], params[5]);
  else if (params.length > 6) stmt.bind(...params);
  return await stmt.first();
}

export async function execute(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length === 1) stmt.bind(params[0]);
  else if (params.length === 2) stmt.bind(params[0], params[1]);
  else if (params.length === 3) stmt.bind(params[0], params[1], params[2]);
  else if (params.length === 4) stmt.bind(params[0], params[1], params[2], params[3]);
  else if (params.length === 5) stmt.bind(params[0], params[1], params[2], params[3], params[4]);
  else if (params.length === 6) stmt.bind(params[0], params[1], params[2], params[3], params[4], params[5]);
  else if (params.length > 6) stmt.bind(...params);
  return await stmt.run();
}

export async function executeBatch(db, statements) {
  return await db.batch(statements);
}

export async function getModSettings(db, panelCode) {
  const rows = await fetchAll(db, 'SELECT setting_name, setting_value FROM mod_settings WHERE panel_code = ?', [panelCode]);
  const settings = {};
  for (const row of rows) {
    settings[row.setting_name] = row.setting_value;
  }
  return settings;
}

export async function setModSetting(db, panelCode, name, value) {
  await execute(db,
    'INSERT INTO mod_settings (setting_name, setting_value, panel_code) VALUES (?, ?, ?) ON CONFLICT(setting_name, panel_code) DO UPDATE SET setting_value = ?',
    [name, value, panelCode, value]
  );
}
