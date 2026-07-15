const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const { rows: member } = await db.query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [req.params.chatId, req.user.id]);
    if (!member[0]) return res.status(403).json({ error: 'Not a member' });
    let q = `SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar, u.is_verified as sender_verified
             FROM messages m JOIN users u ON u.id=m.sender_id
             WHERE m.chat_id=$1 AND m.is_deleted=false`;
    const params = [req.params.chatId];
    if (before) { params.push(before); q += ` AND m.created_at<$${params.length}`; }
    q += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const { rows } = await db.query(q, params);
    res.json(rows.reverse());
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    await db.query("UPDATE messages SET is_deleted=true, content='[deleted]' WHERE id=$1 AND sender_id=$2", [req.params.messageId, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:messageId', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('UPDATE messages SET content=$1, is_edited=true, updated_at=NOW() WHERE id=$2 AND sender_id=$3 RETURNING *', [req.body.content, req.params.messageId, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
