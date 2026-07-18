import 'package:flutter/material.dart';

class AppTheme {
  static const blue = Color(0xFF2AABEE);

  static ThemeData dark() => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF17212B),
    colorScheme: const ColorScheme.dark(primary: blue, secondary: blue, surface: Color(0xFF232E3C)),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF17212B), elevation: 0,
      titleTextStyle: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
      iconTheme: IconThemeData(color: Color(0xFF8B9DB5)),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Color(0xFF17212B), selectedItemColor: blue, unselectedItemColor: Color(0xFF8B9DB5),
    ),
  );

  static ThemeData light() => ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: const Color(0xFFF0F2F5),
    colorScheme: const ColorScheme.light(primary: blue, secondary: blue, surface: Colors.white),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white, elevation: 0,
      titleTextStyle: TextStyle(color: Color(0xFF1A1A1A), fontSize: 18, fontWeight: FontWeight.w600),
      iconTheme: IconThemeData(color: Color(0xFF8B9DB5)),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white, selectedItemColor: blue, unselectedItemColor: Color(0xFF8B9DB5),
    ),
  );
}

class AppColors {
  final bool isDark;
  const AppColors(this.isDark);

  Color get bg => isDark ? const Color(0xFF17212B) : const Color(0xFFF0F2F5);
  Color get surface => isDark ? const Color(0xFF232E3C) : Colors.white;
  Color get chatBg => isDark ? const Color(0xFF0E1621) : const Color(0xFFDAE5F0);
  Color get msgOut => isDark ? const Color(0xFF2B5278) : const Color(0xFF2AABEE);
  Color get msgIn => isDark ? const Color(0xFF182533) : Colors.white;
  Color get msgOutText => Colors.white;
  Color get msgInText => isDark ? Colors.white : const Color(0xFF1A1A1A);
  Color get textPrimary => isDark ? Colors.white : const Color(0xFF1A1A1A);
  Color get textSecondary => const Color(0xFF8B9DB5);
  Color get border => isDark ? const Color(0xFF232E3C) : const Color(0xFFE0E0E0);
  Color get inputBg => isDark ? const Color(0xFF232E3C) : Colors.white;
  Color get appBar => isDark ? const Color(0xFF17212B) : Colors.white;
  Color get divider => isDark ? const Color(0xFF232E3C) : const Color(0xFFE8E8E8);

  static const blue = Color(0xFF2AABEE);
  static const green = Color(0xFF4DCA88);
  static const red = Color(0xFFFF6B6B);
  static const gold = Color(0xFFFFD700);
}
