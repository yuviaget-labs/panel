import { renderLayout } from '../templates/layout.js';
import { sanitize } from '../auth.js';
import { fetchOne, fetchAll } from '../db.js';

export async function renderDashboard(env, user) {
  const pc = user.panel_code;
  const role = user.role;
  let balanceText = '';
  let stats = {};

  if (role === 'OWNER') {
    balanceText = 'UNLIMITED';
    const row = await fetchOne(env.DB, `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE panel_code=? AND role='ADMIN') as total_admins,
        (SELECT COUNT(*) FROM users WHERE panel_code=? AND role='RESELLER') as total_resellers,
        (SELECT COUNT(*) FROM api_keys WHERE panel_code=?) as total_keys,
        (SELECT COUNT(*) FROM api_keys k JOIN users u ON k.created_by = u.id WHERE k.panel_code=? AND u.role='ADMIN') as admin_keys,
        (SELECT COUNT(*) FROM api_keys k JOIN users u ON k.created_by = u.id WHERE k.panel_code=? AND u.role='RESELLER') as reseller_keys,
        (SELECT COUNT(*) FROM api_keys WHERE panel_code=? AND is_blocked=0) as active_keys
    `, [pc, pc, pc, pc, pc, pc]);
    stats = row || {};
  } else if (role === 'ADMIN') {
    const u = await fetchOne(env.DB, 'SELECT balance FROM users WHERE id = ?', [user.id]);
    balanceText = (u ? u.balance : 0).toLocaleString();
    const row = await fetchOne(env.DB, `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE panel_code=? AND role='RESELLER' AND invited_by=?) as my_resellers,
        (SELECT COUNT(*) FROM api_keys WHERE panel_code=? AND created_by=?) as my_keys,
        (SELECT COUNT(*) FROM api_keys k JOIN users u ON k.created_by = u.id WHERE k.panel_code=? AND u.role='RESELLER' AND u.invited_by=?) as my_reseller_keys,
        (SELECT COUNT(*) FROM api_keys WHERE panel_code=? AND created_by=? AND is_blocked=0) as my_active_keys
    `, [pc, user.id, pc, user.id, pc, user.id, pc, user.id]);
    stats = row || {};
    stats.team_keys = (stats.my_keys || 0) + (stats.my_reseller_keys || 0);
  } else {
    const u = await fetchOne(env.DB, 'SELECT balance FROM users WHERE id = ?', [user.id]);
    balanceText = (u ? u.balance : 0).toLocaleString();
    const row = await fetchOne(env.DB, `
      SELECT 
        (SELECT COUNT(*) FROM api_keys WHERE panel_code=? AND created_by=?) as my_keys,
        (SELECT COUNT(*) FROM api_keys WHERE panel_code=? AND created_by=? AND is_blocked=0) as my_active_keys
    `, [pc, user.id, pc, user.id]);
    stats = row || {};
  }

  const desc = role === 'OWNER' ? 'Manage your entire panel network and track performance' :
               role === 'ADMIN' ? 'Manage your team and monitor key generation' :
               'Track your keys and manage your account';

  let statsHtml = '';

  if (role === 'OWNER') {
    statsHtml = `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 shadow-[0_8px_32px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-amber-200/30 rounded-full blur-2xl"></div>
        <div class="flex items-center justify-between relative z-10">
          <div><p class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Account Balance</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">${balanceText}</h3></div>
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-all"><i class="bi bi-wallet2"></i></div>
        </div>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 shadow-[0_8px_32px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl"></div>
        <div class="flex items-center justify-between relative z-10">
          <div><p class="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Total Panel Keys</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">${stats.total_keys || 0}</h3><p class="text-[10px] text-blue-500 font-semibold mt-1">${stats.active_keys || 0} active</p></div>
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-all"><i class="bi bi-key-fill"></i></div>
        </div>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50 shadow-[0_8px_32px_rgba(168,85,247,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-purple-200/30 rounded-full blur-2xl"></div>
        <div class="flex items-center justify-between relative z-10">
          <div>
            <p class="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Total Network</p>
            <div class="flex gap-6">
              <div class="text-center"><span class="block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">${stats.total_admins || 0}</span><span class="text-[9px] uppercase font-bold text-purple-400">Admins</span></div>
              <div class="text-center"><span class="block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">${stats.total_resellers || 0}</span><span class="text-[9px] uppercase font-bold text-purple-400">Resellers</span></div>
            </div>
          </div>
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 text-white flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-all"><i class="bi bi-diagram-3-fill"></i></div>
        </div>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-[0_8px_32px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="flex items-center justify-between relative z-10">
          <div><p class="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Keys by Admins</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">${stats.admin_keys || 0}</h3></div>
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-all"><i class="bi bi-person-badge-fill"></i></div>
        </div>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/50 shadow-[0_8px_32px_rgba(249,115,22,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="flex items-center justify-between relative z-10">
          <div><p class="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">Keys by Resellers</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">${stats.reseller_keys || 0}</h3></div>
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-all"><i class="bi bi-person-workspace"></i></div>
        </div>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <p class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Quick Actions</p>
        <div class="flex gap-2 flex-wrap">
          <a href="/generate" class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all"><i class="bi bi-plus-circle"></i> Generate Key</a>
          <a href="/users" class="px-4 py-2 rounded-xl bg-white/70 text-slate-700 text-xs font-bold border border-slate-200 hover:bg-white transition-all"><i class="bi bi-people"></i> Users</a>
          <a href="/server" class="px-4 py-2 rounded-xl bg-white/70 text-slate-700 text-xs font-bold border border-slate-200 hover:bg-white transition-all"><i class="bi bi-hdd"></i> Server</a>
        </div>
      </div>
    </div>`;
  } else if (role === 'ADMIN') {
    statsHtml = `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 shadow-[0_8px_32px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <p class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">My Balance</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">${balanceText}</h3>
        <i class="bi bi-wallet2 text-4xl text-amber-300 absolute bottom-4 right-4 opacity-50 group-hover:scale-110 transition-all"></i>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 shadow-[0_8px_32px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <p class="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Team Total Keys</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">${stats.team_keys || 0}</h3>
        <i class="bi bi-key-fill text-4xl text-blue-300 absolute bottom-4 right-4 opacity-50 group-hover:scale-110 transition-all"></i>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-[0_8px_32px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <p class="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">My Keys</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">${stats.my_keys || 0}</h3>
        <p class="text-[10px] text-emerald-500 font-semibold mt-1">${stats.my_active_keys || 0} active</p>
        <i class="bi bi-person-check text-4xl text-emerald-300 absolute bottom-4 right-4 opacity-50 group-hover:scale-110 transition-all"></i>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50 shadow-[0_8px_32px_rgba(168,85,247,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <p class="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">My Resellers</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">${stats.my_resellers || 0}</h3>
        <p class="text-[10px] text-purple-500 font-semibold mt-1">${stats.my_reseller_keys || 0} keys by them</p>
        <i class="bi bi-people-fill text-4xl text-purple-300 absolute bottom-4 right-4 opacity-50 group-hover:scale-110 transition-all"></i>
      </div>
    </div>`;
  } else {
    statsHtml = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 shadow-[0_8px_32px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="flex items-center justify-between"><div><p class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Account Balance</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">${balanceText}</h3></div>
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-all"><i class="bi bi-wallet2"></i></div></div>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 shadow-[0_8px_32px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="flex items-center justify-between"><div><p class="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Total Keys</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">${stats.my_keys || 0}</h3></div>
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-all"><i class="bi bi-key-fill"></i></div></div>
      </div>
      <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-[0_8px_32px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] group">
        <div class="flex items-center justify-between"><div><p class="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Active Keys</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">${stats.my_active_keys || 0}</h3></div>
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-all"><i class="bi bi-shield-check"></i></div></div>
      </div>
    </div>`;
  }

  const content = `
    <div class="relative mb-8 overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-[0_20px_60px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]">
      <div class="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-[80px] animate-pulse"></div>
      <div class="absolute bottom-0 left-1/4 w-64 h-64 bg-pink-400/20 rounded-full blur-[60px]"></div>
      <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 30px 30px;"></div>
      <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Welcome back, ${sanitize(user.username)}!</h1>
          <p class="text-white/80 text-sm md:text-base font-medium">${desc}</p>
        </div>
        <div class="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/20">
          <div class="text-right"><p class="text-[10px] text-white/70 font-bold uppercase tracking-wider">Role</p><p class="text-white font-extrabold text-sm">${role}</p></div>
          <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl"><i class="bi bi-rocket-takeoff-fill text-white"></i></div>
        </div>
      </div>
    </div>
    ${statsHtml}`;

  return renderLayout(user, 'dashboard', content);
}
