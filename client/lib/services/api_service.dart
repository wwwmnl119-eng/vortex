import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/models.dart';

class ApiService {
  static final ApiService _i = ApiService._();
  factory ApiService() => _i;
  ApiService._();

  String? _token;
  String? get token => _token;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
  }

  Future<void> saveToken(String token, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('refresh_token', refreshToken);
    _token = token;
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('refresh_token');
    _token = null;
  }

  bool get isLoggedIn => _token != null;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<dynamic> _handle(http.Response res) {
    final data = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 400) throw data['error'] ?? 'Error';
    return Future.value(data);
  }

  Future<dynamic> get(String path) async {
    final res = await http.get(Uri.parse('${AppConfig.apiUrl}$path'), headers: _headers);
    return _handle(res);
  }

  Future<dynamic> post(String path, Map body) async {
    final res = await http.post(Uri.parse('${AppConfig.apiUrl}$path'), headers: _headers, body: jsonEncode(body));
    return _handle(res);
  }

  Future<dynamic> put(String path, Map body) async {
    final res = await http.put(Uri.parse('${AppConfig.apiUrl}$path'), headers: _headers, body: jsonEncode(body));
    return _handle(res);
  }

  Future<void> delete(String path) async {
    await http.delete(Uri.parse('${AppConfig.apiUrl}$path'), headers: _headers);
  }

  // ── Auth ──────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async =>
      await post('/auth/login', {'email': email, 'password': password});

  Future<Map<String, dynamic>> register(String username, String email, String password) async =>
      await post('/auth/register', {'username': username, 'email': email, 'password': password});

  // ── Chats ─────────────────────────────────────────────
  Future<List<Chat>> getChats() async {
    final data = await get('/chats') as List;
    return data.map((c) => Chat.fromJson(c)).toList();
  }

  Future<Map<String, dynamic>> createDM(String targetUserId) async =>
      await post('/chats/dm', {'targetUserId': targetUserId});

  Future<Map<String, dynamic>> createGroup(String name, List<String> memberIds) async =>
      await post('/chats/group', {'name': name, 'memberIds': memberIds});

  // ── Messages ──────────────────────────────────────────
  Future<List<Message>> getMessages(String chatId, {String? before}) async {
    final q = before != null ? '?before=$before' : '';
    final data = await get('/messages/$chatId$q') as List;
    return data.map((m) => Message.fromJson(m)).toList();
  }

  // ── Users ─────────────────────────────────────────────
  Future<List<User>> searchUsers(String query) async {
    final data = await get('/users/search?q=${Uri.encodeComponent(query)}') as List;
    return data.map((u) => User.fromJson(u)).toList();
  }

  Future<User> getMyProfile() async => User.fromJson(await get('/users/me'));

  Future<User> getUserProfile(String userId) async => User.fromJson(await get('/users/$userId'));

  Future<User> updateProfile({String? username, String? bio}) async {
    final body = <String, dynamic>{};
    if (username != null) body['username'] = username;
    if (bio != null) body['bio'] = bio;
    return User.fromJson(await put('/users/me', body));
  }

  Future<User> uploadAvatarBytes(Uint8List bytes, String ext) async {
    final base64Data = base64Encode(bytes);
    return User.fromJson(await post('/users/me/avatar', {
      'base64': 'data:image/$ext;base64,$base64Data',
      'ext': ext,
    }));
  }

  Future<Map<String, dynamic>> uploadFileBytes(Uint8List bytes, String filename, String mimeType) async {
    final req = http.MultipartRequest('POST', Uri.parse('${AppConfig.apiUrl}/files'));
    req.headers['Authorization'] = 'Bearer $_token';
    req.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final res = await req.send();
    final body = await res.stream.bytesToString();
    return jsonDecode(body);
  }

  // ── Admin ─────────────────────────────────────────────
  Future<List<User>> getAdminUsers() async {
    final data = await get('/admin/users') as List;
    return data.map((u) => User.fromJson(u)).toList();
  }

  Future<Map<String, dynamic>> getAdminStats() async => await get('/admin/stats');

  Future<void> verifyUser(String userId, bool verified) async =>
      await post('/admin/users/$userId/verify', {'verified': verified});

  Future<void> deleteAdminUser(String userId) async => await delete('/admin/users/$userId');

  Future<void> createAdminChannel(String name, String desc, String? username) async =>
      await post('/admin/channels', {'name': name, 'description': desc, 'username': username});

  // ── Channels ──────────────────────────────────────────
  Future<List<Chat>> getChannels() async {
    final data = await get('/channels') as List;
    return data.map((c) => Chat.fromJson(c)).toList();
  }

  Future<void> subscribeChannel(String id) async => await post('/channels/$id/subscribe', {});
  Future<void> unsubscribeChannel(String id) async => await delete('/channels/$id/subscribe');
}
