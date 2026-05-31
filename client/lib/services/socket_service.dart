import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config.dart';

class SocketService {
  static final SocketService _i = SocketService._();
  factory SocketService() => _i;
  SocketService._();

  IO.Socket? _socket;
  bool get isConnected => _socket?.connected ?? false;

  void connect(String token) {
    disconnect();
    _socket = IO.io(AppConfig.serverUrl, IO.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': token})
        .disableAutoConnect()
        .enableReconnection()
        .setReconnectionAttempts(10)
        .setReconnectionDelay(1000)
        .build());

    _socket!.connect();
    _socket!.onConnect((_) {
      print('✅ Socket connected');
      _socket!.emit('join_chats');
    });
    _socket!.onDisconnect((_) => print('❌ Socket disconnected'));
    _socket!.onConnectError((e) => print('Socket connect error: $e'));
  }

  void joinChat(String chatId) => _socket?.emit('join_chat', {'chatId': chatId});

  void disconnect() {
    _socket?.disconnect();
    _socket?.destroy();
    _socket = null;
  }

  void sendMessage({
    required String chatId, required String content,
    String messageType = 'text', String? fileUrl,
    String? fileName, int? fileSize, String? mimeType, String? replyTo,
  }) {
    _socket?.emit('send_message', {
      'chatId': chatId, 'content': content, 'messageType': messageType,
      'fileUrl': fileUrl, 'fileName': fileName, 'fileSize': fileSize,
      'mimeType': mimeType, 'replyTo': replyTo,
    });
  }

  void sendTyping(String chatId, bool isTyping) =>
      _socket?.emit('typing', {'chatId': chatId, 'isTyping': isTyping});

  void markRead(String chatId, List<String> messageIds) =>
      _socket?.emit('read_messages', {'chatId': chatId, 'messageIds': messageIds});

  void deleteMessage(String messageId, String chatId) =>
      _socket?.emit('delete_message', {'messageId': messageId, 'chatId': chatId});

  void editMessage(String messageId, String chatId, String content) =>
      _socket?.emit('edit_message', {'messageId': messageId, 'chatId': chatId, 'content': content});

  void callUser(String targetUserId, dynamic offer, String callType) =>
      _socket?.emit('call_user', {'targetUserId': targetUserId, 'offer': offer, 'callType': callType});

  void answerCall(String targetUserId, dynamic answer) =>
      _socket?.emit('call_answer', {'targetUserId': targetUserId, 'answer': answer});

  void rejectCall(String targetUserId) =>
      _socket?.emit('call_reject', {'targetUserId': targetUserId});

  void sendIceCandidate(String targetUserId, dynamic candidate) =>
      _socket?.emit('ice_candidate', {'targetUserId': targetUserId, 'candidate': candidate});

  void endCall(String targetUserId) =>
      _socket?.emit('end_call', {'targetUserId': targetUserId});

  void on(String event, Function(dynamic) handler) => _socket?.on(event, handler);
  void off(String event) => _socket?.off(event);
}
