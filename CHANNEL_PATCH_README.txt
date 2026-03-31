
Что добавлено:
- системный канал Vortex Official
- GET /channels
- GET /channel-messages/:slug
- POST /admin/channel-send
- автосоздание канала и первого сообщения
- отображение канала в mobile-сайте сверху списка чатов
- открытие канала по клику

Как писать в канал:
POST /admin/channel-send
Content-Type: application/json

{
  "me": "<твой номер admin>",
  "slug": "vortex-official",
  "text": "Текст поста"
}

Важно:
- писать может только пользователь с role=admin
- обычные пользователи канал видят и читают
