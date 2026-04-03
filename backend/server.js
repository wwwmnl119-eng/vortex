// server.js (fixed with delover support)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static("backend/web"));

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/vortex");

// ===== MODELS =====
const User = mongoose.model("User", new mongoose.Schema({
  phone: String,
  passwordHash: String,
  role: { type: String, default: "user" }
}));

const Channel = mongoose.model("Channel", new mongoose.Schema({
  slug: String,
  title: String,
  verified: Boolean
}));

const ChannelMessage = mongoose.model("ChannelMessage", new mongoose.Schema({
  channelSlug: String,
  text: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
}));

// ===== HELPERS =====
function hasRole(user, roles) {
  return user && roles.includes(user.role);
}

// ===== CHANNEL SEND (FIXED) =====
app.post("/admin/channel-send", async (req, res) => {
  const { me, slug, text } = req.body;

  const user = await User.findOne({ phone: me });

  if (!hasRole(user, ["admin", "delover"])) {
    return res.status(403).json({ error: "no access" });
  }

  const msg = await ChannelMessage.create({
    channelSlug: slug,
    text,
    createdBy: me
  });

  io.emit("channel-message", msg);

  res.json({ ok: true });
});

// ===== START =====
server.listen(3000, () => {
  console.log("Server running");
});
