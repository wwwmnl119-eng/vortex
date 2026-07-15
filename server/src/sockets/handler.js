const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = (io) => {
  const onlineUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.userId = jwt.verify(token, process.env.JWT_SECRET).id;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ Connected: ${socket.userId}`);
    onlineUsers.set(socket.userId, socket.id);
    await db.query('UPDATE users SET is_online=true WHERE id=$1', [socket.userId]);
    io.emit('user_online', { userId: socket.userId });

    // Auto-join rooms + mark pending as delivered
    try {
      const { rows } = await db.query('SELECT chat_id FROM chat_members WHERE user_id=$1', [socket.userId]);
      rows.forEach(r => socket.join(r.chat_id));

      const { rows: pending } = await db.query(
        `SELECT DISTINCT m.id, m.chat_id FROM messages m
         JOIN chat_members cm ON cm.chat_id = m.chat_id
         WHERE cm.user_id=$1 AND m.sender_id!=$1 AND m.is_deleted=false
         AND m.id NOT IN (SELECT message_id FROM message_deliveries WHERE user_id=$1)
         LIMIT 100`,
        [socket.userId]
      );
      for (const msg of pending) {
        await db.query('INSERT INTO message_deliveries (message_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [msg.id, socket.userId]);
      }
      if (pending.length > 0) {
        const grouped = pending.reduce((acc, m) => { (acc[m.chat_id] = acc[m.chat_id] || []).push(m.id); return acc; }, {});
        Object.entries(grouped).forEach(([chatId, ids]) => {
          socket.to(chatId).emit('messages_delivered', { messageIds: ids, userId: socket.userId, chatId });
        });
      }
    } catch (err) { console.error('init error:', err); }

    socket.on('join_chats', async () => {
      const { rows } = await db.query('SELECT chat_id FROM chat_members WHERE user_id=$1', [socket.userId]);
      rows.forEach(r => socket.join(r.chat_id));
      socket.emit('chats_joined', rows.map(r => r.chat_id));
    });

    socket.on('join_chat', ({ chatId }) => socket.join(chatId));

    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', fileUrl, fileName, fileSize, mimeType, replyTo } = data;
        const { rows: member } = await db.query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [chatId, socket.userId]);
        if (!member[0]) return socket.emit('error', { message: 'Not a member' });

        const { rows } = await db.query(
          `INSERT INTO messages (chat_id,sender_id,content,message_type,file_url,file_name,file_size,mime_type,reply_to)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [chatId, socket.userId, content, messageType, fileUrl, fileName, fileSize, mimeType, replyTo || null]
        );
        const { rows: user } = await db.query('SELECT username, avatar_url, is_verified FROM users WHERE id=$1', [socket.userId]);
        const fullMsg = { ...rows[0], sender_username: user[0].username, sender_avatar: user[0].avatar_url, sender_verified: user[0].is_verified };
        io.to(chatId).emit('new_message', fullMsg);

        // Auto-deliver to online members
        const { rows: members } = await db.query('SELECT user_id FROM chat_members WHERE chat_id=$1 AND user_id!=$2', [chatId, socket.userId]);
        const delivered = [];
        for (const m of members) {
          if (onlineUsers.has(m.user_id)) {
            await db.query('INSERT INTO message_deliveries (message_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rows[0].id, m.user_id]);
            delivered.push(m.user_id);
          }
        }
        if (delivered.length > 0) socket.emit('messages_delivered', { messageIds: [rows[0].id], chatId });
      } catch (err) { console.error('send_message error:', err); socket.emit('error', { message: 'Failed to send' }); }
    });

    socket.on('typing', ({ chatId, isTyping }) => socket.to(chatId).emit('user_typing', { userId: socket.userId, chatId, isTyping }));

    socket.on('read_messages', async ({ chatId, messageIds }) => {
      try {
        if (!messageIds?.length) return;
        for (const id of messageIds) await db.query('INSERT INTO message_reads (message_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, socket.userId]);
        io.to(chatId).emit('messages_read', { userId: socket.userId, messageIds, chatId });
      } catch (err) { console.error('read error:', err); }
    });

    socket.on('delete_message', async ({ messageId, chatId }) => {
      try {
        await db.query("UPDATE messages SET is_deleted=true, content='[deleted]' WHERE id=$1 AND sender_id=$2", [messageId, socket.userId]);
        io.to(chatId).emit('message_deleted', { messageId, chatId });
      } catch (err) { console.error('delete error:', err); }
    });

    socket.on('edit_message', async ({ messageId, chatId, content }) => {
      try {
        const { rows } = await db.query('UPDATE messages SET content=$1, is_edited=true, updated_at=NOW() WHERE id=$2 AND sender_id=$3 RETURNING *', [content, messageId, socket.userId]);
        if (rows[0]) io.to(chatId).emit('message_edited', rows[0]);
      } catch (err) { console.error('edit error:', err); }
    });

    socket.on('register_push_token', async ({ token, platform }) => {
      try { await db.query('INSERT INTO push_tokens (user_id, token, platform) VALUES ($1,$2,$3) ON CONFLICT (user_id, token) DO NOTHING', [socket.userId, token, platform || 'web']); }
      catch (err) { console.error('push token error:', err); }
    });

    socket.on('call_user', ({ targetUserId, offer, callType }) => {
      const t = onlineUsers.get(targetUserId);
      if (t) io.to(t).emit('incoming_call', { from: socket.userId, offer, callType });
      else socket.emit('call_failed', { reason: 'User is offline' });
    });
    socket.on('call_answer', ({ targetUserId, answer }) => { const t = onlineUsers.get(targetUserId); if (t) io.to(t).emit('call_answered', { from: socket.userId, answer }); });
    socket.on('call_reject', ({ targetUserId }) => { const t = onlineUsers.get(targetUserId); if (t) io.to(t).emit('call_rejected', { from: socket.userId }); });
    socket.on('ice_candidate', ({ targetUserId, candidate }) => { const t = onlineUsers.get(targetUserId); if (t) io.to(t).emit('ice_candidate', { from: socket.userId, candidate }); });
    socket.on('end_call', ({ targetUserId }) => { const t = onlineUsers.get(targetUserId); if (t) io.to(t).emit('call_ended', { from: socket.userId }); });

    socket.on('disconnect', async () => {
      console.log(`❌ Disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
      await db.query('UPDATE users SET is_online=false, last_seen=NOW() WHERE id=$1', [socket.userId]);
      io.emit('user_offline', { userId: socket.userId });
    });
  });
};
