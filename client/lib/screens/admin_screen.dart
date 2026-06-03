import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});
  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  final _api = ApiService();
  List<User> _users = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  Future<void> _loadAll() async {
    try {
      final users = await _api.getAdminUsers();
      final stats = await _api.getAdminStats();
      if (mounted) setState(() { _users = users; _stats = stats; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _toggleVerify(User user) async {
    try {
      await _api.verifyUser(user.id, !user.isVerified);
      _loadAll();
      _snack(user.isVerified ? 'Верификация снята' : '✓ Пользователь верифицирован');
    } catch (e) { _snack(e.toString()); }
  }

  Future<void> _deleteUser(User user) async {
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF232E3C),
      title: const Text('Удалить пользователя?', style: TextStyle(color: Colors.white)),
      content: Text('${user.username} будет удалён навсегда', style: const TextStyle(color: Color(0xFF8B9DB5))),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Отмена', style: TextStyle(color: Color(0xFF8B9DB5)))),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Удалить', style: TextStyle(color: Color(0xFFFF6B6B)))),
      ],
    ));
    if (ok == true) { await _api.deleteAdminUser(user.id); _loadAll(); }
  }

  Future<void> _createChannel() async {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final usernameCtrl = TextEditingController();
    await showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF232E3C),
      title: const Text('Создать канал', style: TextStyle(color: Colors.white)),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        _field(nameCtrl, 'Название *'),
        const SizedBox(height: 10),
        _field(descCtrl, 'Описание'),
        const SizedBox(height: 10),
        _field(usernameCtrl, 'Username (необязательно)'),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена', style: TextStyle(color: Color(0xFF8B9DB5)))),
        TextButton(
          onPressed: () async {
            if (nameCtrl.text.trim().isEmpty) return;
            await _api.createAdminChannel(nameCtrl.text.trim(), descCtrl.text.trim(),
              usernameCtrl.text.isEmpty ? null : usernameCtrl.text.trim());
            if (mounted) { Navigator.pop(context); _snack('Канал создан ✓'); _loadAll(); }
          },
          child: const Text('Создать', style: TextStyle(color: Color(0xFF2AABEE), fontWeight: FontWeight.bold)),
        ),
      ],
    ));
  }

  Widget _field(TextEditingController ctrl, String hint) => TextField(
    controller: ctrl,
    style: const TextStyle(color: Colors.white),
    decoration: InputDecoration(
      hintText: hint, hintStyle: const TextStyle(color: Color(0xFF8B9DB5)),
      filled: true, fillColor: const Color(0xFF17212B),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    ),
  );

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: const Color(0xFF232E3C)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF17212B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF17212B),
        title: const Row(children: [
          Icon(Icons.admin_panel_settings, color: Color(0xFFFFD700), size: 22),
          SizedBox(width: 8),
          Text('Администратор', style: TextStyle(color: Colors.white)),
        ]),
        bottom: TabBar(
          controller: _tab,
          indicatorColor: const Color(0xFF2AABEE),
          labelColor: const Color(0xFF2AABEE),
          unselectedLabelColor: const Color(0xFF8B9DB5),
          tabs: const [Tab(text: 'Статистика'), Tab(text: 'Пользователи'), Tab(text: 'Каналы')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2AABEE)))
          : TabBarView(controller: _tab, children: [_statsTab(), _usersTab(), _channelsTab()]),
    );
  }

  Widget _statsTab() {
    final items = [
      {'icon': Icons.people, 'label': 'Пользователи', 'value': _stats['users'] ?? 0, 'color': const Color(0xFF2AABEE)},
      {'icon': Icons.chat_bubble, 'label': 'Чаты', 'value': _stats['chats'] ?? 0, 'color': const Color(0xFF4DCA88)},
      {'icon': Icons.group, 'label': 'Группы', 'value': _stats['groups'] ?? 0, 'color': const Color(0xFFFFB347)},
      {'icon': Icons.campaign, 'label': 'Каналы', 'value': _stats['channels'] ?? 0, 'color': const Color(0xFFAB5CF7)},
      {'icon': Icons.message, 'label': 'Сообщений', 'value': _stats['messages'] ?? 0, 'color': const Color(0xFFFF6B9D)},
    ];
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.count(
        crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.3,
        children: items.map((item) => Container(
          decoration: BoxDecoration(color: const Color(0xFF232E3C), borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.all(20),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(item['icon'] as IconData, color: item['color'] as Color, size: 30),
            const SizedBox(height: 10),
            Text('${item['value']}', style: TextStyle(color: item['color'] as Color, fontSize: 28, fontWeight: FontWeight.bold)),
            Text(item['label'] as String, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 12)),
          ]),
        )).toList(),
      ),
    );
  }

  Widget _usersTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _users.length,
      itemBuilder: (ctx, i) {
        final user = _users[i];
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 3),
          decoration: BoxDecoration(color: const Color(0xFF232E3C), borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: Stack(clipBehavior: Clip.none, children: [
              CircleAvatar(
                radius: 22, backgroundColor: const Color(0xFF2AABEE),
                backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                child: user.avatarUrl == null ? Text(user.username[0].toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)) : null,
              ),
              if (user.isVerified)
                Positioned(bottom: -2, right: -2,
                  child: Container(
                    width: 16, height: 16,
                    decoration: BoxDecoration(color: const Color(0xFF17212B), shape: BoxShape.circle, border: Border.all(color: const Color(0xFF17212B), width: 1)),
                    child: const Icon(Icons.verified, color: Color(0xFF2AABEE), size: 14))),
            ]),
            title: Row(children: [
              Flexible(child: Text(user.username, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                overflow: TextOverflow.ellipsis)),
              if (user.isAdmin) ...[const SizedBox(width: 4), const Icon(Icons.shield, color: Color(0xFFFFD700), size: 14)],
              if (user.isVerified && !user.isAdmin) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: Color(0xFF2AABEE), size: 14)],
            ]),
            subtitle: Text(user.email, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 12), overflow: TextOverflow.ellipsis),
            trailing: user.isAdmin ? const Icon(Icons.shield, color: Color(0xFFFFD700)) : PopupMenuButton(
              icon: const Icon(Icons.more_vert, color: Color(0xFF8B9DB5)),
              color: const Color(0xFF17212B),
              itemBuilder: (_) => [
                PopupMenuItem(onTap: () => _toggleVerify(user), child: Row(children: [
                  Icon(user.isVerified ? Icons.verified_outlined : Icons.verified, color: const Color(0xFF2AABEE), size: 18),
                  const SizedBox(width: 8),
                  Text(user.isVerified ? 'Снять верификацию' : 'Верифицировать', style: const TextStyle(color: Colors.white)),
                ])),
                PopupMenuItem(onTap: () => _deleteUser(user), child: const Row(children: [
                  Icon(Icons.delete_outline, color: Color(0xFFFF6B6B), size: 18),
                  SizedBox(width: 8),
                  Text('Удалить', style: TextStyle(color: Color(0xFFFF6B6B))),
                ])),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _channelsTab() {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2AABEE), foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.add),
            label: const Text('Создать канал', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            onPressed: _createChannel,
          ),
        ),
      ),
      const Expanded(child: Center(
        child: Text('Созданные каналы появятся\nво вкладке Каналы',
          style: TextStyle(color: Color(0xFF8B9DB5)), textAlign: TextAlign.center),
      )),
    ]);
  }
}
