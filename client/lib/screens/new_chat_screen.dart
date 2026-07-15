import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'chat_screen.dart';

class NewChatScreen extends StatefulWidget {
  const NewChatScreen({super.key});
  @override
  State<NewChatScreen> createState() => _NewChatScreenState();
}

class _NewChatScreenState extends State<NewChatScreen> {
  final _api = ApiService();
  final _ctrl = TextEditingController();
  List<User> _users = [];
  bool _loading = false;

  Future<void> _search(String q) async {
    if (q.length < 2) { setState(() => _users = []); return; }
    setState(() => _loading = true);
    try {
      final users = await _api.searchUsers(q);
      if (mounted) setState(() { _users = users; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _startDM(User user) async {
    try {
      final chat = await _api.createDM(user.id);
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(
        builder: (_) => ChatScreen(chatId: chat['id'], chatName: user.username, targetUserId: user.id)));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final colors = AppColors(isDark);

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        backgroundColor: colors.appBar,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: AppColors.blue), onPressed: () => Navigator.pop(context)),
        title: Container(
          height: 36,
          decoration: BoxDecoration(color: colors.inputBg, borderRadius: BorderRadius.circular(20)),
          child: TextField(
            controller: _ctrl, autofocus: true, onChanged: _search,
            style: TextStyle(color: colors.textPrimary, fontSize: 15),
            decoration: InputDecoration(
              hintText: 'Поиск по имени или email...',
              hintStyle: TextStyle(color: colors.textSecondary),
              prefixIcon: Icon(Icons.search, color: colors.textSecondary, size: 20),
              border: InputBorder.none, fillColor: Colors.transparent,
              contentPadding: const EdgeInsets.symmetric(vertical: 8)),
          ),
        ),
      ),
      body: Column(children: [
        if (_loading) LinearProgressIndicator(color: AppColors.blue, backgroundColor: colors.surface),
        if (_users.isEmpty && !_loading)
          Expanded(child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.person_search, size: 64, color: colors.textSecondary.withOpacity(0.3)),
            const SizedBox(height: 12),
            Text('Введите имя или email', style: TextStyle(color: colors.textSecondary)),
          ])))
        else
          Expanded(child: ListView.builder(
            itemCount: _users.length,
            itemBuilder: (ctx, i) {
              final user = _users[i];
              return ListTile(
                leading: CircleAvatar(
                  radius: 22, backgroundColor: AppColors.blue,
                  backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                  child: user.avatarUrl == null ? Text(user.username[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)) : null,
                ),
                title: Row(children: [
                  Text(user.username, style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w500)),
                  if (user.isVerified) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: AppColors.blue, size: 14)],
                ]),
                subtitle: Text(user.email, style: TextStyle(color: colors.textSecondary, fontSize: 12)),
                trailing: user.isOnline ? Container(width: 10, height: 10,
                  decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle)) : null,
                onTap: () => _startDM(user),
              );
            },
          )),
      ]),
    );
  }
}
