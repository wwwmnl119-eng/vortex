class User {
  final String id;
  final String username;
  final String email;
  final String? avatarUrl;
  final String? bio;
  final bool isOnline;
  final DateTime? lastSeen;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.avatarUrl,
    this.bio,
    this.isOnline = false,
    this.lastSeen,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'],
        username: j['username'],
        email: j['email'] ?? '',
        avatarUrl: j['avatar_url'],
        bio: j['bio'],
        isOnline: j['is_online'] ?? false,
        lastSeen: j['last_seen'] != null ? DateTime.tryParse(j['last_seen']) : null,
      );
}

class Chat {
  final String id;
  final String? name;
  final bool isGroup;
  final String? avatarUrl;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final List<User> members;

  Chat({
    required this.id,
    this.name,
    this.isGroup = false,
    this.avatarUrl,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.members = const [],
  });

  factory Chat.fromJson(Map<String, dynamic> j) => Chat(
        id: j['id'],
        name: j['name'],
        isGroup: j['is_group'] ?? false,
        avatarUrl: j['avatar_url'],
        lastMessage: j['last_message'],
        lastMessageAt: j['last_message_at'] != null ? DateTime.tryParse(j['last_message_at']) : null,
        unreadCount: int.tryParse(j['unread_count']?.toString() ?? '0') ?? 0,
      );
}

class Message {
  final String id;
  final String chatId;
  final String senderId;
  final String? content;
  final String messageType; // text, image, file, audio, video
  final String? fileUrl;
  final String? fileName;
  final int? fileSize;
  final String? mimeType;
  final String? replyTo;
  final bool isEdited;
  final bool isDeleted;
  final DateTime createdAt;
  final String? senderUsername;
  final String? senderAvatar;

  Message({
    required this.id,
    required this.chatId,
    required this.senderId,
    this.content,
    this.messageType = 'text',
    this.fileUrl,
    this.fileName,
    this.fileSize,
    this.mimeType,
    this.replyTo,
    this.isEdited = false,
    this.isDeleted = false,
    required this.createdAt,
    this.senderUsername,
    this.senderAvatar,
  });

  factory Message.fromJson(Map<String, dynamic> j) => Message(
        id: j['id'],
        chatId: j['chat_id'],
        senderId: j['sender_id'],
        content: j['content'],
        messageType: j['message_type'] ?? 'text',
        fileUrl: j['file_url'],
        fileName: j['file_name'],
        fileSize: j['file_size'],
        mimeType: j['mime_type'],
        replyTo: j['reply_to'],
        isEdited: j['is_edited'] ?? false,
        isDeleted: j['is_deleted'] ?? false,
        createdAt: DateTime.parse(j['created_at']),
        senderUsername: j['sender_username'],
        senderAvatar: j['sender_avatar'],
      );
}
