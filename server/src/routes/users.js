const router = require('express').Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const { rows } = await db.query(
      'SELECT id, username, email, avatar_url, is_online, is_verified, last_seen FROM users WHERE (username ILIKE $1 OR email ILIKE $1) AND id!=$2 LIMIT 20',
      [`%${q}%`, req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, email, avatar_url, bio, is_online, is_verified, is_admin, last_seen, created_at FROM users WHERE id=$1', [req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, bio } = req.body;
    if (username) {
      const { rows: ex } = await db.query('SELECT id FROM users WHERE username=$1 AND id!=$2', [username, req.user.id]);
      if (ex.length > 0) return res.status(409).json({ error: 'Имя уже занято' });
    }
    const { rows } = await db.query(
      'UPDATE users SET username=COALESCE($1,username), bio=COALESCE($2,bio) WHERE id=$3 RETURNING id, username, email, avatar_url, bio, is_verified, is_admin',
      [username || null, bio !== undefined ? bio : null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/me/avatar', authenticate, async (req, res) => {
  try {
    const { base64, ext } = req.body;
    if (!base64) return res.status(400).json({ error: 'No image' });
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `avatar_${Date.now()}.${ext || 'jpg'}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${filename}`;
    const { rows } = await db.query('UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id, username, email, avatar_url, bio, is_verified, is_admin', [avatarUrl, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, avatar_url, bio, is_online, is_verified, is_admin, last_seen FROM users WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
