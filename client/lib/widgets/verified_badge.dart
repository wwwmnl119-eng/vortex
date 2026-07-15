import 'package:flutter/material.dart';

class VerifiedBadge extends StatelessWidget {
  final double size;
  const VerifiedBadge({this.size = 16, super.key});
  @override
  Widget build(BuildContext context) =>
      Icon(Icons.verified, color: const Color(0xFF2AABEE), size: size);
}
