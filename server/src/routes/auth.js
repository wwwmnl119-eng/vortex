const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existing = await db.query('SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email or username already taken' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username, email, avatar_url, is_verified, is_admin',
      [username, email, hash]
    );
    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = uuidv4();
    await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL '30 days')", [rows[0].id, refreshToken]);
    res.status(201).json({ user: rows[0], token, refreshToken });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows[0] || !await bcrypt.compare(password, rows[0].password_hash))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = uuidv4();
    await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL '30 days')", [rows[0].id, refreshToken]);
    res.json({ user: { id: rows[0].id, username: rows[0].username, email: rows[0].email, avatar_url: rows[0].avatar_url, is_verified: rows[0].is_verified, is_admin: rows[0].is_admin }, token, refreshToken });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
  res.json({ message: 'Logged out' });
});

module.exports = router;
