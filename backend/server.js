
const express = require("express");
const http = require("http");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("Mongo connected"))
  .catch(err => console.error("Mongo error:", err));

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "web")));
app.use("/mobile", express.static(path.join(__dirname, "web/mobile")));

const User = mongoose.model("User", new mongoose.Schema({
  phone: { type: String, unique: true, index: true },
  username: { type: String, default: "" },
  avatar: { type: String, default: "1" },
  passwordHash: String,
  role: { type: String, default: "user" }
}));

const ChannelMessage = mongoose.model("ChannelMessage", new mongoose.Schema({
  channelSlug: String,
  text: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
}));

function normalizePhone(v){
  return String(v || "").replace(/[^\d+]/g, "").trim();
}

function hasRole(user, roles){
  return !!(user && roles.includes(user.role));
}

// FIX AUTH: new number = registration, existing = login
app.post("/auth", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || "");
    const username = String(req.body.username || "").trim();

    if (!phone || !password) {
      return res.status(400).json({ error: "phone and password required" });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({
        phone,
        username,
        avatar: "1",
        passwordHash,
        role: "user"
      });

      return res.json({
        ok: true,
        mode: "registered",
        user: {
          phone: user.phone,
          username: user.username,
          avatar: user.avatar,
          role: user.role
        }
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "wrong password" });
    }

    return res.json({
      ok: true,
      mode: "login",
      user: {
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/admin/channel-send", async (req, res) => {
  try {
    const { me, slug, text } = req.body;
    const user = await User.findOne({ phone: normalizePhone(me) });

    if (!hasRole(user, ["admin", "delover"])) {
      return res.status(403).json({ error: "no access" });
    }

    const msg = await ChannelMessage.create({
      channelSlug: slug,
      text: String(text || "").trim(),
      createdBy: normalizePhone(me)
    });

    io.emit("channel-message", msg);
    res.json({ ok: true, message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => console.log("server running"));
