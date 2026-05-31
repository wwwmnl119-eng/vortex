const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Avatar upload
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Search users
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const { rows } = await db.query(
      `SELECT id, username, email, avatar_url, is_online, last_seen
       FROM users WHERE (username ILIKE $1 OR email ILIKE $1) AND id != $2 LIMIT 20`,
      [`%${q}%`, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, email, avatar_url, bio, is_online, last_seen, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile (username, bio) — без updated_at
router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, bio } = req.body;

    if (username) {
      const { rows: existing } = await db.query(
        'SELECT id FROM users WHERE username=$1 AND id!=$2',
        [username, req.user.id]
      );
      if (existing.length > 0)
        return res.status(409).json({ error: 'Это имя пользователя уже занято' });
    }

    const { rows } = await db.query(
      `UPDATE users SET
        username = COALESCE($1, username),
        bio = COALESCE($2, bio)
       WHERE id=$3
       RETURNING id, username, email, avatar_url, bio`,
      [username || null, bio !== undefined ? bio : null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload avatar (base64 for web support)
router.post('/me/avatar', authenticate, async (req, res) => {
  try {
    // Support both multipart and base64
    if (req.headers['content-type']?.includes('application/json')) {
      // Base64 from web
      const { base64, ext } = req.body;
      if (!base64) return res.status(400).json({ error: 'No image data' });

      const filename = `avatar_${Date.now()}.${ext || 'jpg'}`;
      const filepath = path.join(uploadDir, filename);
      const data = base64.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filepath, Buffer.from(data, 'base64'));

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const avatarUrl = `${baseUrl}/uploads/avatars/${filename}`;

      const { rows } = await db.query(
        'UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id, username, email, avatar_url, bio',
        [avatarUrl, req.user.id]
      );
      return res.json(rows[0]);
    }

    return res.status(400).json({ error: 'Use base64' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload avatar multipart (mobile)
router.post('/me/avatar/upload', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    const { rows } = await db.query(
      'UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id, username, email, avatar_url, bio',
      [avatarUrl, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, avatar_url, bio, is_online, last_seen FROM users WHERE id=$1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
