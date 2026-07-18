import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'package:provider/provider.dart';

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
  Map<String, dynamic> _settings = {};
  List<dynamic> _logs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
    _loadAll();
  }

  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  Future<void> _loadAll() async {
    try {
      final users = await _api.getAdminUsers();
      final stats = await _api.getAdminStats();
      final settings = await _api.get('/admin/settings') as Map<String, dynamic>;
      final logs = await _api.get('/admin/logs') as List;
      if (mounted) setState(() {
        _users = users; _stats = stats;
        _settings = settings; _logs = logs; _loading = false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _toggleVerify(User user) async {
    try {
      await _api.verifyUser(user.id, !user.isVerified);
      _snack(user.isVerified ? 'Верификация снята' : '✓ Верифицирован');
      _loadAll();
    } catch (e) { _snack(e.toString()); }
  }

  Future<void> _toggleDeveloper(User user) async {
    try {
      await _api.post('/admin/users/${user.id}/developer', {'developer': !user.isDeveloper});
      _snack(user.isDeveloper ? 'Роль разработчика снята' : '</> Разработчик назначен');
      _loadAll();
    } catch (e) { _snack(e.toString()); }
  }

  Future<void> _banUser(User user) async {
    final reasonCtrl = TextEditingController();
    final daysCtrl = TextEditingController(text: '7');
    final isDark = context.read<ThemeProvider>().isDark;
    await showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: isDark ? const Color(0xFF232E3C) : Colors.white,
      title: Text('Заблокировать ${user.username}', style: TextStyle(color: isDark ? Colors.white : Colors.black)),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        _dialogField(reasonCtrl, 'Причина', isDark),
        const SizedBox(height: 10),
        _dialogField(daysCtrl, 'Дней (0 = навсегда)', isDark),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена', style: TextStyle(color: Color(0xFF8B9DB5)))),
        TextButton(onPressed: () async {
          await _api.post('/admin/users/${user.id}/ban', {'reason': reasonCtrl.text, 'days': int.tryParse(daysCtrl.text) ?? 7});
          if (mounted) Navigator.pop(context);
          _snack('Пользователь заблокирован');
          _loadAll();
        }, child: const Text('Заблокировать', style: TextStyle(color: AppColors.red))),
      ],
    ));
  }

  Future<void> _deleteUser(User user) async {
    final isDark = context.read<ThemeProvider>().isDark;
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      backgroundColor: isDark ? const Color(0xFF232E3C) : Colors.white,
      title: Text('Удалить ${user.username}?', style: TextStyle(color: isDark ? Colors.white : Colors.black)),
      content: Text('Это действие необратимо', style: TextStyle(color: isDark ? const Color(0xFF8B9DB5) : Colors.grey)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Отмена')),
        TextButton(onPressed: () => Navigator.pop(context, true),
          child: const Text('Удалить', style: TextStyle(color: AppColors.red))),
      ],
    ));
    if (ok == true) { await _api.deleteAdminUser(user.id); _loadAll(); }
  }

  Future<void> _createChannel() async {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final usernameCtrl = TextEditingController();
    final isDark = context.read<ThemeProvider>().isDark;
    await showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: isDark ? const Color(0xFF232E3C) : Colors.white,
      title: Text('Создать канал', style: TextStyle(color: isDark ? Colors.white : Colors.black)),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        _dialogField(nameCtrl, 'Название *', isDark),
        const SizedBox(height: 10),
        _dialogField(descCtrl, 'Описание', isDark),
        const SizedBox(height: 10),
        _dialogField(usernameCtrl, 'Username', isDark),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена')),
        TextButton(onPressed: () async {
          if (nameCtrl.text.isEmpty) return;
          await _api.createAdminChannel(nameCtrl.text, descCtrl.text, usernameCtrl.text.isEmpty ? null : usernameCtrl.text);
          if (mounted) { Navigator.pop(context); _snack('Канал создан ✓'); _loadAll(); }
        }, child: const Text('Создать', style: TextStyle(color: AppColors.blue, fontWeight: FontWeight.bold))),
      ],
    ));
  }

  Future<void> _saveSettings() async {
    try {
      await _api.put('/admin/settings', _settings);
      _snack('Настройки сохранены ✓');
    } catch (e) { _snack(e.toString()); }
  }

  Widget _dialogField(TextEditingController ctrl, String hint, bool isDark) {
    return TextField(
      controller: ctrl,
      style: TextStyle(color: isDark ? Colors.white : Colors.black),
      decoration: InputDecoration(
        hintText: hint, hintStyle: const TextStyle(color: Color(0xFF8B9DB5)),
        filled: true, fillColor: isDark ? const Color(0xFF17212B) : const Color(0xFFF5F5F5),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: const Color(0xFF232E3C)));

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final colors = AppColors(isDark);

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        backgroundColor: colors.appBar,
        title: Row(children: [
          const Icon(Icons.admin_panel_settings, color: AppColors.gold, size: 22),
          const SizedBox(width: 8),
          Text('Администратор', style: TextStyle(color: colors.textPrimary)),
        ]),
        bottom: TabBar(
          controller: _tab,
          indicatorColor: AppColors.blue,
          labelColor: AppColors.blue,
          unselectedLabelColor: colors.textSecondary,
          isScrollable: true,
          tabs: const [Tab(text: 'Статистика'), Tab(text: 'Пользователи'), Tab(text: 'Настройки'), Tab(text: 'Логи')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.blue))
          : TabBarView(controller: _tab, children: [
              _statsTab(colors),
              _usersTab(colors),
              _settingsTab(colors),
              _logsTab(colors),
            ]),
      floatingActionButton: _tab.index == 1 ? FloatingActionButton(
        backgroundColor: AppColors.blue,
        child: const Icon(Icons.campaign, color: Colors.white),
        onPressed: _createChannel,
      ) : null,
    );
  }

  Widget _statsTab(AppColors colors) {
    final items = [
      {'icon': Icons.people, 'label': 'Пользователи', 'value': _stats['users'] ?? 0, 'color': AppColors.blue},
      {'icon': Icons.chat_bubble, 'label': 'Чаты', 'value': _stats['chats'] ?? 0, 'color': AppColors.green},
      {'icon': Icons.group, 'label': 'Группы', 'value': _stats['groups'] ?? 0, 'color': const Color(0xFFFFB347)},
      {'icon': Icons.campaign, 'label': 'Каналы', 'value': _stats['channels'] ?? 0, 'color': const Color(0xFFAB5CF7)},
      {'icon': Icons.message, 'label': 'Сообщений', 'value': _stats['messages'] ?? 0, 'color': const Color(0xFFFF6B9D)},
      {'icon': Icons.block, 'label': 'Банов', 'value': _stats['bans'] ?? 0, 'color': AppColors.red},
    ];
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.count(
        crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.3,
        children: items.map((item) => Container(
          decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.all(16),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(item['icon'] as IconData, color: item['color'] as Color, size: 28),
            const SizedBox(height: 8),
            Text('${item['value']}', style: TextStyle(color: item['color'] as Color, fontSize: 26, fontWeight: FontWeight.bold)),
            Text(item['label'] as String, style: TextStyle(color: colors.textSecondary, fontSize: 11)),
          ]),
        )).toList(),
      ),
    );
  }

  Widget _usersTab(AppColors colors) {
    return RefreshIndicator(
      onRefresh: _loadAll, color: AppColors.blue,
      child: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: _users.length,
        itemBuilder: (ctx, i) {
          final user = _users[i];
          return Container(
            margin: const EdgeInsets.symmetric(vertical: 3),
            decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              leading: Stack(clipBehavior: Clip.none, children: [
                CircleAvatar(radius: 22, backgroundColor: AppColors.blue,
                  backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                  child: user.avatarUrl == null ? Text(user.username[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)) : null),
                if (user.isVerified || user.isAdmin || user.isDeveloper)
                  Positioned(bottom: -2, right: -2,
                    child: Container(width: 16, height: 16,
                      decoration: BoxDecoration(color: colors.surface, shape: BoxShape.circle),
                      child: Icon(
                        user.isDeveloper ? Icons.code : (user.isAdmin ? Icons.shield : Icons.verified),
                        color: user.isDeveloper ? AppColors.green : (user.isAdmin ? AppColors.gold : AppColors.blue),
                        size: 14))),
              ]),
              title: Row(children: [
                Flexible(child: Text(user.username, style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
                if (user.isAdmin) ...[const SizedBox(width: 4), const Icon(Icons.shield, color: AppColors.gold, size: 13)],
                if (user.isDeveloper) ...[const SizedBox(width: 4), const Icon(Icons.code, color: AppColors.green, size: 13)],
                if (user.isVerified) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: AppColors.blue, size: 13)],
              ]),
              subtitle: Text(user.email, style: TextStyle(color: colors.textSecondary, fontSize: 12), overflow: TextOverflow.ellipsis),
              trailing: user.isAdmin ? const Icon(Icons.shield, color: AppColors.gold) : PopupMenuButton(
                icon: Icon(Icons.more_vert, color: colors.textSecondary),
                color: colors.surface,
                itemBuilder: (_) => [
                  PopupMenuItem(onTap: () => _toggleVerify(user), child: Row(children: [
                    Icon(user.isVerified ? Icons.verified_outlined : Icons.verified, color: AppColors.blue, size: 18),
                    const SizedBox(width: 8),
                    Text(user.isVerified ? 'Снять верификацию' : 'Верифицировать', style: TextStyle(color: colors.textPrimary)),
                  ])),
                  PopupMenuItem(onTap: () => _toggleDeveloper(user), child: Row(children: [
                    Icon(user.isDeveloper ? Icons.code_off : Icons.code, color: AppColors.green, size: 18),
                    const SizedBox(width: 8),
                    Text(user.isDeveloper ? 'Снять разработчика' : 'Сделать разработчиком', style: TextStyle(color: colors.textPrimary)),
                  ])),
                  PopupMenuItem(onTap: () => _banUser(user), child: const Row(children: [
                    Icon(Icons.block, color: AppColors.red, size: 18),
                    SizedBox(width: 8),
                    Text('Заблокировать', style: TextStyle(color: AppColors.red)),
                  ])),
                  PopupMenuItem(onTap: () => _deleteUser(user), child: const Row(children: [
                    Icon(Icons.delete_outline, color: AppColors.red, size: 18),
                    SizedBox(width: 8),
                    Text('Удалить', style: TextStyle(color: AppColors.red)),
                  ])),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _settingsTab(AppColors colors) {
    final fields = [
      {'key': 'app_name', 'label': 'Название приложения', 'icon': Icons.app_settings_alt},
      {'key': 'registration_enabled', 'label': 'Регистрация включена', 'icon': Icons.person_add, 'bool': true},
      {'key': 'maintenance_mode', 'label': 'Режим обслуживания', 'icon': Icons.construction, 'bool': true},
      {'key': 'maintenance_message', 'label': 'Сообщение о тех. работах', 'icon': Icons.message},
      {'key': 'max_file_size_mb', 'label': 'Макс. размер файла (МБ)', 'icon': Icons.folder},
    ];

    return ListView(padding: const EdgeInsets.all(16), children: [
      ...fields.map((f) {
        final isBool = f['bool'] == true;
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(12)),
          child: isBool
              ? SwitchListTile(
                  secondary: Icon(f['icon'] as IconData, color: AppColors.blue),
                  title: Text(f['label'] as String, style: TextStyle(color: colors.textPrimary)),
                  value: _settings[f['key']] == 'true',
                  activeColor: AppColors.blue,
                  onChanged: (v) => setState(() => _settings[f['key'] as String] = v.toString()),
                )
              : ListTile(
                  leading: Icon(f['icon'] as IconData, color: AppColors.blue),
                  title: Text(f['label'] as String, style: TextStyle(color: colors.textSecondary, fontSize: 12)),
                  subtitle: TextField(
                    controller: TextEditingController(text: _settings[f['key']] ?? ''),
                    style: TextStyle(color: colors.textPrimary),
                    onChanged: (v) => _settings[f['key'] as String] = v,
                    decoration: const InputDecoration(border: InputBorder.none, isDense: true, contentPadding: EdgeInsets.zero),
                  ),
                ),
        );
      }),
      const SizedBox(height: 16),
      SizedBox(width: double.infinity, height: 50,
        child: ElevatedButton.icon(
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue, foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          icon: const Icon(Icons.save),
          label: const Text('Сохранить настройки', style: TextStyle(fontWeight: FontWeight.bold)),
          onPressed: _saveSettings,
        )),
    ]);
  }

  Widget _logsTab(AppColors colors) {
    return RefreshIndicator(
      onRefresh: _loadAll, color: AppColors.blue,
      child: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: _logs.length,
        itemBuilder: (ctx, i) {
          final log = _logs[i];
          return Container(
            margin: const EdgeInsets.symmetric(vertical: 3),
            decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(10)),
            child: ListTile(
              leading: _logIcon(log['action']),
              title: Text(_logTitle(log['action']), style: TextStyle(color: colors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
              subtitle: Text('${log['admin_username'] ?? 'Система'} · ${_fmtDate(log['created_at'])}',
                style: TextStyle(color: colors.textSecondary, fontSize: 11)),
            ),
          );
        },
      ),
    );
  }

  Widget _logIcon(String? action) {
    switch (action) {
      case 'verify_user': return const Icon(Icons.verified, color: AppColors.blue, size: 20);
      case 'unverify_user': return const Icon(Icons.verified_outlined, color: Color(0xFF8B9DB5), size: 20);
      case 'set_developer': return const Icon(Icons.code, color: AppColors.green, size: 20);
      case 'ban_user': return const Icon(Icons.block, color: AppColors.red, size: 20);
      case 'unban_user': return const Icon(Icons.check_circle, color: AppColors.green, size: 20);
      case 'delete_user': return const Icon(Icons.delete, color: AppColors.red, size: 20);
      case 'create_channel': return const Icon(Icons.campaign, color: Color(0xFFAB5CF7), size: 20);
      case 'update_settings': return const Icon(Icons.settings, color: AppColors.gold, size: 20);
      default: return const Icon(Icons.info, color: Color(0xFF8B9DB5), size: 20);
    }
  }

  String _logTitle(String? action) {
    switch (action) {
      case 'verify_user': return 'Верификация выдана';
      case 'unverify_user': return 'Верификация снята';
      case 'set_developer': return 'Роль разработчика выдана';
      case 'unset_developer': return 'Роль разработчика снята';
      case 'ban_user': return 'Пользователь заблокирован';
      case 'unban_user': return 'Пользователь разблокирован';
      case 'delete_user': return 'Пользователь удалён';
      case 'create_channel': return 'Канал создан';
      case 'update_settings': return 'Настройки обновлены';
      default: return action ?? 'Действие';
    }
  }

  String _fmtDate(String? d) {
    if (d == null) return '';
    final dt = DateTime.tryParse(d)?.toLocal();
    if (dt == null) return '';
    return '${dt.day}.${dt.month}.${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2,'0')}';
  }
}
