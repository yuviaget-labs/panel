import { getSessionUser } from './auth.js';
import { handleLogin, handleRegister, handleLogout, handleResetDevice, handleJoinPanel } from './api/auth-api.js';
import { handleConnect } from './api/connect.js';
import { handleEncrypt } from './api/encrypt.js';
import { handleGenerateKeys, handleKeyListActions } from './api/keys.js';
import { handleUsersActions } from './api/users.js';
import { handleServerSettings, handleSettingsUpdate } from './api/server-settings.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderGenerate } from './pages/generate.js';
import { renderKeys } from './pages/keys.js';
import { renderUsers } from './pages/users.js';
import { renderServer } from './pages/server.js';
import { renderSettings } from './pages/settings.js';
import { renderResetDevice } from './pages/reset-device.js';
import { renderJoinPanel } from './pages/join-panel.js';

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

function htmlResp(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

function notFound() {
  return new Response('<h1 style="text-align:center;margin-top:50px;font-family:sans-serif;">404 - Page Not Found</h1>', {
    status: 404,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Auto-setup: Create default owner account + panel if DB is empty
async function autoSetup(env) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM users LIMIT 1').first();
    if (existing) return false; // Already setup

    // Hash password for admin123
    const encoder = new TextEncoder();
    const data = encoder.encode('admin123');
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Insert default panel
    await env.DB.prepare('INSERT OR IGNORE INTO panels (panel_code, is_active) VALUES (?, 1)').bind('YUVI_001').run();

    // Insert default owner
    await env.DB.prepare(
      "INSERT INTO users (full_name, username, password, role, balance, panel_code) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind('Owner', 'admin', hash, 'OWNER', 999999, 'YUVI_001').run();

    // Insert default mod settings
    const defaultSettings = [
      ['modname', 'YUVI MOD'], ['mod_status', 'Online'], ['credit', 'Yuvi Panel'],
      ['ESP', 'on'], ['Item', 'on'], ['AIM', 'on'], ['SilentAim', 'on'],
      ['BulletTrack', 'on'], ['Floating', 'on'], ['Memory', 'on'], ['Setting', 'on'],
      ['panel_name', 'YUVI PANEL']
    ];
    for (const [name, value] of defaultSettings) {
      await env.DB.prepare('INSERT OR IGNORE INTO mod_settings (setting_name, setting_value, panel_code) VALUES (?, ?, ?)').bind(name, value, 'YUVI_001').run();
    }

    // Insert default maintenance (off)
    await env.DB.prepare('INSERT OR IGNORE INTO mod_maintenance (panel_code, is_active, reason) VALUES (?, 0, ?)').bind('YUVI_001', 'Server is updating. Please wait...').run();

    return true; // Setup done
  } catch (e) {
    return false;
  }
}

export async function handleRoute(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Auto-setup on first visit
  if (path === '/setup' || path === '/') {
    const setupDone = await autoSetup(env);
    if (setupDone) {
      return htmlResp(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Setup Complete</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#EEF2FF 0%,#E0E7FF 25%,#F5F3FF 50%,#FDF2F8 75%,#EFF6FF 100%);min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:20px}.glass{background:rgba(255,255,255,0.85);backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,0.8);box-shadow:0 20px 60px rgba(0,0,0,0.08)}.btn{width:100%;padding:16px;border-radius:16px;font-weight:800;font-size:15px;color:white;background:linear-gradient(135deg,#6366F1,#A855F7,#EC4899);background-size:200% 200%;animation:gs 3s ease infinite;border:none;cursor:pointer;box-shadow:0 10px 30px rgba(99,102,241,0.35);text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px}@keyframes gs{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}</style></head><body><div class="w-full max-w-[420px] relative z-10"><div class="text-center mb-5"><div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl text-white mx-auto mb-2 shadow-[0_10px_30px_rgba(16,185,129,0.4)]"><i class="bi bi-check-lg"></i></div><h1 class="text-lg font-black tracking-wide"><span class="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">SETUP COMPLETE</span></h1></div><div class="glass p-6 rounded-[28px]"><div class="alert-box" style="padding:12px 16px;border-radius:14px;font-size:13px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:10px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);color:#059669"><i class="bi bi-check-circle-fill"></i> Default owner account created!</div><div style="background:linear-gradient(145deg,#F8FAFC,#E2E8F0);border-radius:16px;padding:20px;margin-bottom:16px"><p style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Login Credentials</p><p style="font-size:14px;font-weight:700;color:#1E293B;margin-bottom:4px"><i class="bi bi-person" style="color:#6366F1;margin-right:6px"></i> Username: <span style="color:#6366F1">admin</span></p><p style="font-size:14px;font-weight:700;color:#1E293B"><i class="bi bi-lock" style="color:#A855F7;margin-right:6px"></i> Password: <span style="color:#A855F7">admin123</span></p></div><a href="/login" class="btn">Go to Login <i class="bi bi-arrow-right"></i></a><p style="text-align:center;margin-top:12px;font-size:11px;color:#DC2626;font-weight:700"><i class="bi bi-exclamation-triangle"></i> Login ke baad password zaroor change karo!</p></div></div></body></html>`);
    }
  }

  // Parse route parts
  const parts = path.split('/').filter(Boolean);

  // SDK API handlers: /sdk/mundo/{panel_code} or /sdk/bcore/{panel_code}
  if (parts[0] === 'sdk' && parts[1] && parts[2] && method === 'POST') {
    const engine = parts[1].toLowerCase();
    const panelCode = parts[2];
    if (engine === 'mundo' || engine === 'bcore') {
      return handleConnect(request, env, panelCode);
    }
  }

  // Legacy API handlers: /connect/{panel_code} and /encrypt/{panel_code}
  if (parts[0] === 'connect' && parts[1] && method === 'POST') {
    return handleConnect(request, env, parts[1]);
  }
  if (parts[0] === 'encrypt' && parts[1] && method === 'POST') {
    return handleEncrypt(request, env, parts[1]);
  }

  // Auth API routes
  if (path === '/login' && method === 'POST') {
    return handleLogin(request, env);
  }
  if (path === '/register' && method === 'POST') {
    return handleRegister(request, env);
  }
  if (path === '/reset-device' && method === 'POST') {
    return handleResetDevice(request, env);
  }
  if (path === '/logout') {
    return handleLogout(request, env);
  }

  // Protected API routes (require POST)
  if (method === 'POST') {
    const user = await getSessionUser(request, env);
    if (!user) return redirect('/login');

    if (path === '/generate') {
      return handleGenerateKeys(request, env, user);
    }
    if (path === '/keys') {
      return handleKeyListActions(request, env, user);
    }
    if (path === '/users') {
      return handleUsersActions(request, env, user);
    }
    if (path === '/server') {
      return handleServerSettings(request, env, user);
    }
    if (path === '/settings') {
      return handleSettingsUpdate(request, env, user);
    }
  }

  // Page routes (GET)
  if (method === 'GET') {
    // Auth pages (no auth required)
    if (path === '/login') {
      return htmlResp(await renderLogin(env));
    }
    if (path === '/register') {
      return htmlResp(await renderRegister(env));
    }
    if (path === '/reset-device') {
      return htmlResp(await renderResetDevice(env));
    }
    if (path === '/join-panel') {
      return htmlResp(await renderJoinPanel(env));
    }
    if (path === '/logout') {
      return handleLogout(request, env);
    }

    // Protected pages
    const user = await getSessionUser(request, env);
    if (!user) return redirect('/login');

    if (path === '/dashboard' || path === '/') {
      return htmlResp(await renderDashboard(env, user));
    }
    if (path === '/generate') {
      return htmlResp(await renderGenerate(env, user));
    }
    if (path === '/keys') {
      return htmlResp(await renderKeys(env, user));
    }
    if (path === '/users') {
      if (user.role !== 'OWNER' && user.role !== 'ADMIN') return redirect('/dashboard');
      return htmlResp(await renderUsers(env, user));
    }
    if (path === '/server') {
      if (user.role !== 'OWNER' && user.role !== 'ADMIN') return redirect('/dashboard');
      return htmlResp(await renderServer(env, user));
    }
    if (path === '/settings') {
      return htmlResp(await renderSettings(env, user));
    }
  }

  return notFound();
}
