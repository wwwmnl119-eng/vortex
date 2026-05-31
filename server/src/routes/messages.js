const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Get messages for a chat (paginated)
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { before, limit = 50 } = req.query;

    // Check membership
    const { rows: member } = await db.query(
      'SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2',
      [chatId, req.user.id]
    );
    if (!member[0]) return res.status(403).json({ error: 'Not a member' });

    let query = `
      SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.chat_id=$1 AND m.is_deleted=false
    `;
    const params = [chatId];

    if (before) {
      params.push(before);
      query += ` AND m.created_at < $${params.length}`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const { rows } = await db.query(query, params);
    res.json(rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete message
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM messages WHERE id=$1 AND sender_id=$2',
      [req.params.messageId, req.user.id]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Not your message' });

    await db.query(
      "UPDATE messages SET is_deleted=true, content='[deleted]' WHERE id=$1",
      [req.params.messageId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit message
router.put('/:messageId', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const { rows } = await db.query(
      'SELECT * FROM messages WHERE id=$1 AND sender_id=$2',
      [req.params.messageId, req.user.id]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Not your message' });

    const { rows: updated } = await db.query(
      'UPDATE messages SET content=$1, is_edited=true, updated_at=NOW() WHERE id=$2 RETURNING *',
      [content, req.params.messageId]
    );
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
