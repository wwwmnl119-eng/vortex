import 'package:flutter/material.dart';
import '../models/models.dart';

class MessageStatusIcon extends StatelessWidget {
  final MessageStatus status;
  final double size;

  const MessageStatusIcon({required this.status, this.size = 14, super.key});

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case MessageStatus.sending:
        return SizedBox(width: size, height: size,
          child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white.withOpacity(0.6)));
      case MessageStatus.sent:
        return Icon(Icons.check, size: size, color: Colors.white.withOpacity(0.7));
      case MessageStatus.delivered:
        return Icon(Icons.done_all, size: size, color: Colors.white.withOpacity(0.7));
      case MessageStatus.read:
        return Icon(Icons.done_all, size: size, color: const Color(0xFF2AABEE));
    }
  }
}
