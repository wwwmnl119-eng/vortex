
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "web")));

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL;

if (!mongoUri) {
  console.error("Mongo URI missing");
  process.exit(1);
}

mongoose.connect(mongoUri);

// ===== MODELS =====
const User = mongoose.model("User", new mongoose.Schema({
  phone: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: "user" }
}));

// ===== AUTH FIX =====
app.post("/auth", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: "missing data" });
    }

    let user = await User.findOne({ phone });

    // регистрация
    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = await User.create({
        phone,
        passwordHash: hash,
        role: "user"
      });

      return res.json({ ok: true, mode: "register" });
    }

    // вход
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "wrong password" });
    }

    return res.json({ ok: true, mode: "login" });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(process.env.PORT || 3000);
