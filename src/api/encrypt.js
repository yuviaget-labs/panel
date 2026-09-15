import { cleanInput } from '../auth.js';
import { fetchOne, fetchAll, execute } from '../db.js';

function jsonResp(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleEncrypt(request, env, panelCode) {
  try {
    panelCode = cleanInput(panelCode, 20);
    if (!panelCode) {
      return jsonResp({ status: false, reason: 'PANEL CODE MISSING' });
    }

    const formData = await request.formData();
    const game = formData.get('game') || '';
    const uKey = formData.get('user_key') || '';
    const sDev = formData.get('serial') || '';

    if (!game || !uKey || !sDev) {
      return jsonResp({ status: false, reason: 'INVALID PARAMETER' });
    }
    if (game !== 'PUBG') {
      return jsonResp({ status: false, reason: 'USER OR GAME NOT REGISTERED' });
    }

    const panel = await fetchOne(env.DB, 'SELECT panel_code, is_active FROM panels WHERE panel_code = ?', [panelCode]);
    if (!panel || !panel.is_active) {
      return jsonResp({ status: false, reason: 'USER OR GAME NOT REGISTERED' });
    }

    // Check panel activation (owner expiry)
    const ownerExpiry = await fetchOne(env.DB, 'SELECT panel_expiry FROM users WHERE panel_code = ? AND role = \'OWNER\' LIMIT 1', [panelCode]);
    if (!ownerExpiry || !ownerExpiry.panel_expiry || new Date(ownerExpiry.panel_expiry).getTime() < Date.now()) {
      return jsonResp({ status: false, reason: 'PANEL NOT ACTIVATED' });
    }

    const maintenance = await fetchOne(env.DB, 'SELECT is_active, reason FROM mod_maintenance WHERE panel_code = ?', [panelCode]);
    if (maintenance && maintenance.is_active === 1) {
      return jsonResp({ status: false, reason: maintenance.reason || 'Server under maintenance' });
    }

    const keyData = await fetchOne(env.DB, 'SELECT * FROM api_keys WHERE key_value = ? AND panel_code = ? AND is_active = 1', [uKey, panelCode]);
    if (!keyData) {
      return jsonResp({ status: false, reason: 'USER OR GAME NOT REGISTERED' });
    }
    if (keyData.is_blocked) {
      return jsonResp({ status: false, reason: 'USER BLOCKED' });
    }
    if (keyData.expires_at && new Date(keyData.expires_at).getTime() < Date.now()) {
      return jsonResp({ status: false, reason: 'EXPIRED KEY' });
    }

    // Device check
    const devices = await fetchAll(env.DB, 'SELECT device_uuid FROM key_devices WHERE key_id = ?', [keyData.id]);
    const deviceUuids = devices.map(d => d.device_uuid);
    if (!deviceUuids.includes(sDev)) {
      if (deviceUuids.length >= keyData.device_limit) {
        return jsonResp({ status: false, reason: 'MAX DEVICE REACHED' });
      }
      await execute(env.DB, 'INSERT INTO key_devices (key_id, device_uuid, panel_code) VALUES (?, ?, ?)', [keyData.id, sDev, panelCode]);
    } else {
      await execute(env.DB, 'UPDATE key_devices SET last_seen = datetime(\'now\') WHERE key_id = ? AND device_uuid = ?', [keyData.id, sDev]);
    }

    // Handle expiry
    let expiresAt = keyData.expires_at;
    if (!expiresAt) {
      const dur = (keyData.duration || '').replace(/D/, ' days').replace(/H/, ' hours');
      const m = (keyData.duration || '').match(/^(\d+)(D|H)$/);
      if (m) {
        const now = new Date();
        if (m[2] === 'D') now.setDate(now.getDate() + parseInt(m[1]));
        else now.setHours(now.getHours() + parseInt(m[1]));
        expiresAt = now.toISOString().replace('T', ' ').slice(0, 19);
      }
      await execute(env.DB, 'UPDATE api_keys SET expires_at = ?, uses = uses + 1 WHERE id = ?', [expiresAt, keyData.id]);
    } else {
      await execute(env.DB, 'UPDATE api_keys SET uses = uses + 1 WHERE id = ?', [keyData.id]);
    }

    // Get settings
    const settingsRows = await fetchAll(env.DB, 'SELECT setting_name, setting_value FROM mod_settings WHERE panel_code = ?', [panelCode]);
    const settings = {};
    settingsRows.forEach(r => settings[r.setting_name] = r.setting_value);
    const get = (k, d) => settings[k] || d;

    // Get AES keys
    const aesRows = await fetchAll(env.DB, 'SELECT setting_name, setting_value FROM mod_settings WHERE panel_code = ? AND setting_name IN (\'aes_key\', \'aes_iv\')', [panelCode]);
    const aesMap = {};
    aesRows.forEach(r => aesMap[r.setting_name] = r.setting_value);

    if (!aesMap.aes_key || !aesMap.aes_iv) {
      return jsonResp({ status: false, reason: 'ENCRYPTION NOT CONFIGURED' });
    }

    const staticWords = 'Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E';
    const real = `PUBG-${uKey}-${sDev}-${staticWords}`;
    const token = await md5(real);
    const EncValue = await md5(token + 'VIPENC');

    const responseData = {
      status: true,
      data: {
        real, token, Enc: EncValue, EXP: expiresAt, rng: Math.floor(Date.now() / 1000),
        modname: get('modname', 'YUVI MOD'), mod_status: get('mod_status', 'Online'), credit: get('credit', 'Yuvi Panel'),
        ESP: get('ESP', 'on'), Item: get('Item', 'on'), AIM: get('AIM', 'on'),
        SilentAim: get('SilentAim', 'on'), BulletTrack: get('BulletTrack', 'on'),
        Floating: get('Floating', 'on'), Memory: get('Memory', 'on'), Setting: get('Setting', 'on'),
        exdate: expiresAt, device: String(keyData.device_limit),
      },
    };

    // AES-256-CBC encryption using Web Crypto
    const plaintext = JSON.stringify(responseData);
    const keyBytes = hexToBytes(aesMap.aes_key);
    const ivBytes = hexToBytes(aesMap.aes_iv);

    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: ivBytes }, cryptoKey, new TextEncoder().encode(plaintext));
    const base64Payload = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

    return jsonResp({ status: true, payload: base64Payload });
  } catch (err) {
    return jsonResp({ status: false, reason: 'SERVER ERROR' });
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function md5(message) {
  const data = new TextEncoder().encode(message);
  try {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}
