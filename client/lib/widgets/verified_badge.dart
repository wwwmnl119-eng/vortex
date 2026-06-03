import 'package:flutter/material.dart';

class VerifiedBadge extends StatelessWidget {
  final double size;
  const VerifiedBadge({this.size = 16, super.key});

  @override
  Widget build(BuildContext context) {
    return Icon(Icons.verified, color: const Color(0xFF2AABEE), size: size);
  }
}

class UsernameWithBadge extends StatelessWidget {
  final String username;
  final bool isVerified;
  final bool isAdmin;
  final TextStyle? style;
  final double badgeSize;

  const UsernameWithBadge({
    required this.username,
    this.isVerified = false,
    this.isAdmin = false,
    this.style,
    this.badgeSize = 14,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Flexible(child: Text(username,
        style: style ?? const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        overflow: TextOverflow.ellipsis)),
      if (isVerified) ...[
        const SizedBox(width: 3),
        VerifiedBadge(size: badgeSize),
      ],
      if (isAdmin && !isVerified) ...[
        const SizedBox(width: 3),
        Icon(Icons.shield, color: const Color(0xFFFFD700), size: badgeSize),
      ],
    ]);
  }
}
