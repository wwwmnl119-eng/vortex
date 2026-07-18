const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Get messages with search
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const { before, limit = 50, search } = req.query;
    const { rows: member } = await db.query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [req.params.chatId, req.user.id]);
    if (!member[0]) return res.status(403).json({ error: 'Not a member' });

    let q = `SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar,
             u.is_verified as sender_verified, u.is_developer as sender_developer
             FROM messages m JOIN users u ON u.id=m.sender_id
             WHERE m.chat_id=$1 AND m.is_deleted=false`;
    const params = [req.params.chatId];

    if (search) { params.push(`%${search}%`); q += ` AND m.content ILIKE $${params.length}`; }
    if (before) { params.push(before); q += ` AND m.created_at<$${params.length}`; }
    q += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const { rows } = await db.query(q, params);

    // Get reactions for messages
    const msgIds = rows.map(m => m.id);
    let reactions = [];
    if (msgIds.length > 0) {
      const { rows: r } = await db.query(
        `SELECT message_id, emoji, COUNT(*) as count, array_agg(user_id) as user_ids
         FROM message_reactions WHERE message_id = ANY($1) GROUP BY message_id, emoji`,
        [msgIds]
      );
      reactions = r;
    }

    const msgsWithReactions = rows.reverse().map(msg => ({
      ...msg,
      reactions: reactions.filter(r => r.message_id === msg.id),
    }));

    res.json(msgsWithReactions);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get pinned messages
router.get('/:chatId/pinned', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.username as sender_username FROM messages m
       JOIN users u ON u.id=m.sender_id
       WHERE m.chat_id=$1 AND m.is_pinned=true AND m.is_deleted=false
       ORDER BY m.created_at DESC`,
      [req.params.chatId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Pin/unpin message
router.post('/:messageId/pin', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT chat_id FROM messages WHERE id=$1', [req.params.messageId]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const { rows: member } = await db.query(
      "SELECT role FROM chat_members WHERE chat_id=$1 AND user_id=$2",
      [rows[0].chat_id, req.user.id]
    );
    const { rows: updated } = await db.query(
      'UPDATE messages SET is_pinned=$1 WHERE id=$2 RETURNING *',
      [req.body.pinned, req.params.messageId]
    );
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// React to message
router.post('/:messageId/react', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji required' });
    const { rows: existing } = await db.query(
      'SELECT id FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
      [req.params.messageId, req.user.id, emoji]
    );
    if (existing[0]) {
      await db.query('DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
        [req.params.messageId, req.user.id, emoji]);
      res.json({ action: 'removed', emoji });
    } else {
      await db.query('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)',
        [req.params.messageId, req.user.id, emoji]);
      res.json({ action: 'added', emoji });
    }
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Delete message
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    await db.query("UPDATE messages SET is_deleted=true, content='[deleted]' WHERE id=$1 AND sender_id=$2",
      [req.params.messageId, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Edit message
router.put('/:messageId', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE messages SET content=$1, is_edited=true, updated_at=NOW() WHERE id=$2 AND sender_id=$3 RETURNING *',
      [req.body.content, req.params.messageId, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
