import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../providers/auth_provider.dart';
import 'chat_screen.dart';
import 'new_chat_screen.dart';
import 'profile_screen.dart';
import 'login_screen.dart';

class ChatsScreen extends StatefulWidget {
  const ChatsScreen({super.key});
  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  List<Chat> _chats = [];
  bool _loading = true;
  final _api = ApiService();
  final _socket = SocketService();

  @override
  void initState() {
    super.initState();
    _load();
    _socket.on('new_message', (_) => _load());
  }

  Future<void> _load() async {
    try {
      final chats = await _api.getChats();
      if (mounted) setState(() { _chats = chats; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: const Color(0xFF17212B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF17212B),
        title: const Text('Vortex', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen())).then((_) => _load()),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: CircleAvatar(
              backgroundColor: const Color(0xFF2AABEE),
              backgroundImage: me?.avatarUrl != null ? NetworkImage(me!.avatarUrl!) : null,
              child: me?.avatarUrl == null
                  ? Text(me?.username[0].toUpperCase() ?? 'V',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14))
                  : null,
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Color(0xFF8B9DB5)),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NewChatScreen())).then((_) => _load()),
          ),
          PopupMenuButton(
            icon: const Icon(Icons.more_vert, color: Color(0xFF8B9DB5)),
            color: const Color(0xFF232E3C),
            itemBuilder: (_) => [
              PopupMenuItem(
                child: const Text('Новая группа', style: TextStyle(color: Colors.white)),
                onTap: () {},
              ),
              PopupMenuItem(
                child: const Text('Профиль', style: TextStyle(color: Colors.white)),
                onTap: () => Future.delayed(Duration.zero, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()))),
              ),
              PopupMenuItem(
                child: const Text('Выйти', style: TextStyle(color: Color(0xFFFF6B6B))),
                onTap: () async {
                  await context.read<AuthProvider>().logout();
                  if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                },
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF2AABEE),
        child: const Icon(Icons.edit_outlined, color: Colors.white),
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NewChatScreen())).then((_) => _load()),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2AABEE)))
          : _chats.isEmpty
              ? Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.chat_bubble_outline, size: 80, color: Colors.white.withOpacity(0.1)),
                    const SizedBox(height: 16),
                    const Text('Нет чатов', style: TextStyle(color: Color(0xFF8B9DB5), fontSize: 16)),
                    const SizedBox(height: 8),
                    const Text('Нажмите ✏️ чтобы начать', style: TextStyle(color: Color(0xFF5A6A7A), fontSize: 13)),
                  ]),
                )
              : RefreshIndicator(
                  color: const Color(0xFF2AABEE),
                  backgroundColor: const Color(0xFF232E3C),
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: _chats.length,
                    itemBuilder: (ctx, i) => _tile(_chats[i]),
                  ),
                ),
    );
  }

  Widget _tile(Chat chat) {
    final time = chat.lastMessageAt != null
        ? _formatTime(chat.lastMessageAt!)
        : '';
    return InkWell(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => ChatScreen(chatId: chat.id, chatName: chat.name ?? 'Чат'),
      )).then((_) => _load()),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            _avatar(chat),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(chat.name ?? 'Чат',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                        maxLines: 1, overflow: TextOverflow.ellipsis)),
                      Text(time, style: TextStyle(
                        color: chat.unreadCount > 0 ? const Color(0xFF2AABEE) : const Color(0xFF8B9DB5),
                        fontSize: 12,
                      )),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(child: Text(chat.lastMessage ?? 'Нет сообщений',
                        style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 13),
                        maxLines: 1, overflow: TextOverflow.ellipsis)),
                      if (chat.unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFF2AABEE), borderRadius: BorderRadius.circular(10)),
                          child: Text('${chat.unreadCount}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatar(Chat chat) {
    return CircleAvatar(
      radius: 26,
      backgroundColor: const Color(0xFF2AABEE),
      backgroundImage: chat.avatarUrl != null ? NetworkImage(chat.avatarUrl!) : null,
      child: chat.avatarUrl == null
          ? Text((chat.name ?? '?')[0].toUpperCase(),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18))
          : null,
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final local = dt.toLocal();
    if (now.difference(local).inDays == 0) return DateFormat('HH:mm').format(local);
    if (now.difference(local).inDays < 7) return DateFormat('EEE').format(local);
    return DateFormat('dd.MM').format(local);
  }
}
