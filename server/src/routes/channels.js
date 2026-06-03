const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Get all public channels
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.username as owner_username, u.is_verified as owner_verified
       FROM chats c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.is_channel = true
       ORDER BY c.member_count DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get channel by username
router.get('/:username', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM chats WHERE username=$1 AND is_channel=true',
      [req.params.username]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Channel not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Subscribe to channel
router.post('/:id/subscribe', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    await db.query(
      'UPDATE chats SET member_count = (SELECT COUNT(*) FROM chat_members WHERE chat_id=$1) WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: 'Subscribed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsubscribe
router.delete('/:id/subscribe', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM chat_members WHERE chat_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    await db.query(
      'UPDATE chats SET member_count = (SELECT COUNT(*) FROM chat_members WHERE chat_id=$1) WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
