import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'chats_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: const Color(0xFF17212B),
      appBar: AppBar(
        title: const Text('Регистрация'),
        backgroundColor: const Color(0xFF17212B),
        iconTheme: const IconThemeData(color: Color(0xFF2AABEE)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 20),
              const CircleAvatar(radius: 40, backgroundColor: Color(0xFF2AABEE),
                child: Icon(Icons.person, size: 40, color: Colors.white)),
              const SizedBox(height: 24),
              _field(_nameCtrl, 'Имя пользователя', Icons.person_outline),
              const SizedBox(height: 12),
              _field(_emailCtrl, 'Email', Icons.email_outlined),
              const SizedBox(height: 12),
              _field(_passCtrl, 'Пароль', Icons.lock_outline, obscure: _obscure,
                suffix: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    color: const Color(0xFF8B9DB5), size: 20),
                  onPressed: () => setState(() => _obscure = !_obscure),
                )),
              if (auth.error != null) ...[
                const SizedBox(height: 10),
                Text(auth.error!, style: const TextStyle(color: Color(0xFFFF6B6B), fontSize: 13)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity, height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2AABEE),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  onPressed: auth.loading ? null : _register,
                  child: auth.loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Создать аккаунт', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon,
      {bool obscure = false, Widget? suffix}) {
    return TextField(
      controller: ctrl, obscureText: obscure,
      style: const TextStyle(color: Colors.white, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF8B9DB5)),
        prefixIcon: Icon(icon, color: const Color(0xFF8B9DB5), size: 20),
        suffixIcon: suffix,
        filled: true, fillColor: const Color(0xFF232E3C),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF2AABEE), width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Future<void> _register() async {
    final ok = await context.read<AuthProvider>().register(_nameCtrl.text.trim(), _emailCtrl.text.trim(), _passCtrl.text);
    if (ok && mounted) Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const ChatsScreen()), (_) => false);
  }
}
