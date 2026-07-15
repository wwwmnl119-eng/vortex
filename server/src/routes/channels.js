const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM chats WHERE is_channel=true ORDER BY member_count DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/subscribe', authenticate, async (req, res) => {
  try {
    await db.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    await db.query('UPDATE chats SET member_count=(SELECT COUNT(*) FROM chat_members WHERE chat_id=$1) WHERE id=$1', [req.params.id]);
    res.json({ message: 'Subscribed' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/subscribe', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM chat_members WHERE chat_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    await db.query('UPDATE chats SET member_count=(SELECT COUNT(*) FROM chat_members WHERE chat_id=$1) WHERE id=$1', [req.params.id]);
    res.json({ message: 'Unsubscribed' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
