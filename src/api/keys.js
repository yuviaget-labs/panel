import { sanitize, generateKeyString } from '../auth.js';
import { fetchOne, fetchAll, execute } from '../db.js';

const PRICING = { '2H': 10, '1D': 80, '3D': 150, '7D': 250, '15D': 350, '30D': 500, '60D': 900 };

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export async function handleGenerateKeys(request, env, user) {
  try {
    const formData = await request.formData();
    const duration = sanitize(formData.get('duration') || '1D');
    const deviceLimit = Math.max(1, parseInt(formData.get('device_limit') || '1'));
    const isBulk = formData.get('is_bulk') === 'on';
    const bulkAmount = isBulk ? Math.max(1, parseInt(formData.get('bulk_amount') || '10')) : 1;
    const customKey = sanitize(formData.get('custom_key') || '');

    const basePrice = PRICING[duration] || 10;
    const costPerKey = basePrice * deviceLimit;
    const totalCost = costPerKey * bulkAmount;

    // Check balance for non-owners
    if (user.role !== 'OWNER') {
      const u = await fetchOne(env.DB, 'SELECT balance FROM users WHERE id = ?', [user.id]);
      if (u.balance < totalCost) {
        return redirect('/generate?error=insufficient');
      }
    }

    const generated = [];
    let successCount = 0;

    for (let i = 0; i < bulkAmount; i++) {
      const keyVal = (!isBulk && customKey) ? customKey : generateKeyString(duration);
      try {
        await execute(env.DB,
          'INSERT INTO api_keys (key_value, duration, device_limit, panel_code, created_by) VALUES (?, ?, ?, ?, ?)',
          [keyVal, duration, deviceLimit, user.panel_code, user.id]
        );
        generated.push(keyVal);
        successCount++;
      } catch (e) {
        // Duplicate key
      }
    }

    if (successCount > 0 && user.role !== 'OWNER') {
      const actualDeduction = successCount * costPerKey;
      await execute(env.DB, 'UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?', [actualDeduction, user.id, actualDeduction]);
    }

    const keysParam = encodeURIComponent(generated.join('\n'));
    return redirect(`/generate?success=1&count=${successCount}&keys=${keysParam}`);
  } catch (err) {
    return redirect('/generate?error=1');
  }
}

export async function handleKeyListActions(request, env, user) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') || '';
    const panelCode = user.panel_code;

    // Bulk actions (OWNER only)
    if (action === 'delete_all' && user.role === 'OWNER') {
      await execute(env.DB, 'DELETE FROM api_keys WHERE panel_code = ?', [panelCode]);
      return redirect('/keys?msg=deleted_all');
    }
    if (action === 'delete_expired' && user.role === 'OWNER') {
      await execute(env.DB, "DELETE FROM api_keys WHERE panel_code = ? AND expires_at IS NOT NULL AND expires_at < datetime('now')", [panelCode]);
      return redirect('/keys?msg=deleted_expired');
    }
    if (action === 'extend_all' && user.role === 'OWNER') {
      const extendVal = parseInt(formData.get('extend_val') || '1');
      const extendUnit = formData.get('extend_unit') || 'D';
      if (extendVal > 0) {
        const interval = extendUnit === 'D' ? `${extendVal} days` : `${extendVal} hours`;
        await execute(env.DB, `UPDATE api_keys SET expires_at = datetime(expires_at, '+${extendVal} ${extendUnit === 'D' ? 'days' : 'hours'}') WHERE panel_code = ? AND expires_at IS NOT NULL`, [panelCode]);
      }
      return redirect('/keys?msg=extended');
    }

    // Single key actions
    const keyId = parseInt(formData.get('key_id') || '0');
    if (!keyId) return redirect('/keys');

    // Check permission
    const keyInfo = await fetchOne(env.DB,
      'SELECT k.created_by, u.invited_by FROM api_keys k LEFT JOIN users u ON k.created_by = u.id WHERE k.id = ? AND k.panel_code = ?',
      [keyId, panelCode]
    );

    if (!keyInfo) return redirect('/keys');

    const canModify = user.role === 'OWNER' || keyInfo.created_by === user.id || (user.role === 'ADMIN' && keyInfo.invited_by === user.id);
    if (!canModify) return redirect('/keys?error=permission');

    if (action === 'reset_device') {
      await execute(env.DB, 'DELETE FROM key_devices WHERE key_id = ? AND panel_code = ?', [keyId, panelCode]);
      return redirect('/keys?msg=hwid_reset');
    }
    if (action === 'delete_key') {
      await execute(env.DB, 'DELETE FROM api_keys WHERE id = ? AND panel_code = ?', [keyId, panelCode]);
      return redirect('/keys?msg=key_deleted');
    }
    if (action === 'edit_key') {
      const editStatus = parseInt(formData.get('edit_status') || '0');
      const extendVal = parseInt(formData.get('extend_val') || '0');
      const extendUnit = formData.get('extend_unit') || 'D';

      const keyData = await fetchOne(env.DB, 'SELECT expires_at, duration FROM api_keys WHERE id = ? AND panel_code = ?', [keyId, panelCode]);
      if (keyData) {
        let newExpires = keyData.expires_at;
        let newDuration = keyData.duration;

        if (extendVal > 0) {
          if (newExpires) {
            const d = new Date(newExpires);
            if (extendUnit === 'D') d.setDate(d.getDate() + extendVal);
            else d.setHours(d.getHours() + extendVal);
            newExpires = d.toISOString().replace('T', ' ').slice(0, 19);
          } else {
            newDuration = extendVal + extendUnit;
          }
        }

        await execute(env.DB, 'UPDATE api_keys SET is_blocked = ?, expires_at = ?, duration = ? WHERE id = ? AND panel_code = ?', [editStatus, newExpires, newDuration, keyId, panelCode]);
      }
      return redirect('/keys?msg=updated');
    }

    return redirect('/keys');
  } catch (err) {
    return redirect('/keys?error=1');
  }
}
