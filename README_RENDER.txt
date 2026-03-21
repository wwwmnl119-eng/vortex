VORTEX TEXT MESSENGER - RENDER READY

Что это:
- text only messenger
- auth: phone + password
- новый номер = регистрация
- существующий номер = вход
- поиск пользователя по номеру
- добавление контактов
- нормальный текстовый чат
- хостинг через Render
- база через MongoDB Atlas

Как задеплоить:
1. upload project to GitHub
2. create free MongoDB Atlas cluster
3. create db user
4. allow network access
5. copy Mongo connection string
6. create Web Service on Render
7. Build Command: npm install
8. Start Command: npm start
9. add env var:
   MONGO_URL = your atlas string
10. deploy
