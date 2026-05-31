import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
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
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startDM(User user) async {
    try {
      final chat = await _api.createDM(user.id);
      if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(
        builder: (_) => ChatScreen(
          chatId: chat['id'],
          chatName: user.username,
          targetUserId: user.id,
        ),
      ));
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
        title: Container(
          height: 36,
          decoration: BoxDecoration(color: const Color(0xFF232E3C), borderRadius: BorderRadius.circular(20)),
          child: TextField(
            controller: _ctrl,
            autofocus: true,
            onChanged: _search,
            style: const TextStyle(color: Colors.white, fontSize: 15),
            decoration: const InputDecoration(
              hintText: 'Поиск по имени или email...',
              hintStyle: TextStyle(color: Color(0xFF8B9DB5)),
              prefixIcon: Icon(Icons.search, color: Color(0xFF8B9DB5), size: 20),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 8),
            ),
          ),
        ),
      ),
      body: Column(children: [
        if (_loading) const LinearProgressIndicator(color: Color(0xFF2AABEE), backgroundColor: Color(0xFF232E3C)),
        if (_users.isEmpty && !_loading)
          Expanded(child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.person_search, size: 64, color: Colors.white.withOpacity(0.1)),
            const SizedBox(height: 12),
            const Text('Введите имя или email', style: TextStyle(color: Color(0xFF8B9DB5))),
          ])))
        else
          Expanded(child: ListView.builder(
            itemCount: _users.length,
            itemBuilder: (ctx, i) {
              final user = _users[i];
              return ListTile(
                leading: CircleAvatar(
                  radius: 22, backgroundColor: const Color(0xFF2AABEE),
                  backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                  child: user.avatarUrl == null
                      ? Text(user.username[0].toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                      : null,
                ),
                title: Text(user.username,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                subtitle: Text(user.email,
                  style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 12)),
                trailing: user.isOnline
                    ? Container(width: 10, height: 10,
                        decoration: const BoxDecoration(color: Color(0xFF4DCA88), shape: BoxShape.circle))
                    : null,
                onTap: () => _startDM(user),
              );
            },
          )),
      ]),
    );
  }
}
