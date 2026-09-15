import { sanitize } from '../auth.js';
import { fetchOne, fetchAll, execute } from '../db.js';

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export async function handleUsersActions(request, env, user) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') || '';
    const targetId = parseInt(formData.get('target_id') || '0');
    const panelCode = user.panel_code;

    if (!targetId) return redirect('/users');

    const targetUser = await fetchOne(env.DB, 'SELECT id, role, balance, username, invited_by FROM users WHERE id = ? AND panel_code = ?', [targetId, panelCode]);
    if (!targetUser) return redirect('/users?error=not_found');

    // Admin can only manage self or their resellers
    if (user.role === 'ADMIN' && targetUser.id !== user.id && targetUser.invited_by !== user.id) {
      return redirect('/users?error=permission');
    }
    if (user.role === 'ADMIN' && targetUser.role === 'OWNER') {
      return redirect('/users?error=cannot_modify_owner');
    }

    if (action === 'toggle_block') {
      if (targetId === user.id) return redirect('/users?error=cannot_block_self');
      await execute(env.DB, 'UPDATE users SET is_blocked = CASE WHEN is_blocked = 0 THEN 1 ELSE 0 END WHERE id = ?', [targetId]);
      return redirect('/users?msg=toggled');
    }

    if (action === 'add_balance') {
      const amount = parseInt(formData.get('amount') || '0');
      if (amount > 0) {
        await execute(env.DB, 'UPDATE users SET balance = balance + ? WHERE id = ?', [amount, targetId]);
        return redirect('/users?msg=added');
      }
    }

    if (action === 'deduct_balance') {
      const amount = parseInt(formData.get('amount') || '0');
      if (amount > 0 && targetUser.balance >= amount) {
        await execute(env.DB, 'UPDATE users SET balance = balance - ? WHERE id = ?', [amount, targetId]);
        return redirect('/users?msg=deducted');
      }
      return redirect('/users?error=insufficient');
    }

    return redirect('/users');
  } catch (err) {
    return redirect('/users?error=1');
  }
}
