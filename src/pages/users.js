import { renderLayout } from '../templates/layout.js';
import { sanitize } from '../auth.js';
import { fetchAll } from '../db.js';

export async function renderUsers(env, user, query = {}) {
  const pc = user.panel_code;
  const role = user.role;
  const myId = user.id;

  let usersList;
  if (role === 'OWNER') {
    usersList = await fetchAll(env.DB, 'SELECT u.id, u.full_name, u.username, u.role, u.balance, u.validity, u.is_blocked, inv.username as invited_by_name FROM users u LEFT JOIN users inv ON u.invited_by = inv.id WHERE u.panel_code = ? ORDER BY u.role ASC, u.id DESC', [pc]);
  } else {
    usersList = await fetchAll(env.DB, 'SELECT u.id, u.full_name, u.username, u.role, u.balance, u.validity, u.is_blocked, NULL as invited_by_name FROM users u WHERE u.panel_code = ? AND (u.id = ? OR (u.role = \'RESELLER\' AND u.invited_by = ?)) ORDER BY u.role ASC, u.id DESC', [pc, myId, myId]);
  }

  const flashSuccess = query.msg || '';
  const flashError = query.error || '';

  let usersHtml = usersList.map(u => {
    const isMe = u.id === myId;
    return `
    <tr class="hover:bg-indigo-50/50 transition-colors ${isMe ? 'bg-indigo-50/30' : ''}">
      <td class="p-4 pl-6 text-sm font-mono text-slate-400">#${u.id}</td>
      <td class="p-4">
        <div class="flex items-center gap-2.5">
          <p class="text-sm font-bold text-slate-700">${sanitize(u.username)}</p>
          ${isMe ? '<span class="text-[10px] bg-indigo-500 text-white px-2 py-1 rounded-full font-bold uppercase">You</span>' : ''}
        </div>
        <p class="text-xs text-slate-400 mt-0.5">${sanitize(u.full_name)}</p>
        ${role === 'OWNER' && u.invited_by_name ? `<p class="text-[10px] text-slate-400 mt-0.5">By: ${sanitize(u.invited_by_name)}</p>` : ''}
      </td>
      <td class="p-4">${u.role === 'OWNER' ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200">OWNER</span>' : u.role === 'ADMIN' ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">ADMIN</span>' : '<span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">RESELLER</span>'}</td>
      <td class="p-4"><span class="text-sm font-bold text-slate-700"><i class="bi bi-wallet2 text-amber-500 mr-1.5"></i> ${u.balance.toLocaleString()}</span></td>
      <td class="p-4 text-xs text-slate-500">${u.validity ? new Date(u.validity).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '<span class="text-emerald-500 font-bold">Lifetime</span>'}</td>
      <td class="p-4 pr-6">
        <div class="flex items-center justify-center gap-2">
          <button onclick="openBalanceModal(${u.id}, 'add', '${sanitize(u.username)}')" class="action-btn w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center text-lg" title="Add Balance"><i class="bi bi-plus"></i></button>
          <button onclick="openBalanceModal(${u.id}, 'deduct', '${sanitize(u.username)}')" class="action-btn w-10 h-10 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white flex items-center justify-center text-lg" title="Deduct Balance"><i class="bi bi-dash"></i></button>
          ${!isMe ? `<form method="POST" class="inline"><input type="hidden" name="action" value="toggle_block"><input type="hidden" name="target_id" value="${u.id}">
            <button type="submit" class="action-btn px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${u.is_blocked ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'}">
              <i class="bi ${u.is_blocked ? 'bi-lock-fill' : 'bi-unlock-fill'} text-sm"></i> ${u.is_blocked ? 'Unblock' : 'Block'}
            </button></form>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  const content = `
<style>.clay-card{background:linear-gradient(145deg,#FFFFFF,#F1F5F9);box-shadow:10px 10px 20px rgba(0,0,0,0.07),-10px -10px 20px rgba(255,255,255,0.95);border:1px solid rgba(255,255,255,0.8)}.action-btn{transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);box-shadow:3px 3px 8px rgba(0,0,0,0.08),-3px -3px 8px rgba(255,255,255,0.95)}.action-btn:hover{transform:scale(1.15)}</style>

<div class="max-w-6xl mx-auto space-y-6">
  <div class="rounded-3xl p-8 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl"><i class="bi bi-people-fill"></i></div>
      <div><h2 class="text-3xl font-black text-white">User Management</h2><p class="text-white/70 text-sm mt-0.5">${role === 'OWNER' ? 'Manage Admins & Resellers' : 'Manage your Resellers'}</p></div>
    </div>
    <div class="bg-white/20 backdrop-blur rounded-2xl px-5 py-3 text-white text-base font-bold">${usersList.length} Users</div>
  </div>

  ${flashSuccess ? `<div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-base font-bold flex items-center shadow-sm"><i class="bi bi-check-circle-fill mr-3 text-xl"></i> ${sanitize(flashSuccess)}</div>` : ''}
  ${flashError ? `<div class="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-base font-bold flex items-center shadow-sm"><i class="bi bi-exclamation-triangle-fill mr-3 text-xl"></i> ${sanitize(flashError)}</div>` : ''}

  <div class="clay-card rounded-3xl overflow-hidden p-2">
    <div class="overflow-x-auto rounded-2xl">
      <table class="w-full text-left">
        <thead><tr class="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
          <th class="p-4 pl-6">ID</th><th class="p-4">User</th><th class="p-4">Role</th><th class="p-4">Balance</th><th class="p-4">Validity</th><th class="p-4 text-center pr-6">Actions</th>
        </tr></thead>
        <tbody class="text-sm divide-y divide-slate-100">
          ${usersHtml || `<tr><td colspan="6" class="p-10 text-center text-slate-400 text-base">No users found</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
</div>

<div id="balanceModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 hidden items-center justify-center">
  <div class="bg-white rounded-3xl w-full max-w-md mx-4 shadow-2xl border border-indigo-200">
    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-3xl">
      <h3 class="font-bold text-indigo-900 text-base" id="modalTitle">Manage Balance</h3>
      <button onclick="closeBalanceModal()" class="text-slate-400 hover:text-red-500 text-xl"><i class="bi bi-x-lg"></i></button>
    </div>
    <form method="POST" action="/users" class="p-6 space-y-4">
      <input type="hidden" name="action" id="modalAction"><input type="hidden" name="target_id" id="modalUserId">
      <p class="text-sm text-slate-500">User: <span id="modalUsernameDisplay" class="font-bold text-indigo-600"></span></p>
      <div><label class="text-xs font-bold text-slate-600 block mb-1.5">Amount</label><input type="number" name="amount" min="1" required class="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-bold focus:border-indigo-500 outline-none" placeholder="Enter amount"></div>
      <button type="submit" id="modalSubmitBtn" class="w-full py-3 rounded-xl text-white text-base font-bold"></button>
    </form>
  </div>
</div>

<script>
function openBalanceModal(userId,type,username){const m=document.getElementById('balanceModal');document.getElementById('modalAction').value=type==='add'?'add_balance':'deduct_balance';document.getElementById('modalUserId').value=userId;document.getElementById('modalUsernameDisplay').textContent=username;const t=document.getElementById('modalTitle');const sb=document.getElementById('modalSubmitBtn');if(type==='add'){t.innerHTML='<i class="bi bi-plus-circle text-emerald-500 mr-2"></i> Add Balance';sb.textContent='ADD BALANCE';sb.className='w-full py-3 rounded-xl text-white text-base font-bold bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'}else{t.innerHTML='<i class="bi bi-dash-circle text-orange-500 mr-2"></i> Deduct Balance';sb.textContent='DEDUCT BALANCE';sb.className='w-full py-3 rounded-xl text-white text-base font-bold bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30'}m.classList.remove('hidden');m.classList.add('flex')}
function closeBalanceModal(){document.getElementById('balanceModal').classList.add('hidden');document.getElementById('balanceModal').classList.remove('flex')}
</script>`;

  return renderLayout(user, 'users', content);
}
