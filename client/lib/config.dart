class AppConfig {
  // 🔧 CHANGE THIS to your server IP or domain
  static const String serverUrl = 'http://localhost:3000';
  static const String apiUrl = '$serverUrl/api';

  static const int messagePageSize = 50;
  static const int maxFileSizeMb = 50;
}
