import { renderLayout } from '../templates/layout.js';
import { sanitize } from '../auth.js';
import { fetchAll } from '../db.js';

export async function renderKeys(env, user, query = {}) {
  const pc = user.panel_code;
  const role = user.role;
  const myId = user.id;

  let sql = `SELECT k.*, (SELECT COUNT(*) FROM key_devices kd WHERE kd.key_id = k.id) as current_devices, u.username as creator_name, u.role as creator_role FROM api_keys k LEFT JOIN users u ON k.created_by = u.id WHERE k.panel_code = ?`;
  const params = [pc];

  if (role === 'ADMIN') {
    sql += ` AND (k.created_by = ? OR u.invited_by = ?)`;
    params.push(myId, myId);
  } else if (role === 'RESELLER') {
    sql += ` AND k.created_by = ?`;
    params.push(myId);
  }

  sql += ` ORDER BY k.id DESC LIMIT 200`;
  const keys = await fetchAll(env.DB, sql, params);

  const flashMsg = query.msg || '';
  const flashError = query.error || '';

  const showBy = role !== 'RESELLER';

  let keysHtml = keys.map(k => `
    <tr class="hover:bg-indigo-50/50 transition-colors">
      <td class="p-3 pl-5">
        <button onclick="copyToClipboard('${sanitize(k.key_value)}', this)" class="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 hover:border-indigo-400 transition-all flex items-center gap-1.5">
          ${sanitize(k.key_value)} <i class="bi bi-copy text-slate-400 text-[10px]"></i>
        </button>
      </td>
      ${showBy ? `<td class="p-3"><p class="text-xs font-bold text-slate-700">${k.creator_name ? sanitize(k.creator_name) : 'Owner'}</p><p class="text-[9px] font-bold uppercase ${k.creator_role==='ADMIN' ? 'text-blue-500' : k.creator_role==='RESELLER' ? 'text-orange-500' : 'text-purple-500'}">${k.creator_role || 'OWNER'}</p></td>` : ''}
      <td class="p-3"><p class="text-xs font-bold text-slate-700">${sanitize(k.duration)}</p><p class="text-[10px] text-slate-400">${k.current_devices}/${k.device_limit} dev</p></td>
      <td class="p-3">${k.is_blocked ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">Blocked</span>' : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span>'}</td>
      <td class="p-3 text-[11px]">${k.expires_at ? '<span class="text-slate-600 font-semibold">' + new Date(k.expires_at).toLocaleDateString('en-IN', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) + '</span>' : '<span class="text-slate-400 italic">Pending</span>'}</td>
      <td class="p-3 pr-5">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="openEditModal(${k.id}, ${k.is_blocked})" class="action-btn w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white flex items-center justify-center text-xs" title="Edit"><i class="bi bi-pencil"></i></button>
          <form method="POST" class="inline" onsubmit="customConfirm(event, 'Reset HWID?');">
            <input type="hidden" name="key_id" value="${k.id}"><input type="hidden" name="action" value="reset_device">
            <button type="submit" class="action-btn w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center justify-center text-xs" title="Reset"><i class="bi bi-arrow-clockwise"></i></button>
          </form>
          <form method="POST" class="inline" onsubmit="customConfirm(event, 'Delete this key?');">
            <input type="hidden" name="key_id" value="${k.id}"><input type="hidden" name="action" value="delete_key">
            <button type="submit" class="action-btn w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs" title="Delete"><i class="bi bi-trash"></i></button>
          </form>
        </div>
      </td>
    </tr>
  `).join('');

  const content = `
<style>.clay-table{background:linear-gradient(145deg,#FFFFFF,#F8FAFC);box-shadow:5px 5px 15px rgba(0,0,0,0.05),-5px -5px 15px rgba(255,255,255,0.9);border-radius:20px}.action-btn{transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);box-shadow:2px 2px 6px rgba(0,0,0,0.06),-2px -2px 6px rgba(255,255,255,0.9)}.action-btn:hover{transform:scale(1.1)}.bulk-section{background:linear-gradient(145deg,#F8FAFC,#E2E8F0);box-shadow:inset 3px 3px 8px rgba(0,0,0,0.06),inset -3px -3px 8px rgba(255,255,255,0.9)}</style>

<div class="max-w-6xl mx-auto space-y-5">
  <div class="rounded-3xl p-6 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20 flex items-center justify-between">
    <div class="flex items-center gap-3"><div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-xl"><i class="bi bi-shield-lock-fill"></i></div><div><h2 class="text-2xl font-black text-white">License Manager</h2><p class="text-white/70 text-xs">Total: ${keys.length} keys</p></div></div>
  </div>

  ${flashMsg ? `<div class="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold flex items-center"><i class="bi bi-check-circle-fill mr-2"></i> ${sanitize(flashMsg)}</div>` : ''}
  ${flashError ? `<div class="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-bold flex items-center"><i class="bi bi-exclamation-triangle-fill mr-2"></i> ${sanitize(flashError)}</div>` : ''}

  ${role === 'OWNER' ? `
  <div class="bulk-section rounded-2xl p-4">
    <div class="flex flex-wrap gap-3 items-end">
      <form method="POST" class="inline" onsubmit="customConfirm(event, 'Delete ALL keys?');">
        <input type="hidden" name="action" value="delete_all">
        <button type="submit" class="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all action-btn"><i class="bi bi-trash"></i> Delete All</button>
      </form>
      <form method="POST" class="inline" onsubmit="customConfirm(event, 'Delete expired keys?');">
        <input type="hidden" name="action" value="delete_expired">
        <button type="submit" class="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all action-btn"><i class="bi bi-clock"></i> Delete Expired</button>
      </form>
      <form method="POST" class="flex gap-2 items-end" onsubmit="customConfirm(event, 'Extend all used keys?');">
        <input type="hidden" name="action" value="extend_all">
        <div><label class="text-[10px] font-bold text-slate-500 block mb-1">Extend Used Keys</label>
        <div class="flex gap-2">
          <input type="number" name="extend_val" value="1" min="1" class="w-20 px-3 py-2 rounded-lg bg-white text-xs font-bold border border-slate-200 focus:border-indigo-500 outline-none">
          <select name="extend_unit" class="px-2 py-2 rounded-lg bg-white text-xs font-bold border border-slate-200 focus:border-indigo-500 outline-none"><option value="D">Days</option><option value="H">Hours</option></select>
          <button type="submit" class="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all action-btn"><i class="bi bi-check"></i></button>
        </div></div>
      </form>
    </div>
  </div>` : ''}

  <div class="clay-table overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead><tr class="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          <th class="p-3 pl-5">Key</th>
          ${showBy ? '<th class="p-3">By</th>' : ''}
          <th class="p-3">Duration</th><th class="p-3">Status</th><th class="p-3">Expiry</th><th class="p-3 text-center pr-5">Actions</th>
        </tr></thead>
        <tbody class="text-sm divide-y divide-slate-100">
          ${keysHtml || `<tr><td colspan="${showBy ? 6 : 5}" class="p-8 text-center text-slate-400 text-sm">No keys found</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
</div>

<div id="editModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center">
  <div class="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl border border-indigo-200">
    <div class="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl">
      <h3 class="font-bold text-indigo-900 text-sm">Manage Key</h3>
      <button onclick="closeEditModal()" class="text-slate-400 hover:text-red-500"><i class="bi bi-x-lg"></i></button>
    </div>
    <form method="POST" class="p-5 space-y-4" action="/keys">
      <input type="hidden" name="action" value="edit_key"><input type="hidden" name="key_id" id="edit_key_id">
      <div><label class="text-xs font-bold text-slate-600 block mb-1">Status</label>
        <select name="edit_status" id="edit_status" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:border-indigo-500 outline-none"><option value="0">Active</option><option value="1">Blocked</option></select></div>
      <div><label class="text-xs font-bold text-slate-600 block mb-1">Extend (0 to skip)</label>
        <div class="flex gap-2">
          <input type="number" name="extend_val" value="0" min="0" class="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 outline-none">
          <select name="extend_unit" class="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-indigo-600 focus:border-indigo-500 outline-none"><option value="H">Hours</option><option value="D" selected>Days</option></select></div></div>
      <div class="flex gap-2 pt-2">
        <button type="button" onclick="closeEditModal()" class="flex-1 px-3 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg">Cancel</button>
        <button type="submit" class="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold rounded-lg">Save</button>
      </div>
    </form>
  </div>
</div>

<script>
function openEditModal(id,status){document.getElementById('edit_key_id').value=id;document.getElementById('edit_status').value=status;document.getElementById('editModal').classList.remove('hidden')}
function closeEditModal(){document.getElementById('editModal').classList.add('hidden')}
</script>`;

  return renderLayout(user, 'keys', content);
}
