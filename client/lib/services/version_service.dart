import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class VersionInfo {
  final String latestVersion;
  final String minVersion;
  final bool forceUpdate;
  final String updateUrl;
  final String changelog;
  final String storeUrlAndroid;
  final String storeUrlIos;

  VersionInfo({
    required this.latestVersion,
    required this.minVersion,
    required this.forceUpdate,
    required this.updateUrl,
    required this.changelog,
    required this.storeUrlAndroid,
    required this.storeUrlIos,
  });

  factory VersionInfo.fromJson(Map<String, dynamic> j) => VersionInfo(
    latestVersion: j['latest_version'] ?? '1.0.0',
    minVersion: j['min_version'] ?? '1.0.0',
    forceUpdate: j['force_update'] ?? false,
    updateUrl: j['update_url'] ?? '',
    changelog: j['changelog'] ?? '',
    storeUrlAndroid: j['store_url_android'] ?? '',
    storeUrlIos: j['store_url_ios'] ?? '',
  );

  bool get needsUpdate => _compareVersions(AppConfig.appVersion, minVersion) < 0;
  bool get hasUpdate => _compareVersions(AppConfig.appVersion, latestVersion) < 0;

  // Compare semantic versions: returns -1 if a < b, 0 if equal, 1 if a > b
  int _compareVersions(String a, String b) {
    final aParts = a.split('.').map(int.parse).toList();
    final bParts = b.split('.').map(int.parse).toList();
    for (int i = 0; i < 3; i++) {
      final av = i < aParts.length ? aParts[i] : 0;
      final bv = i < bParts.length ? bParts[i] : 0;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  }
}

class VersionService {
  static Future<VersionInfo?> check() async {
    try {
      final res = await http.get(Uri.parse('${AppConfig.apiUrl}/version'))
          .timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        return VersionInfo.fromJson(jsonDecode(res.body));
      }
    } catch (_) {}
    return null;
  }
}
