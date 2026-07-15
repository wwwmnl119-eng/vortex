import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'register_screen.dart';
import 'main_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final colors = AppColors(isDark);

    return Scaffold(
      backgroundColor: colors.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
            child: Column(children: [
              Container(width: 80, height: 80,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.blue),
                child: const Icon(Icons.send_rounded, size: 40, color: Colors.white)),
              const SizedBox(height: 20),
              Text('Vortex', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: colors.textPrimary)),
              const SizedBox(height: 8),
              Text('Войдите, чтобы продолжить', style: TextStyle(color: colors.textSecondary, fontSize: 14)),
              const SizedBox(height: 40),
              _field(_emailCtrl, 'Email', Icons.email_outlined, colors),
              const SizedBox(height: 12),
              _field(_passCtrl, 'Пароль', Icons.lock_outline, colors, obscure: _obscure,
                suffix: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    color: colors.textSecondary, size: 20),
                  onPressed: () => setState(() => _obscure = !_obscure))),
              const SizedBox(height: 12),
              // Theme toggle on login screen
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: colors.textSecondary, size: 18),
                const SizedBox(width: 8),
                Text(isDark ? 'Тёмная тема' : 'Светлая тема', style: TextStyle(color: colors.textSecondary, fontSize: 13)),
                const SizedBox(width: 8),
                Switch(value: isDark, activeColor: AppColors.blue, onChanged: (_) => context.read<ThemeProvider>().toggle()),
              ]),
              Consumer<AuthProvider>(builder: (_, auth, __) {
                return Column(children: [
                  if (auth.error != null) ...[
                    const SizedBox(height: 10),
                    Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(color: AppColors.red.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                      child: Text(auth.error!, style: const TextStyle(color: AppColors.red, fontSize: 13))),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(width: double.infinity, height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue, foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0),
                      onPressed: auth.loading ? null : _login,
                      child: auth.loading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Войти', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    )),
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                    child: Text('Нет аккаунта? Зарегистрироваться', style: TextStyle(color: AppColors.blue, fontSize: 14))),
                ]);
              }),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon, AppColors colors,
      {bool obscure = false, Widget? suffix}) {
    return TextField(
      controller: ctrl, obscureText: obscure,
      style: TextStyle(color: colors.textPrimary, fontSize: 15),
      decoration: InputDecoration(
        labelText: label, labelStyle: TextStyle(color: colors.textSecondary),
        prefixIcon: Icon(icon, color: colors.textSecondary, size: 20),
        suffixIcon: suffix, filled: true, fillColor: colors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.blue, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Future<void> _login() async {
    final ok = await context.read<AuthProvider>().login(_emailCtrl.text.trim(), _passCtrl.text);
    if (ok && mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MainScreen()));
  }
}
