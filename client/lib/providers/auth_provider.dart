import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _loading = false;
  String? _error;

  User? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  final _api = ApiService();
  final _socket = SocketService();

  Future<void> init() async {
    await _api.loadToken();
    if (_api.isLoggedIn) {
      try {
        final data = await _api.get('/auth/me');
        _user = User.fromJson(data['user']);
        _socket.connect(_api.token!);
        notifyListeners();
      } catch (_) {
        await _api.clearToken();
      }
    }
  }

  Future<bool> login(String email, String password) async {
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await _api.login(email, password);
      _user = User.fromJson(data['user']);
      await _api.saveToken(data['token'], data['refreshToken']);
      _socket.connect(data['token']);
      _loading = false; notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString(); _loading = false; notifyListeners();
      return false;
    }
  }

  Future<bool> register(String username, String email, String password) async {
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await _api.register(username, email, password);
      _user = User.fromJson(data['user']);
      await _api.saveToken(data['token'], data['refreshToken']);
      _socket.connect(data['token']);
      _loading = false; notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString(); _loading = false; notifyListeners();
      return false;
    }
  }

  void updateUser(User user) {
    _user = user;
    notifyListeners();
  }

  Future<void> logout() async {
    _socket.disconnect();
    await _api.clearToken();
    _user = null;
    notifyListeners();
  }
}
