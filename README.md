# 📱 Vortex — Flutter + Node.js + PostgreSQL

Кроссплатформенный мессенджер (Android, iOS, Web) с личными чатами, групповыми чатами, отправкой файлов и WebRTC-звонками.

---

## 🗂️ Структура проекта

```
vortex/
├── server/          ← Node.js бэкенд
├── client/          ← Flutter (Android + iOS + Web)
├── docker-compose.yml
└── README.md
```

---

## 🚀 Способ 1 — Запуск через Docker (рекомендуется, самый простой)

### Требования
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Шаги

```bash
# 1. Перейди в папку проекта
cd vortex

# 2. Запустить сервер + базу данных одной командой
docker compose up -d

# Сервер будет доступен на: http://localhost:3000
```

### Проверить что работает
```bash
curl http://localhost:3000/health
# Ответ: {"status":"ok","timestamp":"..."}
```

---

## 🚀 Способ 2 — Запуск вручную

### Требования
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 14+](https://www.postgresql.org/download/)

### Шаг 1 — Настроить базу данных

```bash
# Создать базу данных
psql -U postgres -c "CREATE DATABASE vortex;"

# Применить схему (создать таблицы)
psql -U postgres -d vortex -f server/src/db/schema.sql
```

### Шаг 2 — Настроить сервер

```bash
cd server

# Скопировать конфиг
cp .env.example .env

# Открыть .env и заполнить:
# DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/vortex
# JWT_SECRET=любая_случайная_строка_символов

# Установить зависимости
npm install

# Запустить (режим разработки)
npm run dev
```

Сервер запустится на `http://localhost:3000`

---

## 📱 Запуск Flutter клиента

### Требования
- [Flutter SDK 3.x](https://docs.flutter.dev/get-started/install)
- Android Studio (для Android) / Xcode (для iOS)

### Шаг 1 — Указать адрес сервера

Открой файл `client/lib/config.dart` и измени:
```dart
static const String serverUrl = 'http://localhost:3000';
// Если запускаешь на реальном телефоне — укажи IP компьютера:
// static const String serverUrl = 'http://192.168.1.100:3000';
```

### Шаг 2 — Установить зависимости

```bash
cd client
flutter pub get
```

### Шаг 3 — Запустить

```bash
# Веб-браузер
flutter run -d chrome

# Android (подключи телефон или запусти эмулятор)
flutter run -d android

# iOS (только macOS)
flutter run -d ios

# Список всех устройств
flutter devices
```

---

## 🔧 Найти IP своего компьютера (для реального телефона)

```bash
# Windows
ipconfig

# macOS / Linux
ifconfig | grep "inet "
```

Пример: если IP = `192.168.1.55`, то в `config.dart`:
```dart
static const String serverUrl = 'http://192.168.1.55:3000';
```

---

## ✨ Функции

| Функция | Статус |
|---|---|
| Регистрация / Вход | ✅ |
| Личные чаты (DM) | ✅ |
| Групповые чаты | ✅ |
| Сообщения в реальном времени | ✅ |
| Отправка изображений | ✅ |
| Отправка файлов | ✅ |
| Индикатор "печатает..." | ✅ |
| Прочитано / непрочитано | ✅ |
| Редактирование сообщений | ✅ |
| Удаление сообщений | ✅ |
| Онлайн-статус | ✅ |
| WebRTC звонки (сигнализация) | ✅ |

---

## 🌐 API Endpoints

| Метод | Путь | Описание |
|---|---|---|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| GET | /api/auth/me | Текущий пользователь |
| GET | /api/chats | Список чатов |
| POST | /api/chats/dm | Создать личный чат |
| POST | /api/chats/group | Создать группу |
| GET | /api/messages/:chatId | История сообщений |
| POST | /api/files | Загрузить файл |
| GET | /api/users/search?q= | Поиск пользователей |

---

## 🔌 Socket.IO События

| Событие | Направление | Описание |
|---|---|---|
| send_message | Client → Server | Отправить сообщение |
| new_message | Server → Client | Новое сообщение |
| typing | Client → Server | Статус печати |
| user_typing | Server → Client | Кто-то печатает |
| read_messages | Client → Server | Пометить как прочитанное |
| call_user | Client → Server | Начать звонок (WebRTC) |
| incoming_call | Server → Client | Входящий звонок |
| call_answer | Client → Server | Ответить на звонок |
| end_call | Client → Server | Завершить звонок |

---

## ☁️ Деплой в продакшн

### Railway (бесплатно)
1. Зайди на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Добавь PostgreSQL сервис
4. Установи переменные окружения из `.env.example`

### DigitalOcean / VPS
```bash
# На сервере
git clone <your-repo>
cd vortex
docker compose up -d
```

---

## 📞 WebRTC звонки

Сигнализация через Socket.IO уже реализована. Для полноценных звонков дополнительно нужен **TURN-сервер** (для NAT traversal):

```bash
# Бесплатный TURN: coturn
# Или используй Twilio TURN (бесплатный tier)
```

В Flutter добавь `flutter_webrtc` для рендеринга видео.
