import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/chats_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthProvider();
  await auth.init();
  runApp(ChangeNotifierProvider.value(value: auth, child: const VortexApp()));
}

class VortexApp extends StatelessWidget {
  const VortexApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vortex',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF17212B),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF2AABEE),
          secondary: Color(0xFF2AABEE),
          surface: Color(0xFF232E3C),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF17212B),
          elevation: 0,
          titleTextStyle: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
          iconTheme: IconThemeData(color: Color(0xFF8B9DB5)),
        ),
        dividerColor: const Color(0xFF232E3C),
        textTheme: const TextTheme(
          bodyMedium: TextStyle(color: Colors.white),
        ),
      ),
      home: context.watch<AuthProvider>().isLoggedIn ? const ChatsScreen() : const LoginScreen(),
    );
  }
}
