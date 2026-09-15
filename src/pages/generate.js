import { renderLayout } from '../templates/layout.js';
import { sanitize } from '../auth.js';
import { fetchOne } from '../db.js';

export async function renderGenerate(env, user, query = {}) {
  const isOwner = user.role === 'OWNER';
  let myBal = 0;
  let myBalText = 'Unlimited';

  if (!isOwner) {
    const u = await fetchOne(env.DB, 'SELECT balance FROM users WHERE id = ?', [user.id]);
    myBal = u ? u.balance : 0;
    myBalText = myBal.toLocaleString() + ' Rs';
  }

  const successMsg = query.success ? `${query.count || 0} Keys generated successfully!` : '';
  const errorMsg = query.error === 'insufficient' ? 'Insufficient balance!' : query.error === '1' ? 'Error generating keys.' : '';
  const keysParam = query.keys ? decodeURIComponent(query.keys) : '';

  const content = `
<style>
    .clay-input{background:linear-gradient(145deg,#F8FAFC,#E2E8F0);border-radius:16px;box-shadow:inset 3px 3px 8px rgba(0,0,0,0.06),inset -3px -3px 8px rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.8);transition:all 0.3s ease}
    .clay-input:focus{background:linear-gradient(145deg,#FFFFFF,#F1F5F9);box-shadow:inset 3px 3px 8px rgba(99,102,241,0.08),inset -3px -3px 8px rgba(255,255,255,1),0 0 0 3px rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);outline:none}
    .btn-premium-generate{background:linear-gradient(135deg,#6366F1,#A855F7,#EC4899);background-size:200% 200%;color:white;animation:gradientShift 3s ease infinite;box-shadow:0 10px 30px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.3);transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1)}
    .btn-premium-generate:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 15px 40px rgba(99,102,241,0.5),inset 0 1px 0 rgba(255,255,255,0.4)}
    .btn-premium-generate:disabled{opacity:0.5;cursor:not-allowed;transform:none}
    @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    .price-animate{animation:pricePulse 0.3s ease}
    @keyframes pricePulse{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
    .insufficient-balance{animation:shake 0.5s ease;border-color:#ef4444 !important}
    @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
</style>

<div class="max-w-4xl mx-auto space-y-6">
    <div class="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-[0_20px_60px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]">
        <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px]"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><h2 class="text-3xl font-black text-white mb-1">Key Generator</h2><p class="text-white/80 text-sm font-medium">Create secure access tokens instantly</p></div>
            <div class="flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/20">
                <i class="bi bi-wallet2 text-2xl text-white"></i>
                <div><p class="text-[10px] text-white/70 font-bold uppercase tracking-wider">Balance</p><p class="text-white font-extrabold" id="headerBalance">${myBalText}</p></div>
            </div>
        </div>
    </div>

    ${successMsg && keysParam ? `
    <div class="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-[0_8px_32px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400"></div>
        <h3 class="font-bold text-emerald-800 mb-4 text-lg flex items-center"><i class="bi bi-check-circle-fill mr-2 text-emerald-500"></i> ${sanitize(successMsg)}</h3>
        <div class="flex flex-col sm:flex-row gap-3">
            <button onclick="copyKeysData()" id="copyBtn" class="flex-1 bg-white/80 border-2 border-emerald-200 text-emerald-700 hover:bg-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"><i class="bi bi-copy"></i> Copy All Keys</button>
            <button onclick="downloadKeysData()" class="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"><i class="bi bi-download"></i> Download keys.txt</button>
        </div>
        <textarea id="hiddenKeysArea" class="hidden">${keysParam.replace(/\n/g, '&#10;')}</textarea>
    </div>` : ''}

    ${errorMsg ? `
    <div class="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200/50 shadow-[0_8px_32px_rgba(239,68,68,0.15)]">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30"><i class="bi bi-exclamation-triangle-fill"></i></div>
            <p class="text-red-700 font-semibold">${sanitize(errorMsg)}</p>
        </div>
    </div>` : ''}

    <div class="rounded-3xl p-6 md:p-8 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <form method="POST" action="/generate" class="space-y-6" id="generateForm">
            <div id="custom_key_div">
                <label class="block text-sm font-extrabold text-slate-700 mb-2"><i class="bi bi-pencil-square text-indigo-500"></i> Custom Key <span class="text-slate-400 font-normal italic">(Leave empty for random)</span></label>
                <input type="text" name="custom_key" id="custom_key" class="clay-input w-full px-5 py-4 text-blue-900 font-mono placeholder-blue-300 uppercase" placeholder="e.g. VIP-YOURNAME">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div class="space-y-2">
                    <label class="block text-sm font-extrabold text-slate-700"><i class="bi bi-clock-history text-purple-500"></i> Duration</label>
                    <select name="duration" id="duration" class="clay-input w-full px-5 py-4 text-slate-700 font-medium" onchange="calculatePrice()">
                        <option value="2H">&#9889; 2 Hours</option><option value="1D" selected>&#128197; 1 Day</option><option value="3D">&#128197; 3 Days</option><option value="7D">&#128197; 7 Days</option><option value="15D">&#128197; 15 Days</option><option value="30D">&#128197; 30 Days</option><option value="60D">&#128197; 60 Days</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-extrabold text-slate-700"><i class="bi bi-phone text-pink-500"></i> Device Limit</label>
                    <input type="number" name="device_limit" id="device_limit" value="1" min="1" max="100" class="clay-input w-full px-5 py-4 text-slate-700 font-medium" onchange="calculatePrice()" oninput="calculatePrice()">
                </div>
            </div>
            <div class="p-5 rounded-2xl bg-gradient-to-br from-purple-50/50 to-pink-50/50 border border-purple-200/30">
                <div class="flex items-center justify-between">
                    <div><h4 class="font-extrabold text-slate-700"><i class="bi bi-layers text-purple-500"></i> Bulk Generation</h4><p class="text-xs text-slate-500">Generate multiple keys at once</p></div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="is_bulk" id="bulk_toggle" class="sr-only peer" onchange="toggleBulk()">
                        <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500 shadow-inner"></div>
                    </label>
                </div>
                <div id="bulk_container" class="mt-4 pt-4 border-t border-purple-200/30 hidden">
                    <label class="block text-sm font-extrabold text-slate-700 mb-2">Number of Keys to Generate</label>
                    <input type="number" name="bulk_amount" id="bulk_amount" value="10" min="2" max="1000" class="clay-input w-full px-5 py-4 text-slate-700 font-medium" onchange="calculatePrice()" oninput="calculatePrice()">
                    <p class="text-xs text-orange-500 mt-2"><i class="bi bi-info-circle-fill"></i> Custom Key input will be ignored in bulk mode.</p>
                </div>
            </div>
            <div id="priceDisplay" class="rounded-2xl p-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/50">
                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div><p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Cost</p><h3 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600" id="totalCost">${isOwner ? 'FREE' : myBal + ' Rs'}</h3></div>
                    <div class="text-right"><p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Breakdown</p><p class="text-sm font-semibold text-slate-700" id="priceBreakdown">1 Key x 1 Device x 10 Rs</p></div>
                </div>
                ${!isOwner ? `<div class="mt-3 pt-3 border-t border-indigo-200/50"><div class="flex items-center justify-between text-sm"><span class="font-bold text-slate-600">Remaining Balance:</span><span class="font-black" id="remainingBalance">${myBal.toLocaleString()} Rs</span></div></div>` : ''}
            </div>
            <button type="submit" id="generateBtn" class="btn-premium-generate w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2">
                <i class="bi bi-magic"></i> GENERATE NOW <i class="bi bi-arrow-right-circle-fill"></i>
            </button>
        </form>
    </div>
</div>

<script>
    const pricing={'2H':10,'1D':80,'3D':150,'7D':250,'15D':350,'30D':500,'60D':900};
    const isOwner=${isOwner};
    const currentBalance=${myBal};
    function toggleBulk(){const c=document.getElementById('bulk_toggle').checked;const bc=document.getElementById('bulk_container');const ck=document.getElementById('custom_key');if(c){bc.classList.remove('hidden');ck.value='';ck.disabled=true;ck.classList.add('opacity-50')}else{bc.classList.add('hidden');ck.disabled=false;ck.classList.remove('opacity-50')}calculatePrice()}
    function calculatePrice(){const d=document.getElementById('duration').value;const dl=parseInt(document.getElementById('device_limit').value)||1;const ib=document.getElementById('bulk_toggle').checked;const ba=parseInt(document.getElementById('bulk_amount').value)||1;const bp=pricing[d]||10;const kc=ib?ba:1;const cpk=bp*dl;const tc=cpk*kc;const te=document.getElementById('totalCost');const pb=document.getElementById('priceBreakdown');const rb=document.getElementById('remainingBalance');const gb=document.getElementById('generateBtn');const pd=document.getElementById('priceDisplay');te.classList.add('price-animate');setTimeout(()=>te.classList.remove('price-animate'),300);if(isOwner){te.textContent='FREE';pb.textContent=kc+' Key'+(kc>1?'s':'')+' x '+dl+' Device'+(dl>1?'s':'')+' x '+bp+' Rs'}else{te.textContent=tc+' Rs';pb.textContent=kc+' Key'+(kc>1?'s':'')+' x '+dl+' Device'+(dl>1?'s':'')+' x '+bp+' Rs';const rem=currentBalance-tc;rb.textContent=rem.toLocaleString()+' Rs';if(rem<0){rb.classList.add('text-red-500');pd.classList.add('insufficient-balance');gb.disabled=true;gb.innerHTML='<i class="bi bi-exclamation-triangle-fill"></i> INSUFFICIENT BALANCE'}else{rb.classList.remove('text-red-500');pd.classList.remove('insufficient-balance');gb.disabled=false;gb.innerHTML='<i class="bi bi-magic"></i> GENERATE NOW <i class="bi bi-arrow-right-circle-fill"></i>'}}}
    document.addEventListener('DOMContentLoaded',calculatePrice);
    function copyKeysData(){const t=document.getElementById('hiddenKeysArea').value;const b=document.getElementById('copyBtn');navigator.clipboard.writeText(t).then(()=>{const o=b.innerHTML;b.innerHTML='<i class="bi bi-check2-all"></i> Copied!';b.classList.add('bg-emerald-100','border-emerald-400');setTimeout(()=>{b.innerHTML=o;b.classList.remove('bg-emerald-100','border-emerald-400')},2000)})}
    function downloadKeysData(){const t=document.getElementById('hiddenKeysArea').value;const bl=new Blob([t],{type:'text/plain'});const u=URL.createObjectURL(bl);const a=document.createElement('a');a.href=u;a.download='YuviPanel_Keys_'+new Date().toISOString().slice(0,10)+'.txt';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)}
</script>`;

  return renderLayout(user, 'generate', content);
}
