import 'package:flutter/material.dart';

class UserBadge extends StatelessWidget {
  final bool isVerified;
  final bool isAdmin;
  final bool isDeveloper;
  final double size;

  const UserBadge({
    this.isVerified = false, this.isAdmin = false,
    this.isDeveloper = false, this.size = 14, super.key,
  });

  @override
  Widget build(BuildContext context) {
    if (isDeveloper) return Icon(Icons.code, color: const Color(0xFF4DCA88), size: size);
    if (isAdmin) return Icon(Icons.shield, color: const Color(0xFFFFD700), size: size);
    if (isVerified) return Icon(Icons.verified, color: const Color(0xFF2AABEE), size: size);
    return const SizedBox.shrink();
  }
}

class UsernameRow extends StatelessWidget {
  final String username;
  final bool isVerified;
  final bool isAdmin;
  final bool isDeveloper;
  final TextStyle? style;
  final double badgeSize;

  const UsernameRow({
    required this.username, this.isVerified = false,
    this.isAdmin = false, this.isDeveloper = false,
    this.style, this.badgeSize = 14, super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Flexible(child: Text(username,
        style: style ?? const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        overflow: TextOverflow.ellipsis)),
      if (isVerified || isAdmin || isDeveloper) ...[
        const SizedBox(width: 3),
        UserBadge(isVerified: isVerified, isAdmin: isAdmin, isDeveloper: isDeveloper, size: badgeSize),
      ],
    ]);
  }
}
