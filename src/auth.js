// JWT utilities using Web Crypto API
const encoder = new TextEncoder();

export async function hashPassword(password) {
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload, secret, expiresIn = 86400 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(fullPayload));
  const message = `${headerB64}.${payloadB64}`;

  const key = await getKey(secret);

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  const sigB64 = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${message}.${sigB64}`;
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const key = await getKey(secret);

    const sigBytes = Uint8Array.from(
      atob(sigB64),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(message)
    );

    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));

    if (
      payload.exp &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;

  } catch {
    return null;
  }
}

export function getSessionCookie(user) {
  return `session=${user.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${86400 * 7}`;
}

export function clearSessionCookie() {
  return 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

export async function getSessionUser(request, env) {
  try {
    const cookieHeader = request.headers.get('Cookie') || '';

    const match = cookieHeader.match(/session=([^;]+)/);

    if (!match) return null;

    const payload = await verifyJWT(
      match[1],
      env.JWT_SECRET
    );

    if (!payload || !payload.user_id) return null;

    const user = await env.DB
      .prepare(`
        SELECT
          id,
          full_name,
          username,
          role,
          balance,
          validity,
          panel_code,
          is_blocked
        FROM users
        WHERE id = ?
      `)
      .bind(payload.user_id)
      .first();

    if (!user || user.is_blocked) return null;

    return user;

  } catch {
    return null;
  }
}

export function sanitize(str) {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function cleanInput(value, max = 255) {
  if (!value || typeof value !== 'string') return '';

  const trimmed = value.trim();

  return (
    trimmed.length > 0 &&
    trimmed.length <= max
  ) ? trimmed : '';
}

// =====================================================
// DEVICE COOKIE SYSTEM
// =====================================================

// Read device cookie from browser
export function getDeviceCookie(request) {
  const cookieHeader = request.headers.get('Cookie') || '';

  const match = cookieHeader.match(
    /(?:^|;\s*)device_id=([^;]+)/
  );

  if (!match) return '';

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return '';
  }
}

// Generate random device ID
export function createDeviceId() {
  const bytes = crypto.getRandomValues(
    new Uint8Array(32)
  );

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Device cookie header
export function getDeviceCookieHeader(deviceId) {
  return `device_id=${encodeURIComponent(deviceId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${86400 * 365 * 5}`;
}

// =====================================================
// KEY GENERATION
// =====================================================

function generateRandomString(length) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';

  const values = crypto.getRandomValues(
    new Uint8Array(length)
  );

  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }

  return result;
}

export function generateKeyString(duration) {
  const prefix = duration.toUpperCase();
  const rnd = generateRandomString(12);

  return `${prefix}-${rnd}`;
}

export function generateReferralCode() {
  return 'REF-' + generateRandomString(6).toUpperCase();
}
