import { sanitize } from '../auth.js';

function getNavClass(path, current) {
  const base = 'nav-link';
  if (path === current) return base + ' active';
  return base;
}

const roleColors = {
  'OWNER': 'background: linear-gradient(135deg, #8B5CF6, #6366F1); box-shadow: inset -2px -2px 6px rgba(0,0,0,0.2), inset 2px 2px 6px rgba(255,255,255,0.2), 0 8px 16px rgba(147,51,234,0.3);',
  'ADMIN': 'background: linear-gradient(135deg, #3B82F6, #06B6D4); box-shadow: inset -2px -2px 6px rgba(0,0,0,0.2), inset 2px 2px 6px rgba(255,255,255,0.2), 0 8px 16px rgba(59,130,246,0.3);',
  'RESELLER': 'background: linear-gradient(135deg, #FB923C, #EC4899); box-shadow: inset -2px -2px 6px rgba(0,0,0,0.2), inset 2px 2px 6px rgba(255,255,255,0.2), 0 8px 16px rgba(249,115,22,0.3);',
};

export function renderLayout(user, currentRoute, content, panelName = 'YUVI PANEL') {
  const myIconColor = roleColors[user.role] || 'background: #94A3B8;';
  const initial = (user.username || 'U').charAt(0).toUpperCase();
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const isOwner = user.role === 'OWNER';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitize(panelName)} - Panel</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <script>
        tailwind.config = {
            theme: { extend: { fontFamily: { sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'] } } }
        }
    </script>
    <style>
        * { -webkit-tap-highlight-color: transparent; }
        body { 
            background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 25%, #F5F3FF 50%, #FDF2F8 75%, #EFF6FF 100%);
            background-attachment: fixed; position: relative;
        }
        body::before {
            content: ''; position: fixed; top: -50%; left: -50%;
            width: 200%; height: 200%;
            background: radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                        radial-gradient(circle at 70% 60%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
                        radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.06) 0%, transparent 50%);
            animation: auroraMove 20s ease-in-out infinite alternate;
            z-index: 0; pointer-events: none;
        }
        @keyframes auroraMove { 0%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-5%,5%) rotate(5deg)} 100%{transform:translate(5%,-5%) rotate(-5deg)} }
        .glass-sidebar{background:linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.55));backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border-right:1px solid rgba(255,255,255,0.6);box-shadow:8px 0 32px rgba(0,0,0,0.04),inset -1px 0 0 rgba(255,255,255,0.5)}
        .glass-header{background:linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.65));backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,0.6);box-shadow:0 4px 20px rgba(0,0,0,0.03),inset 0 1px 0 rgba(255,255,255,0.8)}
        .glass-card{background:linear-gradient(135deg,rgba(255,255,255,0.85),rgba(255,255,255,0.6));backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:24px;box-shadow:0 8px 32px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.7)}
        .nav-link{position:relative;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;transition:all 0.3s;font-weight:500;margin-bottom:4px;overflow:hidden}
        .nav-link.active{color:white;box-shadow:inset -3px -3px 8px rgba(0,0,0,0.2),inset 3px 3px 8px rgba(255,255,255,0.1),0 8px 20px rgba(99,102,241,0.4);background:linear-gradient(135deg,#6366F1,#A855F7,#EC4899);font-weight:600}
        .nav-link:not(.active){color:#475569}
        .nav-link:not(.active):hover{color:#4F46E5}
        .active-indicator{position:absolute;right:-1px;top:50%;transform:translateY(-50%);width:3px;height:60%;background:linear-gradient(180deg,#6366F1,#A855F7);border-radius:3px;box-shadow:0 0 10px rgba(99,102,241,0.5)}
        .ripple{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%);transform:scale(0);animation:rippleEffect 0.6s linear;pointer-events:none}
        @keyframes rippleEffect{to{transform:scale(4);opacity:0}}
        ::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:rgba(255,255,255,0.3);border-radius:10px}::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(99,102,241,0.4),rgba(168,85,247,0.4));border-radius:10px;border:2px solid rgba(255,255,255,0.5)}
        #custom-alert{transition:opacity 0.25s ease,visibility 0.25s ease}#custom-alert-box{transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1)}
    </style>
</head>
<body class="text-slate-800 flex h-screen overflow-hidden selection:bg-indigo-500/20 selection:text-indigo-900 relative z-10">

    <!-- Custom Alert -->
    <div id="custom-alert" class="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-md invisible opacity-0 flex items-center justify-center">
        <div id="custom-alert-box" class="glass-card p-8 max-w-sm w-full mx-4 transform scale-90 border border-white relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 text-red-500 mx-auto mb-4">
                <i class="bi bi-exclamation-triangle-fill text-2xl"></i>
            </div>
            <h3 class="text-xl font-extrabold text-center text-slate-800 mb-2">Are you sure?</h3>
            <p id="custom-alert-message" class="text-center text-slate-500 text-sm mb-6">This action cannot be undone.</p>
            <div class="flex gap-3">
                <button onclick="closeCustomAlert()" class="w-1/2 px-4 py-3 bg-white/70 hover:bg-white text-slate-700 font-bold rounded-xl transition-all">Cancel</button>
                <button onclick="executeCustomAlert()" class="w-1/2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/30">Confirm</button>
            </div>
        </div>
    </div>

    <div id="sidebar-overlay" onclick="toggleSidebar()" class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 hidden md:hidden"></div>

    <!-- Sidebar -->
    <aside id="sidebar" class="w-72 glass-sidebar flex flex-col absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-50">
        <div class="h-20 flex items-center justify-between px-6 border-b border-white/50 relative">
            <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5"></div>
            <h1 class="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-3 truncate relative z-10">
                <div class="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
                    <i class="bi bi-shield-check text-lg"></i>
                </div>
                <span class="truncate uppercase bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">${sanitize(panelName)}</span>
            </h1>
            <button onclick="toggleSidebar()" class="md:hidden text-slate-400 hover:text-slate-600 text-2xl relative z-10"><i class="bi bi-x-lg"></i></button>
        </div>
        
        <nav class="flex-1 py-6 px-4 overflow-y-auto space-y-1 relative">
            <a href="/dashboard" class="${getNavClass('dashboard', currentRoute)}" onclick="createRipple(event, this)">
                ${currentRoute === 'dashboard' ? '<span class="active-indicator"></span>' : ''}
                <i class="bi bi-grid-1x2-fill text-lg w-6 text-center relative z-10"></i> Dashboard
            </a>
            <a href="/generate" class="${getNavClass('generate', currentRoute)}" onclick="createRipple(event, this)">
                ${currentRoute === 'generate' ? '<span class="active-indicator"></span>' : ''}
                <i class="bi bi-key-fill text-lg w-6 text-center relative z-10"></i> Generate Keys
            </a>
            <a href="/keys" class="${getNavClass('keys', currentRoute)}" onclick="createRipple(event, this)">
                ${currentRoute === 'keys' ? '<span class="active-indicator"></span>' : ''}
                <i class="bi bi-view-list text-lg w-6 text-center relative z-10"></i> Key Manager
            </a>
            
            ${isOwnerOrAdmin ? `
                <div class="my-4 border-t border-white/50 mx-2"></div>
                <div class="px-3 mb-2 mt-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider relative z-10">Management</div>
                
                <a href="/users" class="${getNavClass('users', currentRoute)}" onclick="createRipple(event, this)">
                    ${currentRoute === 'users' ? '<span class="active-indicator"></span>' : ''}
                    <i class="bi bi-people-fill text-lg w-6 text-center relative z-10"></i> User Management
                </a>

                <div class="my-4 border-t border-white/50 mx-2"></div>
                <div class="px-3 mb-2 mt-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider relative z-10">System</div>

                <a href="/server" class="${getNavClass('server', currentRoute)}" onclick="createRipple(event, this)">
                    ${currentRoute === 'server' ? '<span class="active-indicator"></span>' : ''}
                    <i class="bi bi-hdd-fill text-lg w-6 text-center relative z-10"></i> Server & Mod
                </a>
            ` : ''}
            
            <div class="my-4 border-t border-white/50 mx-2"></div>
            <a href="/settings" class="${getNavClass('settings', currentRoute)}" onclick="createRipple(event, this)">
                ${currentRoute === 'settings' ? '<span class="active-indicator"></span>' : ''}
                <i class="bi bi-gear-fill text-lg w-6 text-center relative z-10"></i> Settings
            </a>
        </nav>
        
        <div class="p-4 border-t border-white/50">
            <div class="glass-card p-3 text-center">
                <p class="text-[10px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 uppercase tracking-wider">Premium Panel</p>
                <p class="text-[9px] text-slate-400 mt-0.5">v2.0 Claymorphic UI</p>
            </div>
        </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-y-auto relative w-full z-10">
        <header class="h-16 md:h-20 glass-header sticky top-0 z-30 flex items-center justify-between px-4 lg:px-10 relative">
            <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            
            <div class="flex items-center gap-3 z-10 w-1/4">
                <button onclick="toggleSidebar()" class="md:hidden text-slate-600 hover:text-indigo-600 transition-all bg-white/70 backdrop-blur p-2.5 rounded-xl border border-white shadow-sm">
                    <i class="bi bi-list text-2xl"></i>
                </button>
                <div class="hidden md:flex flex-col">
                    <span class="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Workspace ID</span>
                    <h2 class="font-bold text-slate-700 text-[15px] flex items-center gap-2">
                        <span class="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 px-3 py-1 rounded-lg border border-indigo-100 font-mono text-sm">${sanitize(user.panel_code || '')}</span>
                    </h2>
                </div>
            </div>
            
            <div class="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center z-0 w-1/2 max-w-[200px] md:max-w-xs text-center">
                <h2 class="text-base md:text-xl font-black tracking-[0.1em] md:tracking-[0.15em] uppercase truncate w-full">
                    <span class="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">${sanitize(panelName)}</span>
                </h2>
                <div class="h-1 w-10 md:w-14 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full mt-1 shadow-lg shadow-purple-500/30 opacity-80 mx-auto"></div>
            </div>

            <div class="flex items-center justify-end gap-3 z-10 w-1/4">
                <div class="hidden sm:flex flex-col items-end mr-1">
                    <span class="text-sm font-bold text-slate-700">${sanitize(user.username || 'User')}</span>
                    <span class="text-[10px] font-extrabold tracking-widest bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent uppercase">${user.role}</span>
                </div>
                <div class="relative group">
                    <div class="w-11 h-11 md:w-12 md:h-12 rounded-2xl text-white flex items-center justify-center font-bold text-lg border-2 border-white/80 cursor-pointer transition-all duration-300 group-hover:scale-110 group-hover:rotate-3" style="${myIconColor}">
                        ${initial}
                    </div>
                    <div class="absolute right-0 mt-3 w-56 glass-card border border-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right scale-90 group-hover:scale-100 shadow-xl">
                        <div class="p-3">
                            <div class="px-4 py-3 border-b border-white/50 mb-2">
                                <p class="font-bold text-slate-800 text-sm">${sanitize(user.username || 'User')}</p>
                                <p class="text-xs text-slate-500">${sanitize(user.panel_code || '')}</p>
                            </div>
                            <a href="/settings" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all font-medium">
                                <i class="bi bi-gear"></i> Settings
                            </a>
                            <div class="border-t border-white/50 my-2"></div>
                            <a href="/logout" class="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium">
                                <i class="bi bi-box-arrow-right"></i> Sign Out
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>
        
        <main class="p-4 md:p-8 lg:p-10 pb-20 relative z-10">
            ${content}
        </main>
    </div>

    <script>
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('-translate-x-full');
            document.getElementById('sidebar-overlay').classList.toggle('hidden');
        }
        function createRipple(event, element) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
            ripple.style.top = event.clientY - rect.top - size / 2 + 'px';
            element.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
        let formToSubmit = null;
        function customConfirm(event, message) {
            event.preventDefault();
            formToSubmit = event.target.closest('form');
            document.getElementById('custom-alert-message').innerText = message;
            const alertBg = document.getElementById('custom-alert');
            const alertBox = document.getElementById('custom-alert-box');
            alertBg.classList.remove('invisible', 'opacity-0');
            alertBg.classList.add('visible', 'opacity-100');
            alertBox.classList.remove('scale-90');
            alertBox.classList.add('scale-100');
        }
        function closeCustomAlert() {
            const alertBg = document.getElementById('custom-alert');
            const alertBox = document.getElementById('custom-alert-box');
            alertBox.classList.remove('scale-100');
            alertBox.classList.add('scale-90');
            alertBg.classList.remove('opacity-100');
            alertBg.classList.add('opacity-0');
            setTimeout(() => alertBg.classList.add('invisible'), 250);
            formToSubmit = null;
        }
        function executeCustomAlert() {
            if (formToSubmit) formToSubmit.submit();
            closeCustomAlert();
        }
        function copyToClipboard(text, element) {
            navigator.clipboard.writeText(text).then(() => {
                const originalHTML = element.innerHTML;
                element.innerHTML = '<i class="bi bi-check2 text-emerald-500"></i> Copied';
                element.classList.add('text-emerald-600', 'font-bold');
                setTimeout(() => { element.innerHTML = originalHTML; element.classList.remove('text-emerald-600', 'font-bold'); }, 2000);
            });
        }
    </script>
</body>
</html>`;
}
