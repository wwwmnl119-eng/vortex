const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const adminOnly = async (req, res, next) => {
  const { rows } = await db.query('SELECT is_admin FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
};

// Log admin action
const logAction = async (adminId, action, targetId, details) => {
  await db.query('INSERT INTO audit_logs (admin_id, action, target_id, details) VALUES ($1,$2,$3,$4)',
    [adminId, action, targetId, JSON.stringify(details)]);
};

// Stats
router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const [users, chats, groups, channels, messages, bans] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM chats WHERE is_group=false AND is_channel=false'),
      db.query('SELECT COUNT(*) FROM chats WHERE is_group=true'),
      db.query('SELECT COUNT(*) FROM chats WHERE is_channel=true'),
      db.query('SELECT COUNT(*) FROM messages WHERE is_deleted=false'),
      db.query('SELECT COUNT(*) FROM user_bans WHERE (expires_at IS NULL OR expires_at > NOW())'),
    ]);
    res.json({
      users: parseInt(users.rows[0].count),
      chats: parseInt(chats.rows[0].count),
      groups: parseInt(groups.rows[0].count),
      channels: parseInt(channels.rows[0].count),
      messages: parseInt(messages.rows[0].count),
      bans: parseInt(bans.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get all users
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, email, avatar_url, is_verified, is_admin, is_developer, is_online, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Verify user
router.post('/users/:id/verify', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE users SET is_verified=$1 WHERE id=$2 RETURNING id, username, is_verified',
      [req.body.verified, req.params.id]
    );
    await logAction(req.user.id, req.body.verified ? 'verify_user' : 'unverify_user', req.params.id, {});
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Set developer
router.post('/users/:id/developer', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE users SET is_developer=$1 WHERE id=$2 RETURNING id, username, is_developer',
      [req.body.developer, req.params.id]
    );
    await logAction(req.user.id, req.body.developer ? 'set_developer' : 'unset_developer', req.params.id, {});
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Ban user
router.post('/users/:id/ban', authenticate, adminOnly, async (req, res) => {
  try {
    const { reason, days } = req.body;
    const expiresAt = days ? new Date(Date.now() + days * 86400000) : null;
    await db.query(
      'INSERT INTO user_bans (user_id, banned_by, reason, expires_at) VALUES ($1,$2,$3,$4)',
      [req.params.id, req.user.id, reason, expiresAt]
    );
    await logAction(req.user.id, 'ban_user', req.params.id, { reason, days });
    res.json({ message: 'User banned' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Unban user
router.delete('/users/:id/ban', authenticate, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM user_bans WHERE user_id=$1', [req.params.id]);
    await logAction(req.user.id, 'unban_user', req.params.id, {});
    res.json({ message: 'User unbanned' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Delete user
router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await logAction(req.user.id, 'delete_user', req.params.id, {});
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get app settings
router.get('/settings', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM app_settings ORDER BY key');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Update app settings
router.put('/settings', authenticate, adminOnly, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()',
        [key, String(value)]
      );
    }
    await logAction(req.user.id, 'update_settings', null, settings);
    res.json({ message: 'Settings updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Create channel
router.post('/channels', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, description, username } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await db.query(
      'INSERT INTO chats (name, is_channel, description, username, created_by, member_count) VALUES ($1,true,$2,$3,$4,1) RETURNING *',
      [name, description, username || null, req.user.id]
    );
    await db.query("INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1,$2,'admin')", [rows[0].id, req.user.id]);
    await logAction(req.user.id, 'create_channel', rows[0].id, { name });
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get audit logs
router.get('/logs', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT al.*, u.username as admin_username FROM audit_logs al
       LEFT JOIN users u ON u.id=al.admin_id
       ORDER BY al.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
