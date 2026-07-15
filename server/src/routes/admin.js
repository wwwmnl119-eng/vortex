const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const adminOnly = async (req, res, next) => {
  const { rows } = await db.query('SELECT is_admin FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
};

router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, email, avatar_url, is_verified, is_admin, is_online, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/users/:id/verify', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE users SET is_verified=$1 WHERE id=$2 RETURNING id, username, is_verified', [req.body.verified, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const [users, chats, groups, channels, messages] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM chats WHERE is_group=false AND is_channel=false'),
      db.query('SELECT COUNT(*) FROM chats WHERE is_group=true'),
      db.query('SELECT COUNT(*) FROM chats WHERE is_channel=true'),
      db.query('SELECT COUNT(*) FROM messages WHERE is_deleted=false'),
    ]);
    res.json({
      users: parseInt(users.rows[0].count),
      chats: parseInt(chats.rows[0].count),
      groups: parseInt(groups.rows[0].count),
      channels: parseInt(channels.rows[0].count),
      messages: parseInt(messages.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/channels', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, description, username } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await db.query(
      'INSERT INTO chats (name, is_channel, description, username, created_by, member_count) VALUES ($1,true,$2,$3,$4,1) RETURNING *',
      [name, description, username || null, req.user.id]
    );
    await db.query("INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1,$2,'admin')", [rows[0].id, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
