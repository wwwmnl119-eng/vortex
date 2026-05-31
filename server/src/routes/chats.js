const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Get all chats for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.is_group, c.avatar_url, c.description, c.created_at,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM messages m
               WHERE m.chat_id = c.id
               AND m.sender_id != $1
               AND m.id NOT IN (SELECT message_id FROM message_reads WHERE user_id = $1)
              ) as unread_count
       FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id
       WHERE cm.user_id = $1
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single chat info + members
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows: chat } = await db.query(
      `SELECT c.*, cm.role
       FROM chats c JOIN chat_members cm ON cm.chat_id = c.id
       WHERE c.id=$1 AND cm.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!chat[0]) return res.status(404).json({ error: 'Chat not found' });

    const { rows: members } = await db.query(
      `SELECT u.id, u.username, u.avatar_url, u.is_online, u.last_seen, cm.role
       FROM users u JOIN chat_members cm ON cm.user_id = u.id
       WHERE cm.chat_id=$1`,
      [req.params.id]
    );

    res.json({ ...chat[0], members });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create personal chat (DM)
router.post('/dm', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    // Check if DM already exists
    const { rows: existing } = await db.query(
      `SELECT c.id FROM chats c
       JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
       JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
       WHERE c.is_group = false`,
      [req.user.id, targetUserId]
    );
    if (existing[0]) return res.json(existing[0]);

    // Create new DM
    const { rows: chat } = await db.query(
      'INSERT INTO chats (is_group, created_by) VALUES (false, $1) RETURNING *',
      [req.user.id]
    );
    await db.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2),($1,$3)',
      [chat[0].id, req.user.id, targetUserId]
    );

    res.status(201).json(chat[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create group chat
router.post('/group', authenticate, async (req, res) => {
  try {
    const { name, memberIds, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name required' });

    const { rows: chat } = await db.query(
      'INSERT INTO chats (name, is_group, description, created_by) VALUES ($1, true, $2, $3) RETURNING *',
      [name, description, req.user.id]
    );

    const allMembers = [req.user.id, ...(memberIds || [])];
    const placeholders = allMembers.map((_, i) => `($1, $${i + 2})`).join(',');
    await db.query(
      `INSERT INTO chat_members (chat_id, user_id) VALUES ${placeholders}`,
      [chat[0].id, ...allMembers]
    );

    // Set creator as admin
    await db.query(
      "UPDATE chat_members SET role='admin' WHERE chat_id=$1 AND user_id=$2",
      [chat[0].id, req.user.id]
    );

    res.status(201).json(chat[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member to group
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    await db.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, userId]
    );
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave chat
router.delete('/:id/leave', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM chat_members WHERE chat_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Left chat' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
