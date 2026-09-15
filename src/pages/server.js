import { renderLayout } from '../templates/layout.js';
import { sanitize } from '../auth.js';
import { fetchOne, fetchAll } from '../db.js';

export async function renderServer(env, user, query = {}) {
  const pc = user.panel_code;
  const flashMsg = query.msg || '';

  const mData = await fetchOne(env.DB, 'SELECT is_active, reason FROM mod_maintenance WHERE panel_code = ?', [pc]);
  const isMaintenance = mData ? mData.is_active : 0;
  const mReason = mData ? mData.reason : 'Server is updating. Please wait...';

  const settingsRows = await fetchAll(env.DB, 'SELECT setting_name, setting_value FROM mod_settings WHERE panel_code = ?', [pc]);
  const settings = {};
  settingsRows.forEach(r => settings[r.setting_name] = r.setting_value);
  const get = (k, d) => settings[k] || d;

  const features = ['ESP', 'Item', 'AIM', 'SilentAim', 'BulletTrack', 'Floating', 'Memory', 'Setting'];

  const content = `
<style>.clay-card{background:linear-gradient(145deg,#FFFFFF,#F1F5F9);box-shadow:10px 10px 20px rgba(0,0,0,0.07),-10px -10px 20px rgba(255,255,255,0.95);border:1px solid rgba(255,255,255,0.8)}.clay-input{background:linear-gradient(145deg,#F8FAFC,#E2E8F0);box-shadow:inset 3px 3px 8px rgba(0,0,0,0.06),inset -3px -3px 8px rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.8);transition:all 0.3s ease}.clay-input:focus{background:#FFF;box-shadow:inset 2px 2px 6px rgba(99,102,241,0.08),0 0 0 3px rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);outline:none}</style>

<div class="max-w-6xl mx-auto space-y-6">
  <div class="rounded-3xl p-8 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20 flex items-center justify-between">
    <div class="flex items-center gap-4"><div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl"><i class="bi bi-hdd-fill"></i></div><div><h2 class="text-3xl font-black text-white">Server Control Room</h2><p class="text-white/70 text-sm mt-0.5">Remotely configure your C++ Mod Loader</p></div></div>
    <div class="bg-white/20 backdrop-blur rounded-2xl px-5 py-3 text-white text-sm font-bold"><i class="bi bi-hdd-network"></i> ${sanitize(pc)}</div>
  </div>

  ${flashMsg ? `<div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-base font-bold flex items-center shadow-sm"><i class="bi bi-check-circle-fill mr-3 text-xl"></i> Configuration updated!</div>` : ''}

  <form method="POST" action="/server" class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 space-y-6">
        <div class="clay-card rounded-3xl p-5">
          <h3 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2"><i class="bi bi-power text-red-500"></i> Emergency Status</h3>
          <div class="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
            <div><p class="font-bold text-slate-700 text-sm">Maintenance Mode</p><p class="text-xs text-slate-500">Block all logins</p></div>
            <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" name="maintenance_mode" class="sr-only peer" ${isMaintenance ? 'checked' : ''}><div class="w-12 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 shadow-inner"></div></label>
          </div>
          <div><label class="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Offline Message</label><textarea name="maintenance_reason" rows="3" class="clay-input w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-700">${sanitize(mReason)}</textarea></div>
        </div>

        <div class="clay-card rounded-3xl p-5">
          <h3 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2"><i class="bi bi-key text-yellow-500"></i> License Key</h3>
          <div><label class="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Static License</label>
          <div class="flex gap-2"><input type="text" name="license_key" id="license_key" value="${sanitize(get('license_key', ''))}" class="clay-input flex-1 px-4 py-3 rounded-xl text-sm font-mono font-bold text-slate-700"><button type="button" onclick="generateLicense()" class="px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-sm font-bold shrink-0"><i class="bi bi-shuffle"></i></button></div>
          <p class="text-[10px] text-slate-400 mt-1">Used for token generation in C++ mod</p></div>
        </div>

        <div class="clay-card rounded-3xl p-5">
          <h3 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2"><i class="bi bi-person-badge text-blue-500"></i> Mod Profile</h3>
          <div class="space-y-3">
            <div><label class="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Mod Name</label><input type="text" name="modname" value="${sanitize(get('modname', 'YUVI MOD'))}" class="clay-input w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700"></div>
            <div><label class="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Mod Status</label><input type="text" name="mod_status" value="${sanitize(get('mod_status', 'Online'))}" class="clay-input w-full px-4 py-3 rounded-xl text-sm font-semibold text-emerald-600"></div>
            <div><label class="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Credits / Watermark</label><input type="text" name="credit" value="${sanitize(get('credit', 'Yuvi Panel'))}" class="clay-input w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700"></div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="clay-card rounded-3xl p-6 h-full">
          <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
            <div><h3 class="font-bold text-lg text-slate-800">Remote Features Switch</h3><p class="text-xs text-slate-500 font-medium">Turn features ON/OFF globally without updating APK</p></div>
            <i class="bi bi-cpu-fill text-3xl text-purple-200"></i>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${features.map(feat => {
              const isOn = get(feat, 'on') === 'on';
              return `<div class="flex items-center justify-between bg-slate-50/70 p-4 rounded-xl border border-slate-200 hover:border-purple-300 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl ${isOn ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'} flex items-center justify-center transition-colors"><i class="bi bi-shield-check text-lg"></i></div>
                  <span class="font-bold text-slate-700 tracking-wide text-sm">${feat}</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" name="${feat}" class="sr-only peer" ${isOn ? 'checked' : ''}><div class="w-12 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div></label>
              </div>`;
            }).join('')}
          </div>
          <div class="mt-6 pt-5 border-t border-slate-100">
            <button type="submit" class="w-full py-4 rounded-2xl font-black text-lg text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all shadow-[0_10px_30px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2">
              <i class="bi bi-cloud-upload-fill"></i> Deploy Remote Config
            </button>
          </div>
        </div>
      </div>
    </div>
  </form>
</div>

<script>function generateLicense(){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let l='';for(let i=0;i<32;i++)l+=c.charAt(Math.floor(Math.random()*c.length));document.getElementById('license_key').value=l}</script>`;

  return renderLayout(user, 'server', content);
}
