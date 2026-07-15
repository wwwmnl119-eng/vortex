const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT id, username, email, avatar_url, is_admin, is_verified FROM users WHERE id=$1', [decoded.id]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
};

module.exports = { authenticate };
