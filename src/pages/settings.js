import { renderLayout } from '../templates/layout.js';
import { sanitize } from '../auth.js';
import { fetchOne, fetchAll } from '../db.js';

export async function renderSettings(env, user, query = {}) {
  const isOwner = user.role === 'OWNER';
  const pc = user.panel_code;
  const flashMsg = query.msg || '';
  const flashError = query.error || '';

  let panelName = 'YUVI PANEL';
  if (pc) {
    const pnRow = await fetchOne(env.DB, "SELECT setting_value FROM mod_settings WHERE setting_name = 'panel_name' AND panel_code = ?", [pc]);
    if (pnRow) panelName = pnRow.setting_value;
  }

  const protocol = 'https';
  const connectUrl = `${protocol}://${env.DOMAIN || 'your-domain.workers.dev'}/connect/${pc}`;
  const encryptUrl = `${protocol}://${env.DOMAIN || 'your-domain.workers.dev'}/encrypt/${pc}`;

  const content = `
<style>.clay-card{background:linear-gradient(145deg,#FFFFFF,#F1F5F9);box-shadow:10px 10px 20px rgba(0,0,0,0.07),-10px -10px 20px rgba(255,255,255,0.95);border:1px solid rgba(255,255,255,0.8)}.clay-input{background:linear-gradient(145deg,#F8FAFC,#E2E8F0);box-shadow:inset 3px 3px 8px rgba(0,0,0,0.06),inset -3px -3px 8px rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.8);transition:all 0.3s ease}.clay-input:focus{background:#FFF;box-shadow:inset 2px 2px 6px rgba(99,102,241,0.08),0 0 0 3px rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);outline:none}.code-box{background:linear-gradient(145deg,#1E293B,#0F172A);box-shadow:inset 3px 3px 8px rgba(0,0,0,0.3),inset -3px -3px 8px rgba(255,255,255,0.05);border-radius:16px}.copy-btn{transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);box-shadow:3px 3px 8px rgba(0,0,0,0.08),-3px -3px 8px rgba(255,255,255,0.95)}.copy-btn:hover{transform:scale(1.1)}</style>

<div class="max-w-4xl mx-auto space-y-6">
  <div class="rounded-3xl p-8 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20 flex items-center justify-between">
    <div class="flex items-center gap-4"><div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl"><i class="bi bi-gear-fill"></i></div><div><h2 class="text-3xl font-black text-white">Settings</h2><p class="text-white/70 text-sm mt-0.5">Manage account and panel configurations</p></div></div>
  </div>

  ${flashMsg ? `<div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-base font-bold flex items-center shadow-sm"><i class="bi bi-check-circle-fill mr-3 text-xl"></i> ${flashMsg === 'password_updated' ? 'Password updated securely!' : flashMsg === 'branding_updated' ? 'Panel branding updated!' : flashMsg}</div>` : ''}
  ${flashError ? `<div class="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-base font-bold flex items-center shadow-sm"><i class="bi bi-exclamation-triangle-fill mr-3 text-xl"></i> ${flashError === 'wrong_password' ? 'Current password is incorrect.' : flashError}</div>` : ''}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="clay-card rounded-3xl p-6">
      <h3 class="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2"><i class="bi bi-shield-lock text-indigo-500"></i> Security</h3>
      <form method="POST" action="/settings" class="space-y-4">
        <input type="hidden" name="action" value="update_password">
        <div><label class="text-xs font-bold text-slate-600 block mb-1.5">Current Password</label><input type="password" name="current_password" required class="clay-input w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-700"></div>
        <div><label class="text-xs font-bold text-slate-600 block mb-1.5">New Password</label><input type="password" name="new_password" required class="clay-input w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-700"></div>
        <button type="submit" class="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/30"><i class="bi bi-check-circle"></i> Update Password</button>
      </form>
    </div>

    ${isOwner ? `
    <div class="space-y-6">
      <div class="clay-card rounded-3xl p-6">
        <h3 class="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2"><i class="bi bi-palette text-purple-500"></i> Panel Branding</h3>
        <form method="POST" action="/settings" class="space-y-4">
          <input type="hidden" name="action" value="update_branding">
          <div><label class="text-xs font-bold text-slate-600 block mb-1.5">Panel Name</label><input type="text" name="panel_name" value="${sanitize(panelName)}" required class="clay-input w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700"></div>
          <button type="submit" class="w-full py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/30"><i class="bi bi-save"></i> Save Branding</button>
        </form>
      </div>

      <div class="clay-card rounded-3xl p-6">
        <h3 class="font-bold text-lg text-slate-800 mb-1 flex items-center gap-2"><i class="bi bi-code-square text-slate-700"></i> API Details</h3>
        <p class="text-xs text-red-500 font-bold mb-4"><i class="bi bi-exclamation-circle"></i> KEEP THIS SECRET</p>
        <div class="space-y-3">
          <div><p class="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Panel Code</p>
            <div class="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200 gap-2"><code class="text-sm font-mono font-bold text-indigo-600 truncate">${sanitize(pc)}</code><button onclick="copyToClipboard('${sanitize(pc)}', this)" class="copy-btn shrink-0 text-slate-400 hover:text-indigo-600 p-2 rounded-lg bg-white"><i class="bi bi-copy"></i></button></div></div>
          <div><p class="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Normal API Endpoint</p>
            <div class="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200 gap-2"><code class="text-xs font-mono text-slate-700 truncate">${connectUrl}</code><button onclick="copyToClipboard('${connectUrl}', this)" class="copy-btn shrink-0 text-slate-400 hover:text-indigo-600 p-2 rounded-lg bg-white"><i class="bi bi-copy"></i></button></div></div>
          <div><p class="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Encrypted API Endpoint</p>
            <div class="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200 gap-2"><code class="text-xs font-mono text-slate-700 truncate">${encryptUrl}</code><button onclick="copyToClipboard('${encryptUrl}', this)" class="copy-btn shrink-0 text-slate-400 hover:text-indigo-600 p-2 rounded-lg bg-white"><i class="bi bi-copy"></i></button></div></div>
        </div>
      </div>
    </div>` : `
    <div class="clay-card rounded-3xl p-6 flex flex-col items-center justify-center text-center">
      <div class="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mb-4"><i class="bi bi-shield-lock"></i></div>
      <h3 class="font-bold text-slate-700 text-base">Restricted Area</h3>
      <p class="text-slate-400 text-sm mt-2 max-w-xs">Panel configuration and API details are only accessible by the Panel Owner.</p>
    </div>`}
  </div>
</div>`;

  return renderLayout(user, 'settings', content);
}
