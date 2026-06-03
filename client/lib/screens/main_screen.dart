import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
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
    final isAdmin = me?.isAdmin ?? false;
    final isWide = MediaQuery.of(context).size.width > 700;

    final pages = [
      const ChatsScreen(),
      const ChannelsScreen(),
      if (isAdmin) const AdminScreen(),
      const ProfileScreen(),
    ];

    if (isWide) {
      // Desktop layout — sidebar + content
      return Scaffold(
        backgroundColor: const Color(0xFF0E1621),
        body: Row(children: [
          _Sidebar(
            index: _index,
            isAdmin: isAdmin,
            user: me,
            onTap: (i) => setState(() => _index = i),
          ),
          Expanded(child: pages[_index]),
        ]),
      );
    }

    // Mobile layout — bottom nav
    final navItems = [
      const BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: 'Чаты'),
      const BottomNavigationBarItem(icon: Icon(Icons.campaign_outlined), activeIcon: Icon(Icons.campaign), label: 'Каналы'),
      if (isAdmin) const BottomNavigationBarItem(icon: Icon(Icons.admin_panel_settings_outlined), activeIcon: Icon(Icons.admin_panel_settings), label: 'Админ'),
      const BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Профиль'),
    ];

    return Scaffold(
      body: pages[_index],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFF232E3C), width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _index,
          onTap: (i) => setState(() => _index = i),
          backgroundColor: const Color(0xFF17212B),
          selectedItemColor: const Color(0xFF2AABEE),
          unselectedItemColor: const Color(0xFF8B9DB5),
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 11,
          unselectedFontSize: 11,
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
  final Function(int) onTap;

  const _Sidebar({required this.index, required this.isAdmin, required this.user, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final items = [
      _SidebarItem(icon: Icons.chat_bubble_outline, activeIcon: Icons.chat_bubble, label: 'Чаты', index: 0),
      _SidebarItem(icon: Icons.campaign_outlined, activeIcon: Icons.campaign, label: 'Каналы', index: 1),
      if (isAdmin) _SidebarItem(icon: Icons.admin_panel_settings_outlined, activeIcon: Icons.admin_panel_settings, label: 'Админ', index: 2),
      _SidebarItem(icon: Icons.person_outline, activeIcon: Icons.person, label: 'Профиль', index: isAdmin ? 3 : 2),
    ];

    return Container(
      width: 240,
      color: const Color(0xFF17212B),
      child: Column(children: [
        const SizedBox(height: 48),
        // Logo
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: Row(children: [
            Container(
              width: 36, height: 36,
              decoration: const BoxDecoration(color: Color(0xFF2AABEE), shape: BoxShape.circle),
              child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            const Text('Vortex', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          ]),
        ),
        const Divider(color: Color(0xFF232E3C), height: 1),
        const SizedBox(height: 8),
        ...items.map((item) => _buildItem(item)),
        const Spacer(),
        const Divider(color: Color(0xFF232E3C), height: 1),
        // User info
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFF2AABEE),
              backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
              child: user?.avatarUrl == null
                  ? Text(user?.username[0].toUpperCase() ?? 'V',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14))
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(user?.username ?? '',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                  overflow: TextOverflow.ellipsis)),
                if (user?.isVerified == true) ...[
                  const SizedBox(width: 3),
                  const Icon(Icons.verified, color: Color(0xFF2AABEE), size: 13),
                ],
              ]),
              Text(user?.isAdmin == true ? 'Администратор' : 'Пользователь',
                style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 11)),
            ])),
          ]),
        ),
        const SizedBox(height: 8),
      ]),
    );
  }

  Widget _buildItem(_SidebarItem item) {
    final isActive = index == item.index;
    return GestureDetector(
      onTap: () => onTap(item.index),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF2AABEE).withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(children: [
          Icon(isActive ? item.activeIcon : item.icon,
            color: isActive ? const Color(0xFF2AABEE) : const Color(0xFF8B9DB5), size: 20),
          const SizedBox(width: 12),
          Text(item.label, style: TextStyle(
            color: isActive ? const Color(0xFF2AABEE) : const Color(0xFF8B9DB5),
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            fontSize: 14,
          )),
        ]),
      ),
    );
  }
}

class _SidebarItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int index;
  const _SidebarItem({required this.icon, required this.activeIcon, required this.label, required this.index});
}
