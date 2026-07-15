import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/message_status_icon.dart';
import 'user_profile_screen.dart';

class ChatScreen extends StatefulWidget {
  final String chatId;
  final String chatName;
  final String? targetUserId;
  const ChatScreen({required this.chatId, required this.chatName, this.targetUserId, super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  final _api = ApiService();
  final _socket = SocketService();
  List<Message> _messages = [];
  bool _loading = true;
  bool _showAttach = false;
  String? _typingUser;
  String? _myId;

  @override
  void initState() {
    super.initState();
    _myId = context.read<AuthProvider>().user?.id;
    _loadMessages();
    _socket.joinChat(widget.chatId);
    _setupSocket();
  }

  void _setupSocket() {
    _socket.on('new_message', (data) {
      final msg = Message.fromJson(Map<String, dynamic>.from(data));
      if (msg.chatId == widget.chatId && mounted) {
        setState(() => _messages.add(msg));
        _scrollToBottom();
        _socket.markRead(widget.chatId, [msg.id]);
      }
    });

    _socket.on('messages_delivered', (data) {
      if (data['chatId'] == widget.chatId && mounted) {
        final ids = List<String>.from(data['messageIds'] ?? []);
        setState(() {
          for (int i = 0; i < _messages.length; i++) {
            if (ids.contains(_messages[i].id) && _messages[i].senderId == _myId) {
              final updated = _messages[i].deliveredTo;
              updated.add(data['userId'] ?? '');
              _messages[i] = _messages[i].copyWith(status: MessageStatus.delivered, deliveredTo: updated);
            }
          }
        });
      }
    });

    _socket.on('messages_read', (data) {
      if (data['chatId'] == widget.chatId && mounted) {
        final ids = List<String>.from(data['messageIds'] ?? []);
        setState(() {
          for (int i = 0; i < _messages.length; i++) {
            if (ids.contains(_messages[i].id) && _messages[i].senderId == _myId) {
              final updated = _messages[i].readBy;
              updated.add(data['userId'] ?? '');
              _messages[i] = _messages[i].copyWith(status: MessageStatus.read, readBy: updated);
            }
          }
        });
      }
    });

    _socket.on('user_typing', (data) {
      if (data['chatId'] == widget.chatId && data['userId'] != _myId && mounted)
        setState(() => _typingUser = data['isTyping'] ? data['userId'] : null);
    });

    _socket.on('message_deleted', (data) {
      if (data['chatId'] == widget.chatId && mounted) {
        setState(() {
          final idx = _messages.indexWhere((m) => m.id == data['messageId']);
          if (idx != -1) _messages[idx] = _messages[idx].copyWith(content: 'Сообщение удалено', isDeleted: true);
        });
      }
    });

    _socket.on('message_edited', (data) {
      final updated = Message.fromJson(Map<String, dynamic>.from(data));
      if (updated.chatId == widget.chatId && mounted) {
        setState(() {
          final idx = _messages.indexWhere((m) => m.id == updated.id);
          if (idx != -1) _messages[idx] = updated;
        });
      }
    });
  }

  Future<void> _loadMessages() async {
    try {
      final msgs = await _api.getMessages(widget.chatId);
      if (mounted) {
        setState(() { _messages = msgs; _loading = false; });
        _scrollToBottom();
        if (msgs.isNotEmpty) _socket.markRead(widget.chatId, msgs.map((m) => m.id).toList());
      }
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  void _scrollToBottom() => Future.delayed(const Duration(milliseconds: 100), () {
    if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
  });

  void _sendText() {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    _socket.sendMessage(chatId: widget.chatId, content: text);
    _ctrl.clear();
    _socket.sendTyping(widget.chatId, false);
  }

  Future<void> _sendImage() async {
    setState(() => _showAttach = false);
    final img = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (img == null) return;
    try {
      final bytes = await img.readAsBytes();
      final res = await _api.uploadFileBytes(bytes, img.name, 'image/jpeg');
      _socket.sendMessage(chatId: widget.chatId, content: img.name,
        messageType: 'image', fileUrl: res['url'], fileName: img.name,
        fileSize: bytes.length, mimeType: 'image/jpeg');
    } catch (_) { _snack('Ошибка загрузки'); }
  }

  Future<void> _sendFile() async {
    setState(() => _showAttach = false);
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result?.files.single.bytes == null) return;
    try {
      final file = result!.files.single;
      final res = await _api.uploadFileBytes(file.bytes!, file.name, 'application/octet-stream');
      _socket.sendMessage(chatId: widget.chatId, content: file.name,
        messageType: 'file', fileUrl: res['url'], fileName: file.name,
        fileSize: file.size, mimeType: 'application/octet-stream');
    } catch (_) { _snack('Ошибка загрузки'); }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: const Color(0xFF232E3C)));

  @override
  void dispose() {
    _socket.off('new_message'); _socket.off('messages_delivered');
    _socket.off('messages_read'); _socket.off('user_typing');
    _socket.off('message_deleted'); _socket.off('message_edited');
    _ctrl.dispose(); _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final colors = AppColors(isDark);

    return Scaffold(
      backgroundColor: colors.chatBg,
      appBar: AppBar(
        backgroundColor: colors.appBar,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF2AABEE)), onPressed: () => Navigator.pop(context)),
        title: GestureDetector(
          onTap: widget.targetUserId != null ? () => Navigator.push(context, MaterialPageRoute(
            builder: (_) => UserProfileScreen(userId: widget.targetUserId!, username: widget.chatName))) : null,
          child: Row(children: [
            CircleAvatar(radius: 18, backgroundColor: const Color(0xFF2AABEE),
              child: Text(widget.chatName[0].toUpperCase(),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14))),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.chatName, style: TextStyle(color: colors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
              Text(_typingUser != null ? 'печатает...' : 'нажмите для профиля',
                style: TextStyle(color: _typingUser != null ? AppColors.blue : colors.textSecondary, fontSize: 11)),
            ]),
          ]),
        ),
        actions: [
          IconButton(icon: Icon(Icons.call_outlined, color: colors.textSecondary), onPressed: () {}),
          IconButton(icon: Icon(Icons.more_vert, color: colors.textSecondary), onPressed: () {}),
        ],
      ),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF2AABEE)))
              : _messages.isEmpty
                  ? Center(child: Text('Нет сообщений', style: TextStyle(color: colors.textSecondary)))
                  : GestureDetector(
                      onTap: () => setState(() => _showAttach = false),
                      child: ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (ctx, i) {
                          final showDate = i == 0 || !_sameDay(_messages[i].createdAt, _messages[i-1].createdAt);
                          return Column(children: [
                            if (showDate) _dateDivider(_messages[i].createdAt, colors),
                            _bubble(_messages[i], colors),
                          ]);
                        },
                      ),
                    ),
        ),
        if (_showAttach) _attachPanel(colors),
        _inputBar(colors),
      ]),
    );
  }

  Widget _dateDivider(DateTime dt, AppColors colors) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Center(child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(color: colors.surface.withOpacity(0.7), borderRadius: BorderRadius.circular(12)),
        child: Text(_formatDate(dt), style: TextStyle(color: colors.textSecondary, fontSize: 12)),
      )),
    );
  }

  Widget _bubble(Message msg, AppColors colors) {
    final isMe = msg.senderId == _myId;
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: isMe && !msg.isDeleted ? () => _msgOptions(msg) : null,
        child: Container(
          margin: EdgeInsets.only(top: 2, bottom: 2, left: isMe ? 60 : 0, right: isMe ? 0 : 60),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isMe ? colors.msgOut : colors.msgIn,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isMe ? 16 : 4),
              bottomRight: Radius.circular(isMe ? 4 : 16),
            ),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (!isMe && msg.senderUsername != null)
              Padding(padding: const EdgeInsets.only(bottom: 4),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(msg.senderUsername!, style: const TextStyle(color: AppColors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                  if (msg.senderVerified) ...[const SizedBox(width: 3), const Icon(Icons.verified, color: AppColors.blue, size: 12)],
                ])),
            if (msg.messageType == 'image' && msg.fileUrl != null)
              ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(msg.fileUrl!, width: 220, fit: BoxFit.cover))
            else if (msg.messageType == 'file')
              Row(children: [
                Container(padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.blue.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.insert_drive_file_outlined, color: AppColors.blue, size: 24)),
                const SizedBox(width: 8),
                Expanded(child: Text(msg.fileName ?? 'Файл', style: TextStyle(color: colors.msgInText, fontSize: 14))),
              ])
            else
              Text(
                msg.isDeleted ? '🗑 Сообщение удалено' : (msg.content ?? ''),
                style: TextStyle(
                  color: isMe ? Colors.white : (msg.isDeleted ? colors.textSecondary : colors.msgInText),
                  fontSize: 14,
                  fontStyle: msg.isDeleted ? FontStyle.italic : FontStyle.normal,
                ),
              ),
            const SizedBox(height: 3),
            Row(mainAxisSize: MainAxisSize.min, children: [
              Text(DateFormat('HH:mm').format(msg.createdAt.toLocal()),
                style: TextStyle(color: isMe ? Colors.white60 : colors.textSecondary, fontSize: 10)),
              if (msg.isEdited) Text('  изм.', style: TextStyle(color: isMe ? Colors.white60 : colors.textSecondary, fontSize: 10)),
              if (isMe) ...[const SizedBox(width: 4), MessageStatusIcon(status: msg.status, size: 14)],
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _attachPanel(AppColors colors) {
    return Container(
      color: colors.appBar, padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
        _attachBtn(Icons.image_outlined, 'Фото', _sendImage, colors),
        _attachBtn(Icons.insert_drive_file_outlined, 'Файл', _sendFile, colors),
      ]),
    );
  }

  Widget _attachBtn(IconData icon, String label, VoidCallback onTap, AppColors colors) {
    return GestureDetector(onTap: onTap, child: Column(children: [
      Container(width: 56, height: 56, decoration: BoxDecoration(shape: BoxShape.circle, color: colors.surface),
        child: Icon(icon, color: AppColors.blue, size: 26)),
      const SizedBox(height: 6),
      Text(label, style: TextStyle(color: colors.textSecondary, fontSize: 12)),
    ]));
  }

  void _msgOptions(Message msg) {
    showModalBottomSheet(context: context, backgroundColor: context.read<ThemeProvider>().isDark ? const Color(0xFF232E3C) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 8),
        Container(width: 36, height: 4, decoration: BoxDecoration(color: const Color(0xFF8B9DB5), borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 8),
        ListTile(leading: const Icon(Icons.edit_outlined, color: AppColors.blue),
          title: const Text('Редактировать'), onTap: () { Navigator.pop(context); _editMsg(msg); }),
        ListTile(leading: const Icon(Icons.delete_outline, color: AppColors.red),
          title: const Text('Удалить', style: TextStyle(color: AppColors.red)),
          onTap: () { Navigator.pop(context); _socket.deleteMessage(msg.id, widget.chatId); }),
        const SizedBox(height: 8),
      ])),
    );
  }

  void _editMsg(Message msg) {
    final ctrl = TextEditingController(text: msg.content);
    final isDark = context.read<ThemeProvider>().isDark;
    showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: isDark ? const Color(0xFF232E3C) : Colors.white,
      title: Text('Редактировать', style: TextStyle(color: isDark ? Colors.white : Colors.black)),
      content: TextField(controller: ctrl, style: TextStyle(color: isDark ? Colors.white : Colors.black),
        decoration: const InputDecoration(
          enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppColors.blue)),
          focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppColors.blue)))),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Отмена', style: TextStyle(color: Color(0xFF8B9DB5)))),
        TextButton(onPressed: () { _socket.editMessage(msg.id, widget.chatId, ctrl.text); Navigator.pop(context); },
          child: const Text('Сохранить', style: TextStyle(color: AppColors.blue, fontWeight: FontWeight.bold))),
      ],
    ));
  }

  Widget _inputBar(AppColors colors) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      color: colors.appBar,
      child: Row(children: [
        IconButton(icon: Icon(_showAttach ? Icons.close : Icons.attach_file, color: colors.textSecondary),
          onPressed: () => setState(() => _showAttach = !_showAttach)),
        Expanded(child: Container(
          decoration: BoxDecoration(color: colors.inputBg, borderRadius: BorderRadius.circular(24)),
          child: TextField(
            controller: _ctrl,
            style: TextStyle(color: colors.textPrimary, fontSize: 15),
            maxLines: null,
            onChanged: (v) => _socket.sendTyping(widget.chatId, v.isNotEmpty),
            decoration: InputDecoration(
              hintText: 'Сообщение...', hintStyle: TextStyle(color: colors.textSecondary),
              border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              fillColor: Colors.transparent,
            ),
          ),
        )),
        const SizedBox(width: 8),
        GestureDetector(onTap: _sendText, child: Container(width: 44, height: 44,
          decoration: const BoxDecoration(color: AppColors.blue, shape: BoxShape.circle),
          child: const Icon(Icons.send_rounded, color: Colors.white, size: 20))),
      ]),
    );
  }

  bool _sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  String _formatDate(DateTime dt) {
    final now = DateTime.now(); final d = dt.toLocal();
    if (_sameDay(d, now)) return 'Сегодня';
    if (_sameDay(d, now.subtract(const Duration(days: 1)))) return 'Вчера';
    return DateFormat('d MMMM yyyy').format(d);
  }
}
