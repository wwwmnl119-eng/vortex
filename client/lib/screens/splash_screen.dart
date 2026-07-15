import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../providers/auth_provider.dart';
import '../services/version_service.dart';
import '../theme/app_theme.dart';
import 'force_update_screen.dart';
import 'main_screen.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _anim;
  late Animation<double> _scale;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(duration: const Duration(milliseconds: 800), vsync: this);
    _scale = Tween(begin: 0.5, end: 1.0).animate(CurvedAnimation(parent: _anim, curve: Curves.elasticOut));
    _fade = Tween(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _anim, curve: Curves.easeIn));
    _anim.forward();
    _init();
  }

  @override
  void dispose() { _anim.dispose(); super.dispose(); }

  Future<void> _init() async {
    await Future.delayed(const Duration(milliseconds: 1200));

    // Check version
    final versionInfo = await VersionService.check();
    if (versionInfo != null && versionInfo.needsUpdate && mounted) {
      Navigator.pushReplacement(context, MaterialPageRoute(
        builder: (_) => ForceUpdateScreen(versionInfo: versionInfo)));
      return;
    }

    // Check auth
    final auth = context.read<AuthProvider>();
    if (mounted) {
      Navigator.pushReplacement(context, MaterialPageRoute(
        builder: (_) => auth.isLoggedIn ? const MainScreen() : const LoginScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF17212B),
      body: Center(
        child: FadeTransition(
          opacity: _fade,
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            ScaleTransition(
              scale: _scale,
              child: Container(
                width: 100, height: 100,
                decoration: BoxDecoration(
                  color: AppColors.blue,
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: AppColors.blue.withOpacity(0.4), blurRadius: 30, spreadRadius: 5)],
                ),
                child: const Icon(Icons.send_rounded, size: 50, color: Colors.white),
              ),
            ),
            const SizedBox(height: 24),
            const Text('Vortex', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 2)),
            const SizedBox(height: 8),
            const Text('Общайся без границ', style: TextStyle(color: Color(0xFF8B9DB5), fontSize: 14)),
            const SizedBox(height: 60),
            const SizedBox(width: 24, height: 24,
              child: CircularProgressIndicator(color: AppColors.blue, strokeWidth: 2)),
          ]),
        ),
      ),
    );
  }
}
