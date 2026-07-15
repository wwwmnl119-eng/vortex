import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'chat_screen.dart';

class UserProfileScreen extends StatefulWidget {
  final String userId;
  final String username;
  const UserProfileScreen({required this.userId, required this.username, super.key});
  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  final _api = ApiService();
  User? _user;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final user = await _api.getUserProfile(widget.userId);
      if (mounted) setState(() { _user = user; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _startChat() async {
    try {
      final chat = await _api.createDM(widget.userId);
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(
        builder: (_) => ChatScreen(chatId: chat['id'], chatName: widget.username, targetUserId: widget.userId)));
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
        title: Text(widget.username, style: TextStyle(color: colors.textPrimary)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.blue))
          : _user == null
              ? Center(child: Text('Не найден', style: TextStyle(color: colors.textSecondary)))
              : Column(children: [
                  Container(width: double.infinity, color: colors.appBar, padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Column(children: [
                      CircleAvatar(radius: 52, backgroundColor: AppColors.blue,
                        backgroundImage: _user!.avatarUrl != null ? NetworkImage(_user!.avatarUrl!) : null,
                        child: _user!.avatarUrl == null ? Text(_user!.username[0].toUpperCase(),
                          style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white)) : null),
                      const SizedBox(height: 12),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text(_user!.username, style: TextStyle(color: colors.textPrimary, fontSize: 22, fontWeight: FontWeight.bold)),
                        if (_user!.isVerified) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: AppColors.blue, size: 22)],
                        if (_user!.isAdmin) ...[const SizedBox(width: 4), const Icon(Icons.shield, color: AppColors.gold, size: 22)],
                      ]),
                      const SizedBox(height: 6),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Container(width: 8, height: 8, decoration: BoxDecoration(
                          color: _user!.isOnline ? AppColors.green : colors.textSecondary, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Text(_user!.isOnline ? 'в сети' : _fmt(_user!.lastSeen),
                          style: TextStyle(color: _user!.isOnline ? AppColors.green : colors.textSecondary, fontSize: 13)),
                      ]),
                    ])),
                  const SizedBox(height: 8),
                  Container(color: colors.surface, child: Column(children: [
                    if (_user!.bio?.isNotEmpty == true) ...[
                      _tile(Icons.info_outline, 'О себе', _user!.bio!, colors),
                      Divider(height: 1, color: colors.divider, indent: 54),
                    ],
                    _tile(Icons.access_time, 'Последний визит', _user!.isOnline ? 'Онлайн' : _fmt(_user!.lastSeen), colors),
                  ])),
                  const SizedBox(height: 8),
                  Container(color: colors.surface, child: ListTile(
                    leading: const Icon(Icons.send_rounded, color: AppColors.blue),
                    title: Text('Написать сообщение', style: TextStyle(color: colors.textPrimary)),
                    trailing: Icon(Icons.chevron_right, color: colors.textSecondary),
                    onTap: _startChat,
                  )),
                ]),
    );
  }

  Widget _tile(IconData icon, String label, String value, AppColors colors) {
    return Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: AppColors.blue, size: 22),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: colors.textPrimary, fontSize: 15)),
        ])),
      ]));
  }

  String _fmt(DateTime? dt) {
    if (dt == null) return 'Давно';
    final diff = DateTime.now().difference(dt.toLocal());
    if (diff.inMinutes < 1) return 'только что';
    if (diff.inMinutes < 60) return '${diff.inMinutes} мин. назад';
    if (diff.inHours < 24) return '${diff.inHours} ч. назад';
    return DateFormat('d MMM').format(dt.toLocal());
  }
}
