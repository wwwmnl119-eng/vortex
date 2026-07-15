import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'chat_screen.dart';
import 'new_chat_screen.dart';

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
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final colors = AppColors(isDark);

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        backgroundColor: colors.appBar,
        title: Text('Vortex', style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.bold, fontSize: 22)),
        actions: [
          IconButton(icon: Icon(Icons.search, color: colors.textSecondary),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NewChatScreen())).then((_) => _load())),
          IconButton(icon: Icon(Icons.edit_outlined, color: colors.textSecondary),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NewChatScreen())).then((_) => _load())),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.blue))
          : _chats.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.chat_bubble_outline, size: 80, color: colors.textSecondary.withOpacity(0.3)),
                  const SizedBox(height: 16),
                  Text('Нет чатов', style: TextStyle(color: colors.textSecondary, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('Нажмите ✏️ чтобы начать', style: TextStyle(color: colors.textSecondary.withOpacity(0.6), fontSize: 13)),
                ]))
              : RefreshIndicator(
                  color: AppColors.blue,
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: _chats.length,
                    itemBuilder: (ctx, i) => _tile(_chats[i], colors),
                  ),
                ),
    );
  }

  Widget _tile(Chat chat, AppColors colors) {
    final time = chat.lastMessageAt != null ? _formatTime(chat.lastMessageAt!) : '';
    return InkWell(
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => ChatScreen(chatId: chat.id, chatName: chat.name ?? 'Чат'),
      )).then((_) => _load()),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.divider, width: 0.5))),
        child: Row(children: [
          _avatar(chat),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Row(children: [
                Flexible(child: Text(chat.name ?? 'Чат',
                  style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                  maxLines: 1, overflow: TextOverflow.ellipsis)),
                if (chat.isChannel) ...[const SizedBox(width: 3), const Icon(Icons.verified, color: AppColors.blue, size: 14)],
              ])),
              Text(time, style: TextStyle(
                color: chat.unreadCount > 0 ? AppColors.blue : colors.textSecondary, fontSize: 12)),
            ]),
            const SizedBox(height: 3),
            Row(children: [
              Expanded(child: Text(
                chat.isChannel ? '${chat.memberCount} подписчиков' : (chat.lastMessage ?? 'Нет сообщений'),
                style: TextStyle(color: colors.textSecondary, fontSize: 13),
                maxLines: 1, overflow: TextOverflow.ellipsis)),
              if (chat.unreadCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.blue, borderRadius: BorderRadius.circular(10)),
                  child: Text('${chat.unreadCount}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
            ]),
          ])),
        ]),
      ),
    );
  }

  Widget _avatar(Chat chat) {
    return CircleAvatar(
      radius: 26,
      backgroundColor: chat.isChannel ? const Color(0xFFAB5CF7) : AppColors.blue,
      backgroundImage: chat.avatarUrl != null ? NetworkImage(chat.avatarUrl!) : null,
      child: chat.avatarUrl == null
          ? Icon(chat.isChannel ? Icons.campaign : Icons.person, color: Colors.white, size: 22)
          : null,
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now(); final local = dt.toLocal();
    if (now.difference(local).inDays == 0) return DateFormat('HH:mm').format(local);
    if (now.difference(local).inDays < 7) return DateFormat('EEE').format(local);
    return DateFormat('dd.MM').format(local);
  }
}
