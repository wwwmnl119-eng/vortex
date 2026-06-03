import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class ChannelsScreen extends StatefulWidget {
  const ChannelsScreen({super.key});
  @override
  State<ChannelsScreen> createState() => _ChannelsScreenState();
}

class _ChannelsScreenState extends State<ChannelsScreen> {
  final _api = ApiService();
  List<Chat> _channels = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final channels = await _api.getChannels();
      if (mounted) setState(() { _channels = channels; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _subscribe(Chat ch) async {
    try { await _api.subscribeChannel(ch.id); _load(); } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF17212B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF17212B),
        title: const Text('Каналы', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2AABEE)))
          : _channels.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.campaign_outlined, size: 80, color: Colors.white.withOpacity(0.08)),
                  const SizedBox(height: 16),
                  const Text('Каналов пока нет', style: TextStyle(color: Color(0xFF8B9DB5), fontSize: 16)),
                  const SizedBox(height: 8),
                  const Text('Администратор создаст каналы', style: TextStyle(color: Color(0xFF5A6A7A), fontSize: 13)),
                ]))
              : RefreshIndicator(
                  color: const Color(0xFF2AABEE),
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: _channels.length,
                    itemBuilder: (ctx, i) => _tile(_channels[i]),
                  ),
                ),
    );
  }

  Widget _tile(Chat ch) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFF232E3C), borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          CircleAvatar(
            radius: 28, backgroundColor: const Color(0xFFAB5CF7),
            backgroundImage: ch.avatarUrl != null ? NetworkImage(ch.avatarUrl!) : null,
            child: ch.avatarUrl == null ? const Icon(Icons.campaign, color: Colors.white, size: 28) : null,
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Flexible(child: Text(ch.name ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15), overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 4),
              const Icon(Icons.verified, color: Color(0xFF2AABEE), size: 15),
            ]),
            if (ch.description != null && ch.description!.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(ch.description!, style: const TextStyle(color: Color(0xFF8B9DB5), fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
            const SizedBox(height: 4),
            Text('${ch.memberCount} подписчиков', style: const TextStyle(color: Color(0xFF5A6A7A), fontSize: 12)),
          ])),
          const SizedBox(width: 10),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2AABEE), foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              minimumSize: Size.zero,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => _subscribe(ch),
            child: const Text('Подписаться', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ]),
      ),
    );
  }
}
