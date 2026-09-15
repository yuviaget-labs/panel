import { getSessionUser } from './auth.js';
import { ensureSchema, ensureDefaultOwner } from './setup.js';
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

// Auto-setup: Create tables + default owner account if DB is empty
async function autoSetup(env) {
  try {
    await ensureSchema(env.DB);
    const existing = await env.DB.prepare('SELECT id FROM users LIMIT 1').first();
    if (existing) return false;
    return await ensureDefaultOwner(env.DB);
  } catch (e) {
    return false;
  }
}

export async function handleRoute(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Auto-setup on first visit
  if (path === '/setup') {
    const setupDone = await autoSetup(env);
    return redirect('/login' + (setupDone ? '?setup=1' : ''));
  }

  // Root path - run setup then redirect to login
  if (path === '/') {
    await autoSetup(env);
    return redirect('/login?setup=1');
  }

  // Debug endpoint - shows DB state
  if (path === '/debug') {
    try {
      await ensureSchema(env.DB);
      const users = await env.DB.prepare('SELECT id, username, role, panel_code, password FROM users').all();
      const panels = await env.DB.prepare('SELECT * FROM panels').all();
      return new Response(JSON.stringify({ users: users.results, panels: panels.results }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Test password hash
  if (path === '/test-hash') {
    const encoder = new TextEncoder();
    const data = encoder.encode('admin123');
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return new Response(JSON.stringify({ hash, expected: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', match: hash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' }), {
      headers: { 'Content-Type': 'application/json' }
    });
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
