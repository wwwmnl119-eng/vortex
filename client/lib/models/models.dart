enum MessageStatus { sending, sent, delivered, read }

class User {
  final String id;
  final String username;
  final String email;
  final String? avatarUrl;
  final String? bio;
  final bool isOnline;
  final bool isVerified;
  final bool isAdmin;
  final bool isDeveloper;
  final DateTime? lastSeen;

  User({required this.id, required this.username, required this.email,
    this.avatarUrl, this.bio, this.isOnline = false,
    this.isVerified = false, this.isAdmin = false, this.isDeveloper = false, this.lastSeen});

  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['id'], username: j['username'], email: j['email'] ?? '',
    avatarUrl: j['avatar_url'], bio: j['bio'],
    isOnline: j['is_online'] ?? false,
    isVerified: j['is_verified'] ?? false,
    isAdmin: j['is_admin'] ?? false,
    isDeveloper: j['is_developer'] ?? false,
    lastSeen: j['last_seen'] != null ? DateTime.tryParse(j['last_seen']) : null,
  );
}

class Reaction {
  final String emoji;
  final int count;
  final List<String> userIds;
  Reaction({required this.emoji, required this.count, required this.userIds});
  factory Reaction.fromJson(Map<String, dynamic> j) => Reaction(
    emoji: j['emoji'], count: int.tryParse(j['count'].toString()) ?? 0,
    userIds: List<String>.from(j['user_ids'] ?? []),
  );
}

class Chat {
  final String id;
  final String? name;
  final bool isGroup;
  final bool isChannel;
  final String? avatarUrl;
  final String? description;
  final String? username;
  final int memberCount;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;

  Chat({required this.id, this.name, this.isGroup = false, this.isChannel = false,
    this.avatarUrl, this.description, this.username, this.memberCount = 0,
    this.lastMessage, this.lastMessageAt, this.unreadCount = 0});

  factory Chat.fromJson(Map<String, dynamic> j) => Chat(
    id: j['id'], name: j['name'],
    isGroup: j['is_group'] ?? false, isChannel: j['is_channel'] ?? false,
    avatarUrl: j['avatar_url'], description: j['description'], username: j['username'],
    memberCount: j['member_count'] ?? 0, lastMessage: j['last_message'],
    lastMessageAt: j['last_message_at'] != null ? DateTime.tryParse(j['last_message_at']) : null,
    unreadCount: int.tryParse(j['unread_count']?.toString() ?? '0') ?? 0,
  );
}

class Message {
  final String id;
  final String chatId;
  final String senderId;
  final String? content;
  final String messageType;
  final String? fileUrl;
  final String? fileName;
  final int? fileSize;
  final String? mimeType;
  final String? replyTo;
  final bool isEdited;
  final bool isDeleted;
  final bool isPinned;
  final int views;
  final DateTime createdAt;
  final String? senderUsername;
  final String? senderAvatar;
  final bool senderVerified;
  final bool senderDeveloper;
  final MessageStatus status;
  final Set<String> deliveredTo;
  final Set<String> readBy;
  final List<Reaction> reactions;

  Message({
    required this.id, required this.chatId, required this.senderId,
    this.content, this.messageType = 'text', this.fileUrl, this.fileName,
    this.fileSize, this.mimeType, this.replyTo,
    this.isEdited = false, this.isDeleted = false, this.isPinned = false,
    this.views = 0, required this.createdAt,
    this.senderUsername, this.senderAvatar,
    this.senderVerified = false, this.senderDeveloper = false,
    this.status = MessageStatus.sent,
    Set<String>? deliveredTo, Set<String>? readBy,
    List<Reaction>? reactions,
  }) : deliveredTo = deliveredTo ?? {}, readBy = readBy ?? {}, reactions = reactions ?? [];

  factory Message.fromJson(Map<String, dynamic> j) => Message(
    id: j['id'], chatId: j['chat_id'], senderId: j['sender_id'],
    content: j['content'], messageType: j['message_type'] ?? 'text',
    fileUrl: j['file_url'], fileName: j['file_name'], fileSize: j['file_size'],
    mimeType: j['mime_type'], replyTo: j['reply_to'],
    isEdited: j['is_edited'] ?? false, isDeleted: j['is_deleted'] ?? false,
    isPinned: j['is_pinned'] ?? false, views: j['views'] ?? 0,
    createdAt: DateTime.parse(j['created_at']),
    senderUsername: j['sender_username'], senderAvatar: j['sender_avatar'],
    senderVerified: j['sender_verified'] ?? false,
    senderDeveloper: j['sender_developer'] ?? false,
    reactions: j['reactions'] != null
        ? List<Reaction>.from((j['reactions'] as List).map((r) => Reaction.fromJson(r)))
        : [],
  );

  Message copyWith({MessageStatus? status, Set<String>? deliveredTo, Set<String>? readBy,
      String? content, bool? isEdited, bool? isDeleted, bool? isPinned, List<Reaction>? reactions}) {
    return Message(
      id: id, chatId: chatId, senderId: senderId,
      content: content ?? this.content, messageType: messageType,
      fileUrl: fileUrl, fileName: fileName, fileSize: fileSize, mimeType: mimeType,
      replyTo: replyTo, isEdited: isEdited ?? this.isEdited,
      isDeleted: isDeleted ?? this.isDeleted, isPinned: isPinned ?? this.isPinned,
      views: views, createdAt: createdAt,
      senderUsername: senderUsername, senderAvatar: senderAvatar,
      senderVerified: senderVerified, senderDeveloper: senderDeveloper,
      status: status ?? this.status,
      deliveredTo: deliveredTo ?? Set.from(this.deliveredTo),
      readBy: readBy ?? Set.from(this.readBy),
      reactions: reactions ?? List.from(this.reactions),
    );
  }
}
