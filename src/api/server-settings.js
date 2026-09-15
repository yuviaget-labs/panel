import { sanitize } from '../auth.js';
import { fetchOne, fetchAll, execute } from '../db.js';
import { setModSetting } from '../db.js';
import { verifyJWT } from '../auth.js';

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export async function handleServerSettings(request, env, user) {
  try {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') return redirect('/dashboard');

    const formData = await request.formData();
    const panelCode = user.panel_code;

    // Update maintenance mode
    const isMaintenance = formData.get('maintenance_mode') === 'on' ? 1 : 0;
    const maintenanceReason = sanitize(formData.get('maintenance_reason') || 'Server is updating. Please wait...');
    await execute(env.DB,
      'INSERT INTO mod_maintenance (panel_code, is_active, reason) VALUES (?, ?, ?) ON CONFLICT(panel_code) DO UPDATE SET is_active = ?, reason = ?',
      [panelCode, isMaintenance, maintenanceReason, isMaintenance, maintenanceReason]
    );

    // Update mod settings
    const settings = ['modname', 'mod_status', 'credit', 'license_key'];
    for (const key of settings) {
      const val = sanitize(formData.get(key) || '');
      await setModSetting(env.DB, panelCode, key, val);
    }

    // Update feature toggles
    const features = ['ESP', 'Item', 'AIM', 'SilentAim', 'BulletTrack', 'Floating', 'Memory', 'Setting'];
    for (const feat of features) {
      const val = formData.get(feat) === 'on' ? 'on' : 'off';
      await setModSetting(env.DB, panelCode, feat, val);
    }

    return redirect('/server?msg=updated');
  } catch (err) {
    return redirect('/server?error=1');
  }
}

export async function handleSettingsUpdate(request, env, user) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') || '';

    if (action === 'update_password') {
      const currentPassword = formData.get('current_password') || '';
      const newPassword = formData.get('new_password') || '';

      const userData = await fetchOne(env.DB, 'SELECT password FROM users WHERE id = ?', [user.id]);
      if (!userData) return redirect('/settings?error=1');

      // Simple password verification (hash comparison)
      const encoder = new TextEncoder();
      const currentHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(currentPassword)))).map(b => b.toString(16).padStart(2, '0')).join('');

      if (currentHash !== userData.password) {
        return redirect('/settings?error=wrong_password');
      }

      const newHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(newPassword)))).map(b => b.toString(16).padStart(2, '0')).join('');
      await execute(env.DB, 'UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
      return redirect('/settings?msg=password_updated');
    }

    if (action === 'update_branding' && user.role === 'OWNER') {
      const panelName = sanitize(formData.get('panel_name') || '');
      if (panelName) {
        await setModSetting(env.DB, user.panel_code, 'panel_name', panelName);
        return redirect('/settings?msg=branding_updated');
      }
    }

    return redirect('/settings');
  } catch (err) {
    return redirect('/settings?error=1');
  }
}
