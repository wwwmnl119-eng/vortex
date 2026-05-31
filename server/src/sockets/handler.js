const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = (io) => {
  const onlineUsers = new Map(); // userId -> socketId

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ Connected: ${socket.userId}`);
    onlineUsers.set(socket.userId, socket.id);

    await db.query('UPDATE users SET is_online=true WHERE id=$1', [socket.userId]);
    io.emit('user_online', { userId: socket.userId });

    // Join all chat rooms automatically
    try {
      const { rows } = await db.query(
        'SELECT chat_id FROM chat_members WHERE user_id=$1',
        [socket.userId]
      );
      rows.forEach((r) => socket.join(r.chat_id));
      console.log(`User ${socket.userId} joined ${rows.length} rooms`);
    } catch (err) {
      console.error('Auto-join error:', err);
    }

    socket.on('join_chats', async () => {
      try {
        const { rows } = await db.query(
          'SELECT chat_id FROM chat_members WHERE user_id=$1',
          [socket.userId]
        );
        rows.forEach((r) => socket.join(r.chat_id));
        socket.emit('chats_joined', rows.map((r) => r.chat_id));
      } catch (err) {
        console.error('join_chats error:', err);
      }
    });

    // Join a specific chat room (called after creating DM/group)
    socket.on('join_chat', ({ chatId }) => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat ${chatId}`);
    });

    // ── MESSAGING ──────────────────────────────────────

    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', fileUrl, fileName, fileSize, mimeType, replyTo } = data;

        // Verify membership
        const { rows: member } = await db.query(
          'SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2',
          [chatId, socket.userId]
        );
        if (!member[0]) {
          socket.emit('error', { message: 'Not a member of this chat' });
          return;
        }

        const { rows } = await db.query(
          `INSERT INTO messages (chat_id, sender_id, content, message_type, file_url, file_name, file_size, mime_type, reply_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [chatId, socket.userId, content, messageType, fileUrl, fileName, fileSize, mimeType, replyTo || null]
        );

        const { rows: user } = await db.query(
          'SELECT username, avatar_url FROM users WHERE id=$1',
          [socket.userId]
        );

        const fullMsg = {
          ...rows[0],
          sender_username: user[0].username,
          sender_avatar: user[0].avatar_url,
        };

        // Send to ALL in chat room including sender
        io.to(chatId).emit('new_message', fullMsg);
        console.log(`Message sent to room ${chatId}`);
      } catch (err) {
        console.error('send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(chatId).emit('user_typing', {
        userId: socket.userId,
        chatId,
        isTyping,
      });
    });

    socket.on('read_messages', async ({ chatId, messageIds }) => {
      try {
        if (!messageIds?.length) return;
        for (const id of messageIds) {
          await db.query(
            'INSERT INTO message_reads (message_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [id, socket.userId]
          );
        }
        io.to(chatId).emit('messages_read', { userId: socket.userId, messageIds, chatId });
      } catch (err) {
        console.error('read_messages error:', err);
      }
    });

    socket.on('delete_message', async ({ messageId, chatId }) => {
      try {
        await db.query(
          "UPDATE messages SET is_deleted=true, content='[deleted]' WHERE id=$1 AND sender_id=$2",
          [messageId, socket.userId]
        );
        io.to(chatId).emit('message_deleted', { messageId, chatId });
      } catch (err) {
        console.error('delete_message error:', err);
      }
    });

    socket.on('edit_message', async ({ messageId, chatId, content }) => {
      try {
        const { rows } = await db.query(
          'UPDATE messages SET content=$1, is_edited=true, updated_at=NOW() WHERE id=$2 AND sender_id=$3 RETURNING *',
          [content, messageId, socket.userId]
        );
        if (rows[0]) io.to(chatId).emit('message_edited', rows[0]);
      } catch (err) {
        console.error('edit_message error:', err);
      }
    });

    // ── WebRTC ─────────────────────────────────────────

    socket.on('call_user', ({ targetUserId, offer, callType }) => {
      const targetSocket = onlineUsers.get(targetUserId);
      if (targetSocket) {
        io.to(targetSocket).emit('incoming_call', { from: socket.userId, offer, callType });
      } else {
        socket.emit('call_failed', { reason: 'User is offline' });
      }
    });

    socket.on('call_answer', ({ targetUserId, answer }) => {
      const t = onlineUsers.get(targetUserId);
      if (t) io.to(t).emit('call_answered', { from: socket.userId, answer });
    });

    socket.on('call_reject', ({ targetUserId }) => {
      const t = onlineUsers.get(targetUserId);
      if (t) io.to(t).emit('call_rejected', { from: socket.userId });
    });

    socket.on('ice_candidate', ({ targetUserId, candidate }) => {
      const t = onlineUsers.get(targetUserId);
      if (t) io.to(t).emit('ice_candidate', { from: socket.userId, candidate });
    });

    socket.on('end_call', ({ targetUserId }) => {
      const t = onlineUsers.get(targetUserId);
      if (t) io.to(t).emit('call_ended', { from: socket.userId });
    });

    // ── DISCONNECT ─────────────────────────────────────

    socket.on('disconnect', async () => {
      console.log(`❌ Disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
      await db.query(
        'UPDATE users SET is_online=false, last_seen=NOW() WHERE id=$1',
        [socket.userId]
      );
      io.emit('user_offline', { userId: socket.userId });
    });
  });
};
