import { signJWT, getSessionCookie, clearSessionCookie, getSessionUser, sanitize } from '../auth.js';
import { fetchOne, execute } from '../db.js';

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateDeviceFingerprint(deviceInfo) {
  let parsed = {};
  try { parsed = JSON.parse(deviceInfo || '{}'); } catch {}
  const str = [
    parsed.screen || '',
    parsed.timezone || '',
    parsed.platform || '',
    parsed.canvas || '',
    parsed.webgl || '',
    parsed.audio || '',
    parsed.userAgent || ''
  ].join('|');
  return await hashPassword(str);
}

// For password verification we use SHA-256 comparison (simplified bcrypt alternative)
// In production, use a proper password hashing library
async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}

export async function handleLogin(request, env) {
  try {
    const formData = await request.formData();
    const username = sanitize(formData.get('username') || '');
    const password = formData.get('password') || '';
    const deviceInfo = formData.get('device_info') || '{}';

    if (!username || !password) {
      return redirect('/login?error=1');
    }

    const user = await fetchOne(env.DB, 'SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return redirect('/login?error=1');
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return redirect('/login?error=1');
    }

    if (user.is_blocked) {
      return redirect('/login?blocked=1');
    }

    const fingerprint = await generateDeviceFingerprint(deviceInfo);

    if (!user.device_fingerprint || user.device_fingerprint === '') {
      await execute(env.DB, 'UPDATE users SET device_fingerprint = ?, last_login = datetime(\'now\') WHERE id = ?', [fingerprint, user.id]);
    } else if (user.device_fingerprint !== fingerprint) {
      return redirect('/login?device_mismatch=1');
    } else {
      await execute(env.DB, 'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?', [user.id]);
    }

    const token = await signJWT({
      user_id: user.id,
      username: user.username,
      role: user.role,
      panel_code: user.panel_code,
    }, env.JWT_SECRET);

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard',
        'Set-Cookie': getSessionCookie({ sessionToken: token }),
      },
    });
  } catch (err) {
    return redirect('/login?error=1');
  }
}

export async function handleRegister(request, env) {
  try {
    const formData = await request.formData();
    const refCode = sanitize(formData.get('referral_code') || '');
    const fullName = sanitize(formData.get('full_name') || '');
    const username = sanitize(formData.get('username') || '');
    const password = formData.get('password') || '';

    if (!refCode || !fullName || !username || !password) {
      return redirect('/register?error=1');
    }

    const referral = await fetchOne(env.DB, 'SELECT * FROM referrals WHERE code = ? AND used = 0', [refCode]);
    if (!referral) {
      return redirect('/register?error=invalid_code');
    }

    const existing = await fetchOne(env.DB, 'SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return redirect('/register?error=username_exists');
    }

    const hash = await hashPassword(password);
    const now = new Date();
    const expiryDate = new Date(now.getTime() + referral.duration * 86400000);
    const validity = expiryDate.toISOString().replace('T', ' ').slice(0, 19);

    await execute(env.DB,
      'INSERT INTO users (full_name, username, password, role, balance, validity, panel_code, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fullName, username, hash, referral.role, referral.balance, validity, referral.panel_code, referral.created_by]
    );

    await execute(env.DB, 'UPDATE referrals SET used = 1 WHERE code = ?', [refCode]);

    return redirect('/login?registered=1');
  } catch (err) {
    return redirect('/register?error=1');
  }
}

export async function handleLogout(request, env) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': clearSessionCookie(),
    },
  });
}

export async function handleResetDevice(request, env) {
  if (request.method === 'GET') {
    return redirect('/reset-device');
  }

  try {
    const formData = await request.formData();
    const username = sanitize(formData.get('username') || '');
    const password = formData.get('password') || '';

    if (!username || !password) {
      return redirect('/reset-device?error=1');
    }

    const user = await fetchOne(env.DB, 'SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return redirect('/reset-device?error=invalid');
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return redirect('/reset-device?error=invalid');
    }

    if (user.is_blocked) {
      return redirect('/reset-device?error=blocked');
    }

    if (user.last_reset) {
      const lastReset = new Date(user.last_reset).getTime();
      const nextReset = lastReset + 86400000;
      if (Date.now() < nextReset) {
        const nextDate = new Date(nextReset);
        return redirect('/reset-device?error=cooldown&next=' + encodeURIComponent(nextDate.toISOString()));
      }
    }

    await execute(env.DB, 'UPDATE users SET device_fingerprint = NULL, last_reset = datetime(\'now\') WHERE id = ?', [user.id]);

    return redirect('/reset-device?success=1');
  } catch (err) {
    return redirect('/reset-device?error=1');
  }
}

export async function handleJoinPanel(request, env) {
  if (request.method === 'GET') {
    return redirect('/join-panel');
  }

  try {
    const formData = await request.formData();
    const username = sanitize(formData.get('username') || '');
    const panelCode = sanitize(formData.get('panel_code') || '');

    if (!username || !panelCode) {
      return redirect('/join-panel?error=1');
    }

    const user = await fetchOne(env.DB, 'SELECT id FROM users WHERE username = ? AND panel_code = ?', [username, panelCode]);
    if (!user) {
      return redirect('/join-panel?error=not_found');
    }

    return redirect('/login');
  } catch (err) {
    return redirect('/join-panel?error=1');
  }
}
