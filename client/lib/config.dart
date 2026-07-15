class AppConfig {
  static const String serverUrl = 'https://vortex-w2br.onrender.com';
  static const String apiUrl = '$serverUrl/api';

  // Current app version - bump this on every release
  static const String appVersion = '1.0.0';
  static const int buildNumber = 1;

  static const int messagePageSize = 50;
  static const int maxFileSizeMb = 50;
}
