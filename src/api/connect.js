import { cleanInput } from '../auth.js';
import { fetchOne, fetchAll, execute } from '../db.js';

function apiResponse(status, reason = null, data = null, code = 200) {
  const out = { status };
  if (status && data) out.data = data;
  if (!status && reason) out.reason = reason;
  return new Response(JSON.stringify(out), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleConnect(request, env, panelCode) {
  try {
    panelCode = cleanInput(panelCode, 20);
    if (!panelCode || !/^[A-Za-z0-9_-]{1,20}$/.test(panelCode)) {
      return apiResponse(false, 'PANEL CODE MISSING', null, 400);
    }

    const formData = await request.formData();
    const game = cleanInput(formData.get('game') || '', 50);
    const userKey = cleanInput(formData.get('user_key') || '', 50);
    const serial = cleanInput(formData.get('serial') || '', 100);

    if (!game || !userKey || !serial) {
      return apiResponse(false, 'INVALID PARAMETER', null, 400);
    }

    if (game !== 'PUBG') {
      return apiResponse(false, 'USER OR GAME NOT REGISTERED', null, 403);
    }

    // Check panel exists and active
    const panel = await fetchOne(env.DB, 'SELECT panel_code, is_active FROM panels WHERE panel_code = ?', [panelCode]);
    if (!panel || panel.is_active !== 1) {
      return apiResponse(false, 'USER OR GAME NOT REGISTERED', null, 403);
    }

    // Check maintenance
    const maintenance = await fetchOne(env.DB, 'SELECT is_active, reason FROM mod_maintenance WHERE panel_code = ?', [panelCode]);
    if (maintenance && maintenance.is_active === 1) {
      return apiResponse(false, maintenance.reason || 'SERVER UNDER MAINTENANCE', null, 503);
    }

    // Find key
    const keyData = await fetchOne(env.DB,
      'SELECT id, key_value, duration, device_limit, uses, expires_at, panel_code, is_active, is_blocked, created_by FROM api_keys WHERE key_value = ? AND panel_code = ? AND is_active = 1',
      [userKey, panelCode]
    );

    if (!keyData) {
      return apiResponse(false, 'USER OR GAME NOT REGISTERED', null, 403);
    }

    if (keyData.is_blocked === 1) {
      return apiResponse(false, 'USER BLOCKED', null, 403);
    }

    if (keyData.expires_at && new Date(keyData.expires_at).getTime() < Date.now()) {
      return apiResponse(false, 'EXPIRED KEY', null, 403);
    }

    // Check device
    const devices = await fetchAll(env.DB, 'SELECT device_uuid FROM key_devices WHERE key_id = ?', [keyData.id]);
    const deviceUuids = devices.map(d => d.device_uuid);
    const deviceExists = deviceUuids.includes(serial);

    if (deviceExists) {
      await execute(env.DB, 'UPDATE key_devices SET last_seen = datetime(\'now\') WHERE key_id = ? AND device_uuid = ?', [keyData.id, serial]);
    } else {
      if (deviceUuids.length >= keyData.device_limit) {
        return apiResponse(false, 'MAX DEVICE REACHED', null, 403);
      }
      await execute(env.DB, 'INSERT INTO key_devices (key_id, device_uuid, panel_code) VALUES (?, ?, ?)', [keyData.id, serial, panelCode]);
    }

    // Handle expiry
    let expiresAt = keyData.expires_at;
    if (!expiresAt) {
      const duration = (keyData.duration || '').toUpperCase();
      const match = duration.match(/^(\d+)(D|H)$/);
      if (!match) {
        return apiResponse(false, 'INVALID KEY DURATION', null, 500);
      }
      const amount = parseInt(match[1]);
      const unit = match[2];
      const now = new Date();
      if (unit === 'D') now.setDate(now.getDate() + amount);
      else now.setHours(now.getHours() + amount);
      expiresAt = now.toISOString().replace('T', ' ').slice(0, 19);
      await execute(env.DB, 'UPDATE api_keys SET expires_at = ?, uses = uses + 1 WHERE id = ?', [expiresAt, keyData.id]);
    } else {
      await execute(env.DB, 'UPDATE api_keys SET uses = uses + 1 WHERE id = ?', [keyData.id]);
    }

    // Get mod settings
    const settingsRows = await fetchAll(env.DB, 'SELECT setting_name, setting_value FROM mod_settings WHERE panel_code = ?', [panelCode]);
    const settings = {};
    settingsRows.forEach(r => settings[r.setting_name] = r.setting_value);

    const get = (key, def) => settings[key] !== undefined && settings[key] !== null ? settings[key] : def;

    const staticWords = 'Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E';
    const real = `PUBG-${userKey}-${serial}-${staticWords}`;
    const token = await md5(real);
    const enc = await md5(token + 'VIPENC');

    const response = {
      real, token, Enc: enc, EXP: expiresAt, rng: Math.floor(Date.now() / 1000),
      modname: get('modname', 'YUVI MOD'),
      mod_status: get('mod_status', 'Online'),
      credit: get('credit', 'Yuvi Panel'),
      ESP: get('ESP', 'on'), Item: get('Item', 'on'), AIM: get('AIM', 'on'),
      SilentAim: get('SilentAim', 'on'), BulletTrack: get('BulletTrack', 'on'),
      Floating: get('Floating', 'on'), Memory: get('Memory', 'on'), Setting: get('Setting', 'on'),
      exdate: expiresAt,
      device: String(keyData.device_limit),
    };

    return apiResponse(true, null, response);
  } catch (err) {
    return apiResponse(false, 'SERVER ERROR', null, 500);
  }
}

async function md5(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('MD5', data).catch(() => {
    // MD5 not available in Web Crypto, use SHA-256 as fallback
    return crypto.subtle.digest('SHA-256', data);
  });
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
