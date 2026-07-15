import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiService();
  late TextEditingController _nameCtrl;
  late TextEditingController _bioCtrl;
  bool _editing = false;
  bool _loading = false;
  User? _user;

  @override
  void initState() {
    super.initState();
    _user = context.read<AuthProvider>().user;
    _nameCtrl = TextEditingController(text: _user?.username ?? '');
    _bioCtrl = TextEditingController(text: _user?.bio ?? '');
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final user = await _api.getMyProfile();
      if (mounted) { setState(() { _user = user; _nameCtrl.text = user.username; _bioCtrl.text = user.bio ?? ''; }); context.read<AuthProvider>().updateUser(user); }
    } catch (_) {}
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) { _snack('Имя не может быть пустым'); return; }
    setState(() => _loading = true);
    try {
      final updated = await _api.updateProfile(username: _nameCtrl.text.trim(), bio: _bioCtrl.text.trim());
      if (mounted) { setState(() { _user = updated; _editing = false; _loading = false; }); context.read<AuthProvider>().updateUser(updated); _snack('Профиль обновлён ✓'); }
    } catch (e) { if (mounted) { setState(() => _loading = false); _snack(e.toString()); } }
  }

  Future<void> _changeAvatar() async {
    final img = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (img == null) return;
    setState(() => _loading = true);
    try {
      final bytes = await img.readAsBytes();
      final updated = await _api.uploadAvatarBytes(bytes, img.name.split('.').last);
      if (mounted) { setState(() { _user = updated; _loading = false; }); context.read<AuthProvider>().updateUser(updated); _snack('Аватар обновлён ✓'); }
    } catch (e) { if (mounted) { setState(() => _loading = false); _snack('Ошибка загрузки'); } }
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
        title: Text('Мой профиль', style: TextStyle(color: colors.textPrimary)),
        actions: [
          if (_editing)
            _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: AppColors.blue, strokeWidth: 2)))
                : TextButton(onPressed: _save, child: const Text('Сохранить', style: TextStyle(color: AppColors.blue, fontWeight: FontWeight.bold, fontSize: 15)))
          else
            IconButton(icon: const Icon(Icons.edit_outlined, color: AppColors.blue), onPressed: () => setState(() => _editing = true)),
        ],
      ),
      body: SingleChildScrollView(child: Column(children: [
        // Avatar
        Container(width: double.infinity, color: colors.appBar, padding: const EdgeInsets.symmetric(vertical: 32),
          child: Column(children: [
            GestureDetector(onTap: _changeAvatar, child: Stack(alignment: Alignment.center, children: [
              CircleAvatar(radius: 52, backgroundColor: AppColors.blue,
                backgroundImage: _user?.avatarUrl != null ? NetworkImage(_user!.avatarUrl!) : null,
                child: _user?.avatarUrl == null ? Text(_user?.username[0].toUpperCase() ?? 'V',
                  style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white)) : null),
              if (_loading) Container(width: 104, height: 104,
                decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(52)),
                child: const Center(child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))),
              Positioned(bottom: 0, right: 0, child: Container(width: 32, height: 32,
                decoration: BoxDecoration(color: AppColors.blue, shape: BoxShape.circle,
                  border: Border.all(color: colors.appBar, width: 2)),
                child: const Icon(Icons.camera_alt, color: Colors.white, size: 16))),
            ])),
            const SizedBox(height: 12),
            if (!_editing) ...[
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(_user?.username ?? '', style: TextStyle(color: colors.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                if (_user?.isVerified == true) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: AppColors.blue, size: 20)],
                if (_user?.isAdmin == true) ...[const SizedBox(width: 4), const Icon(Icons.shield, color: AppColors.gold, size: 20)],
              ]),
              if (_user?.isVerified == true) const Padding(padding: EdgeInsets.only(top: 4),
                child: Text('Верифицированный аккаунт', style: TextStyle(color: AppColors.blue, fontSize: 13))),
              if (_user?.isAdmin == true) const Padding(padding: EdgeInsets.only(top: 4),
                child: Text('Администратор', style: TextStyle(color: AppColors.gold, fontSize: 13))),
              if (_user?.bio?.isNotEmpty == true) Padding(padding: const EdgeInsets.fromLTRB(32, 8, 32, 0),
                child: Text(_user!.bio!, style: TextStyle(color: colors.textSecondary, fontSize: 14), textAlign: TextAlign.center)),
            ],
          ])),

        const SizedBox(height: 8),

        // Fields
        Container(color: colors.surface, child: Column(children: [
          _tile(Icons.person_outline, 'Имя пользователя', _user?.username ?? '', _nameCtrl, colors),
          _div(colors),
          _tile(Icons.info_outline, 'О себе', _user?.bio?.isEmpty != false ? 'Не указано' : _user!.bio!, _bioCtrl, colors, hint: 'Расскажите о себе...'),
          _div(colors),
          _tile(Icons.email_outlined, 'Email', _user?.email ?? '', TextEditingController(text: _user?.email), colors, readonly: true),
        ])),

        const SizedBox(height: 8),

        // Theme toggle
        Container(color: colors.surface, child: SwitchListTile(
          secondary: Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: AppColors.blue),
          title: Text('Тёмная тема', style: TextStyle(color: colors.textPrimary)),
          subtitle: Text(isDark ? 'Включена' : 'Выключена', style: TextStyle(color: colors.textSecondary, fontSize: 12)),
          value: isDark,
          activeColor: AppColors.blue,
          onChanged: (_) => context.read<ThemeProvider>().toggle(),
        )),

        const SizedBox(height: 8),

        // Change photo
        Container(color: colors.surface, child: ListTile(
          leading: const Icon(Icons.photo_camera_outlined, color: AppColors.blue),
          title: Text('Сменить фото профиля', style: TextStyle(color: colors.textPrimary)),
          trailing: Icon(Icons.chevron_right, color: colors.textSecondary),
          onTap: _changeAvatar,
        )),

        const SizedBox(height: 8),

        // Logout
        Container(color: colors.surface, child: ListTile(
          leading: const Icon(Icons.logout, color: AppColors.red),
          title: const Text('Выйти из аккаунта', style: TextStyle(color: AppColors.red)),
          onTap: () async {
            await context.read<AuthProvider>().logout();
            if (mounted) Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
          },
        )),

        const SizedBox(height: 24),
      ])),
    );
  }

  Widget _tile(IconData icon, String label, String value, TextEditingController ctrl, AppColors colors, {String? hint, bool readonly = false}) {
    return Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: AppColors.blue, size: 22),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 12)),
          const SizedBox(height: 4),
          _editing && !readonly
              ? TextField(controller: ctrl, style: TextStyle(color: colors.textPrimary, fontSize: 15),
                  decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(color: Color(0xFF5A6A7A)),
                    isDense: true, contentPadding: EdgeInsets.zero, border: InputBorder.none, fillColor: Colors.transparent,
                    enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppColors.blue)),
                    focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppColors.blue, width: 2))))
              : Text(value, style: TextStyle(color: colors.textPrimary, fontSize: 15)),
        ])),
      ]));
  }

  Widget _div(AppColors colors) => Divider(height: 1, color: colors.divider, indent: 54);
}
