import { sanitize } from '../auth.js';

export async function renderResetDevice(env, query = {}) {
  let content = '';
  if (query.success) {
    content = `
      <div class="alert-box alert-success">
        <i class="bi bi-check-circle-fill text-lg shrink-0"></i> 
        <div><p class="font-bold">Device reset successful! You can now login on a new device.</p></div>
      </div>
      <div class="text-center mt-4">
        <a href="/login" class="btn-premium" style="background:linear-gradient(135deg,#6366F1,#A855F7);box-shadow:0 10px 30px rgba(99,102,241,0.35);text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;">
          Back to Login <i class="bi bi-box-arrow-in-right"></i>
        </a>
      </div>`;
  } else if (query.error) {
    const errorMsg = query.error === 'cooldown' ? 'Device reset already used! Next reset available at: ' + (query.next || 'later') :
                     query.error === 'blocked' ? 'Account suspended by Admin/Owner.' :
                     'Invalid username or password.';
    content = `
      <div class="alert-box alert-error">
        <i class="bi bi-x-circle-fill text-lg shrink-0"></i> 
        <div><p class="font-bold">Reset Failed</p><p class="text-xs mt-1">${sanitize(errorMsg)}</p></div>
      </div>
      <div class="text-center mt-4">
        <a href="/login" class="btn-premium" style="background:linear-gradient(135deg,#6366F1,#A855F7);box-shadow:0 10px 30px rgba(99,102,241,0.35);text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;">
          <i class="bi bi-arrow-left"></i> Back to Login
        </a>
      </div>`;
  } else {
    content = `
      <form method="POST" action="/reset-device" class="space-y-3.5">
        <div><label class="label-dark">Username</label><input type="text" name="username" required class="clay-input" placeholder="Enter your username"></div>
        <div><label class="label-dark">Password</label><input type="password" name="password" required class="clay-input" placeholder="Enter your password"></div>
        <div class="alert-box alert-warning"><i class="bi bi-info-circle-fill text-lg shrink-0"></i> Reset available once every 24 hours</div>
        <button type="submit" class="btn-premium"><i class="bi bi-arrow-repeat"></i> Reset Device</button>
      </form>
      <div class="my-4 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
      <div class="text-center"><a href="/login" class="text-xs text-slate-500 hover:text-indigo-600 font-bold transition-colors"><i class="bi bi-arrow-left"></i> Back to Login</a></div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Reset Device - YUVI PANEL</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#EEF2FF 0%,#E0E7FF 25%,#F5F3FF 50%,#FDF2F8 75%,#EFF6FF 100%);min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;overflow:hidden}
        body::before{content:'';position:fixed;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 40%,rgba(249,115,22,0.06) 0%,transparent 50%),radial-gradient(circle at 70% 60%,rgba(236,72,153,0.06) 0%,transparent 50%);animation:auroraMove 20s ease-in-out infinite alternate;z-index:0;pointer-events:none}
        @keyframes auroraMove{0%{transform:translate(0,0)}100%{transform:translate(-5%,5%)}}
        .blob-1{position:fixed;top:-10%;left:-10%;width:400px;height:400px;background:rgba(249,115,22,0.1);border-radius:50%;filter:blur(100px);z-index:0;pointer-events:none}
        .blob-2{position:fixed;bottom:-10%;right:-10%;width:400px;height:400px;background:rgba(236,72,153,0.08);border-radius:50%;filter:blur(100px);z-index:0;pointer-events:none}
        .glass-card{background:rgba(255,255,255,0.85);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,0.8);box-shadow:0 20px 60px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.9)}
        .clay-input{width:100%;background:linear-gradient(145deg,#F8FAFC,#E2E8F0);box-shadow:inset 3px 3px 8px rgba(0,0,0,0.06),inset -3px -3px 8px rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.8);border-radius:16px;padding:14px 16px;color:#1E293B;font-size:16px;font-weight:500;transition:all 0.3s ease;outline:none}
        .clay-input:focus{background:#FFF;box-shadow:inset 2px 2px 6px rgba(249,115,22,0.08),0 0 0 4px rgba(249,115,22,0.1);border-color:rgba(249,115,22,0.3)}
        .clay-input::placeholder{color:#94A3B8}
        .btn-premium{width:100%;padding:16px;border-radius:16px;font-weight:800;font-size:15px;color:white;background:linear-gradient(135deg,#F97316,#EC4899);background-size:200% 200%;animation:gradientShift 3s ease infinite;border:none;cursor:pointer;box-shadow:0 10px 30px rgba(249,115,22,0.35),inset 0 1px 0 rgba(255,255,255,0.25);transition:all 0.3s;display:flex;align-items:center;justify-content:center;gap:8px}
        .btn-premium:active{transform:scale(0.97)}
        @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .alert-box{padding:14px 16px;border-radius:14px;font-size:13px;font-weight:600;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;line-height:1.5}
        .alert-error{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#DC2626}
        .alert-success{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);color:#059669}
        .alert-warning{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);color:#D97706}
        .label-dark{display:block;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;margin-left:2px}
    </style>
</head>
<body>
    <div class="blob-1"></div>
    <div class="blob-2"></div>
    <div class="w-full max-w-[400px] relative z-10">
        <div class="text-center mb-5">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xl text-white mx-auto mb-2 shadow-[0_10px_30px_rgba(249,115,22,0.4)]">
                <i class="bi bi-phone-flip"></i>
            </div>
            <h1 class="text-lg font-black tracking-wide">
                <span class="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">Reset Device</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1 font-medium">Switch to a new device</p>
        </div>
        <div class="glass-card p-6 rounded-[28px]">
            ${content}
        </div>
    </div>
</body>
</html>`;
}
