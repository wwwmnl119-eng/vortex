import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'chats_screen.dart';
import 'channels_screen.dart';
import 'admin_screen.dart';
import 'profile_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthProvider>().user;
    final isDark = context.watch<ThemeProvider>().isDark;
    final colors = AppColors(isDark);
    final isAdmin = me?.isAdmin ?? false;
    final isWide = MediaQuery.of(context).size.width > 700;

    final pages = [
      const ChatsScreen(),
      const ChannelsScreen(),
      if (isAdmin) const AdminScreen(),
      const ProfileScreen(),
    ];

    final navItems = [
      BottomNavigationBarItem(icon: const Icon(Icons.chat_bubble_outline), activeIcon: const Icon(Icons.chat_bubble), label: 'Чаты'),
      BottomNavigationBarItem(icon: const Icon(Icons.campaign_outlined), activeIcon: const Icon(Icons.campaign), label: 'Каналы'),
      if (isAdmin) BottomNavigationBarItem(icon: const Icon(Icons.admin_panel_settings_outlined), activeIcon: const Icon(Icons.admin_panel_settings), label: 'Админ'),
      BottomNavigationBarItem(icon: const Icon(Icons.person_outline), activeIcon: const Icon(Icons.person), label: 'Профиль'),
    ];

    if (isWide) {
      return Scaffold(
        backgroundColor: colors.chatBg,
        body: Row(children: [
          _Sidebar(index: _index, isAdmin: isAdmin, user: me, colors: colors, isDark: isDark, onTap: (i) => setState(() => _index = i)),
          Expanded(child: pages[_index]),
        ]),
      );
    }

    return Scaffold(
      body: pages[_index],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(border: Border(top: BorderSide(color: colors.divider, width: 0.5))),
        child: BottomNavigationBar(
          currentIndex: _index,
          onTap: (i) => setState(() => _index = i),
          backgroundColor: colors.appBar,
          selectedItemColor: AppColors.blue,
          unselectedItemColor: colors.textSecondary,
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 11, unselectedFontSize: 11,
          items: navItems,
        ),
      ),
    );
  }
}

class _Sidebar extends StatelessWidget {
  final int index;
  final bool isAdmin;
  final dynamic user;
  final AppColors colors;
  final bool isDark;
  final Function(int) onTap;

  const _Sidebar({required this.index, required this.isAdmin, required this.user,
    required this.colors, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final items = [
      _Item(Icons.chat_bubble_outline, Icons.chat_bubble, 'Чаты', 0),
      _Item(Icons.campaign_outlined, Icons.campaign, 'Каналы', 1),
      if (isAdmin) _Item(Icons.admin_panel_settings_outlined, Icons.admin_panel_settings, 'Админ', 2),
      _Item(Icons.person_outline, Icons.person, 'Профиль', isAdmin ? 3 : 2),
    ];

    return Container(
      width: 240, color: colors.appBar,
      child: Column(children: [
        const SizedBox(height: 48),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(children: [
            Container(width: 36, height: 36, decoration: const BoxDecoration(color: AppColors.blue, shape: BoxShape.circle),
              child: const Icon(Icons.send_rounded, color: Colors.white, size: 18)),
            const SizedBox(width: 10),
            Text('Vortex', style: TextStyle(color: colors.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
          ])),
        Divider(color: colors.divider, height: 1),
        const SizedBox(height: 8),
        ...items.map((item) => _buildItem(item)),
        const Spacer(),
        Divider(color: colors.divider, height: 1),
        // Theme toggle in sidebar
        Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(children: [
            Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: colors.textSecondary, size: 18),
            const SizedBox(width: 8),
            Text(isDark ? 'Тёмная' : 'Светлая', style: TextStyle(color: colors.textSecondary, fontSize: 13)),
            const Spacer(),
            Switch(value: isDark, activeColor: AppColors.blue, onChanged: (_) => context.read<ThemeProvider>().toggle()),
          ])),
        // User info
        Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Row(children: [
            CircleAvatar(radius: 18, backgroundColor: AppColors.blue,
              backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
              child: user?.avatarUrl == null ? Text(user?.username[0].toUpperCase() ?? 'V',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)) : null),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(user?.username ?? '', style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13), overflow: TextOverflow.ellipsis)),
                if (user?.isVerified == true) ...[const SizedBox(width: 3), const Icon(Icons.verified, color: AppColors.blue, size: 13)],
                if (user?.isAdmin == true) ...[const SizedBox(width: 3), const Icon(Icons.shield, color: AppColors.gold, size: 13)],
              ]),
              Text(user?.isAdmin == true ? 'Администратор' : 'Пользователь',
                style: TextStyle(color: colors.textSecondary, fontSize: 11)),
            ])),
          ])),
      ]),
    );
  }

  Widget _buildItem(_Item item) {
    final isActive = index == item.index;
    return GestureDetector(
      onTap: () => onTap(item.index),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? AppColors.blue.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(10)),
        child: Row(children: [
          Icon(isActive ? item.activeIcon : item.icon,
            color: isActive ? AppColors.blue : colors.textSecondary, size: 20),
          const SizedBox(width: 12),
          Text(item.label, style: TextStyle(
            color: isActive ? AppColors.blue : colors.textSecondary,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal, fontSize: 14)),
        ]),
      ),
    );
  }
}

class _Item {
  final IconData icon, activeIcon;
  final String label;
  final int index;
  const _Item(this.icon, this.activeIcon, this.label, this.index);
}
