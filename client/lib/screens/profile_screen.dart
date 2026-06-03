import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

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
      if (mounted) {
        setState(() { _user = user; _nameCtrl.text = user.username; _bioCtrl.text = user.bio ?? ''; });
        context.read<AuthProvider>().updateUser(user);
      }
    } catch (_) {}
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) { _snack('Имя не может быть пустым'); return; }
    setState(() => _loading = true);
    try {
      final updated = await _api.updateProfile(username: _nameCtrl.text.trim(), bio: _bioCtrl.text.trim());
      if (mounted) {
        setState(() { _user = updated; _editing = false; _loading = false; });
        context.read<AuthProvider>().updateUser(updated);
        _snack('Профиль обновлён ✓');
      }
    } catch (e) { if (mounted) { setState(() => _loading = false); _snack(e.toString()); } }
  }

  Future<void> _changeAvatar() async {
    final img = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (img == null) return;
    setState(() => _loading = true);
    try {
      final bytes = await img.readAsBytes();
      final ext = img.name.split('.').last.toLowerCase();
      final updated = await _api.uploadAvatarBytes(bytes, ext);
      if (mounted) {
        setState(() { _user = updated; _loading = false; });
        context.read<AuthProvider>().updateUser(updated);
        _snack('Аватар обновлён ✓');
      }
    } catch (e) { if (mounted) { setState(() => _loading = false); _snack('Ошибка загрузки'); } }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: const Color(0xFF232E3C)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF17212B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF17212B),
        title: const Text('Мой профиль', style: TextStyle(color: Colors.white)),
        actions: [
          if (_editing)
            _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Color(0xFF2AABEE), strokeWidth: 2)))
                : TextButton(onPressed: _save, child: const Text('Сохранить', style: TextStyle(color: Color(0xFF2AABEE), fontWeight: FontWeight.bold, fontSize: 15)))
          else
            IconButton(icon: const Icon(Icons.edit_outlined, color: Color(0xFF2AABEE)), onPressed: () => setState(() => _editing = true)),
        ],
      ),
      body: SingleChildScrollView(child: Column(children: [
        // Avatar header
        Container(
          width: double.infinity, color: const Color(0xFF17212B),
          padding: const EdgeInsets.symmetric(vertical: 32),
          child: Column(children: [
            GestureDetector(
              onTap: _changeAvatar,
              child: Stack(alignment: Alignment.center, children: [
                CircleAvatar(
                  radius: 52, backgroundColor: const Color(0xFF2AABEE),
                  backgroundImage: _user?.avatarUrl != null ? NetworkImage(_user!.avatarUrl!) : null,
                  child: _user?.avatarUrl == null ? Text(_user?.username[0].toUpperCase() ?? 'V',
                    style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white)) : null,
                ),
                if (_loading) Container(width: 104, height: 104,
                  decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(52)),
                  child: const Center(child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))),
                Positioned(bottom: 0, right: 0,
                  child: Container(width: 32, height: 32,
                    decoration: BoxDecoration(color: const Color(0xFF2AABEE), shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF17212B), width: 2)),
                    child: const Icon(Icons.camera_alt, color: Colors.white, size: 16))),
              ]),
            ),
            const SizedBox(height: 12),
            if (!_editing) ...[
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(_user?.username ?? '', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                if (_user?.isVerified == true) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: Color(0xFF2AABEE), size: 20)],
                if (_user?.isAdmin == true) ...[const SizedBox(width: 4), const Icon(Icons.shield, color: Color(0xFFFFD700), size: 20)],
              ]),
              if (_user?.isVerified == true) const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text('Верифицированный аккаунт', style: TextStyle(color: Color(0xFF2AABEE), fontSize: 13)),
              ),
              if (_user?.isAdmin == true) const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text('Администратор', style: TextStyle(color: Color(0xFFFFD700), fontSize: 13)),
              ),
              if (_user?.bio != null && _user!.bio!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Padding(padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(_user!.bio!, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 14), textAlign: TextAlign.center)),
              ],
            ],
          ]),
        ),

        const SizedBox(height: 8),

        Container(color: const Color(0xFF232E3C), child: Column(children: [
          _tile(Icons.person_outline, 'Имя пользователя', _user?.username ?? '', _nameCtrl),
          _divider(),
          _tile(Icons.info_outline, 'О себе', _user?.bio?.isEmpty != false ? 'Не указано' : _user!.bio!, _bioCtrl, hint: 'Расскажите о себе...'),
          _divider(),
          _tile(Icons.email_outlined, 'Email', _user?.email ?? '', TextEditingController(text: _user?.email), readonly: true),
        ])),

        const SizedBox(height: 8),

        Container(color: const Color(0xFF232E3C), child: ListTile(
          leading: const Icon(Icons.photo_camera_outlined, color: Color(0xFF2AABEE)),
          title: const Text('Сменить фото профиля', style: TextStyle(color: Colors.white)),
          trailing: const Icon(Icons.chevron_right, color: Color(0xFF8B9DB5)),
          onTap: _changeAvatar,
        )),

        const SizedBox(height: 24),
      ])),
    );
  }

  Widget _tile(IconData icon, String label, String value, TextEditingController ctrl,
      {String? hint, bool readonly = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: const Color(0xFF2AABEE), size: 22),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 12)),
          const SizedBox(height: 4),
          _editing && !readonly
              ? TextField(controller: ctrl, style: const TextStyle(color: Colors.white, fontSize: 15),
                  decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(color: Color(0xFF5A6A7A)),
                    isDense: true, contentPadding: EdgeInsets.zero, border: InputBorder.none,
                    enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF2AABEE))),
                    focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF2AABEE), width: 2))))
              : Text(value, style: const TextStyle(color: Colors.white, fontSize: 15)),
        ])),
      ]),
    );
  }

  Widget _divider() => const Divider(height: 1, color: Color(0xFF17212B), indent: 54);
}
