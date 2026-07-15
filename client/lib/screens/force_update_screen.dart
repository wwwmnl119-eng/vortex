import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../config.dart';
import '../services/version_service.dart';
import '../theme/app_theme.dart';

class ForceUpdateScreen extends StatelessWidget {
  final VersionInfo versionInfo;
  const ForceUpdateScreen({required this.versionInfo, super.key});

  void _openUpdate(BuildContext context) {
    String url = '';
    if (defaultTargetPlatform == TargetPlatform.android) {
      url = versionInfo.updateUrl.isNotEmpty ? versionInfo.updateUrl : versionInfo.storeUrlAndroid;
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      url = versionInfo.storeUrlIos;
    } else {
      url = versionInfo.updateUrl;
    }
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ссылка недоступна — обратитесь к администратору')));
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Перейдите: $url'), duration: const Duration(seconds: 10)));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: const Color(0xFF17212B),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Container(
                  width: 100, height: 100,
                  decoration: BoxDecoration(
                    color: AppColors.blue.withOpacity(0.1),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.blue.withOpacity(0.3), width: 2),
                  ),
                  child: const Icon(Icons.system_update_rounded, color: AppColors.blue, size: 50),
                ),
                const SizedBox(height: 32),

                const Text('Требуется обновление',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center),
                const SizedBox(height: 12),
                Text(
                  'Версия ${versionInfo.latestVersion} содержит важные изменения. '
                  'Обновите приложение чтобы продолжить.',
                  style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 15, height: 1.5),
                  textAlign: TextAlign.center),
                const SizedBox(height: 24),

                if (versionInfo.changelog.isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF232E3C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.blue.withOpacity(0.2))),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Row(children: [
                        Icon(Icons.new_releases_outlined, color: AppColors.blue, size: 16),
                        SizedBox(width: 6),
                        Text('Что нового', style: TextStyle(color: AppColors.blue, fontWeight: FontWeight.bold, fontSize: 13)),
                      ]),
                      const SizedBox(height: 8),
                      Text(versionInfo.changelog,
                        style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.5)),
                    ]),
                  ),
                const SizedBox(height: 32),

                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  _badge('Текущая', 'v${AppConfig.appVersion}', AppColors.red),
                  const SizedBox(width: 16),
                  const Icon(Icons.arrow_forward, color: Color(0xFF8B9DB5), size: 16),
                  const SizedBox(width: 16),
                  _badge('Новая', 'v${versionInfo.latestVersion}', AppColors.green),
                ]),
                const SizedBox(height: 32),

                SizedBox(width: double.infinity, height: 54,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.blue, foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                    icon: const Icon(Icons.download_rounded),
                    label: const Text('Обновить приложение',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    onPressed: () => _openUpdate(context),
                  )),
                const SizedBox(height: 16),
                const Text('Обновление обязательно для продолжения',
                  style: TextStyle(color: Color(0xFF5A6A7A), fontSize: 12), textAlign: TextAlign.center),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _badge(String label, String version, Color color) {
    return Column(children: [
      Text(label, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 11)),
      const SizedBox(height: 4),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3))),
        child: Text(version, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13))),
    ]);
  }
}
