import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';

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
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final user = await _api.getUserProfile(widget.userId);
      if (mounted) setState(() { _user = user; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startChat() async {
    try {
      await _api.createDM(widget.userId);
      if (mounted) Navigator.pop(context);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF17212B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF17212B),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2AABEE)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(widget.username, style: const TextStyle(color: Colors.white)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2AABEE)))
          : _user == null
              ? const Center(child: Text('Пользователь не найден', style: TextStyle(color: Color(0xFF8B9DB5))))
              : Column(children: [
                  // Header
                  Container(
                    width: double.infinity,
                    color: const Color(0xFF17212B),
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Column(children: [
                      CircleAvatar(
                        radius: 52,
                        backgroundColor: const Color(0xFF2AABEE),
                        backgroundImage: _user!.avatarUrl != null ? NetworkImage(_user!.avatarUrl!) : null,
                        child: _user!.avatarUrl == null
                            ? Text(_user!.username[0].toUpperCase(),
                                style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white))
                            : null,
                      ),
                      const SizedBox(height: 12),
                      Text(_user!.username,
                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Container(
                          width: 8, height: 8,
                          decoration: BoxDecoration(
                            color: _user!.isOnline ? const Color(0xFF4DCA88) : const Color(0xFF8B9DB5),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _user!.isOnline ? 'в сети' : _formatLastSeen(_user!.lastSeen),
                          style: TextStyle(
                            color: _user!.isOnline ? const Color(0xFF4DCA88) : const Color(0xFF8B9DB5),
                            fontSize: 13,
                          ),
                        ),
                      ]),
                    ]),
                  ),

                  const SizedBox(height: 8),

                  // Info
                  Container(
                    color: const Color(0xFF232E3C),
                    child: Column(children: [
                      if (_user!.bio != null && _user!.bio!.isNotEmpty) ...[
                        _infoTile(Icons.info_outline, 'О себе', _user!.bio!),
                        const Divider(height: 1, color: Color(0xFF17212B), indent: 54),
                      ],
                      _infoTile(Icons.access_time, 'Последний визит',
                        _user!.isOnline ? 'Сейчас онлайн' : _formatLastSeen(_user!.lastSeen)),
                    ]),
                  ),

                  const SizedBox(height: 8),

                  // Message button
                  Container(
                    color: const Color(0xFF232E3C),
                    child: ListTile(
                      leading: const Icon(Icons.send_rounded, color: Color(0xFF2AABEE)),
                      title: const Text('Написать сообщение', style: TextStyle(color: Colors.white)),
                      trailing: const Icon(Icons.chevron_right, color: Color(0xFF8B9DB5)),
                      onTap: _startChat,
                    ),
                  ),
                ]),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: const Color(0xFF2AABEE), size: 22),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 15)),
        ])),
      ]),
    );
  }

  String _formatLastSeen(DateTime? dt) {
    if (dt == null) return 'Давно';
    final now = DateTime.now();
    final diff = now.difference(dt.toLocal());
    if (diff.inMinutes < 1) return 'только что';
    if (diff.inMinutes < 60) return '${diff.inMinutes} мин. назад';
    if (diff.inHours < 24) return '${diff.inHours} ч. назад';
    return DateFormat('d MMM', 'ru').format(dt.toLocal());
  }
}
