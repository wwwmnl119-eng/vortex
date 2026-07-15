const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.is_group, c.is_channel, c.avatar_url, c.description, c.member_count, c.created_at,
        (SELECT content FROM messages WHERE chat_id=c.id AND is_deleted=false ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE chat_id=c.id AND is_deleted=false ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id=c.id AND m.sender_id!=$1
         AND m.id NOT IN (SELECT message_id FROM message_reads WHERE user_id=$1)) as unread_count
       FROM chats c JOIN chat_members cm ON cm.chat_id=c.id
       WHERE cm.user_id=$1 ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/dm', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const { rows: existing } = await db.query(
      `SELECT c.id FROM chats c
       JOIN chat_members cm1 ON cm1.chat_id=c.id AND cm1.user_id=$1
       JOIN chat_members cm2 ON cm2.chat_id=c.id AND cm2.user_id=$2
       WHERE c.is_group=false AND c.is_channel=false`,
      [req.user.id, targetUserId]
    );
    if (existing[0]) return res.json(existing[0]);
    const { rows: chat } = await db.query('INSERT INTO chats (is_group, created_by) VALUES (false,$1) RETURNING *', [req.user.id]);
    await db.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2),($1,$3)', [chat[0].id, req.user.id, targetUserId]);
    res.status(201).json(chat[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/group', authenticate, async (req, res) => {
  try {
    const { name, memberIds, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows: chat } = await db.query('INSERT INTO chats (name, is_group, description, created_by) VALUES ($1,true,$2,$3) RETURNING *', [name, description, req.user.id]);
    const allMembers = [req.user.id, ...(memberIds || [])];
    for (const uid of allMembers) await db.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [chat[0].id, uid]);
    await db.query("UPDATE chat_members SET role='admin' WHERE chat_id=$1 AND user_id=$2", [chat[0].id, req.user.id]);
    res.status(201).json(chat[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT c.* FROM chats c JOIN chat_members cm ON cm.chat_id=c.id WHERE c.id=$1 AND cm.user_id=$2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const { rows: members } = await db.query('SELECT u.id, u.username, u.avatar_url, u.is_online, u.is_verified, cm.role FROM users u JOIN chat_members cm ON cm.user_id=u.id WHERE cm.chat_id=$1', [req.params.id]);
    res.json({ ...rows[0], members });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/leave', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM chat_members WHERE chat_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Left' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
