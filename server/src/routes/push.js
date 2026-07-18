const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Register push token
router.post('/token', authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await db.query(
      'INSERT INTO push_tokens (user_id, token, platform) VALUES ($1,$2,$3) ON CONFLICT (user_id, token) DO NOTHING',
      [req.user.id, token, platform || 'web']
    );
    res.json({ message: 'Token registered' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Remove push token on logout
router.delete('/token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    await db.query('DELETE FROM push_tokens WHERE user_id=$1 AND token=$2', [req.user.id, token]);
    res.json({ message: 'Token removed' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
