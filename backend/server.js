const express = require("express");
const http = require("http");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/vortex";

mongoose.connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err.message));

const User = mongoose.model("User", new mongoose.Schema({
  phone: { type: String, unique: true, index: true },
  passwordHash: String,
  avatar: String,
  createdAt: { type: Date, default: Date.now }
}));
const Contact = mongoose.model("Contact", new mongoose.Schema({
  owner: { type: String, index: true },
  peer: { type: String, index: true },
  createdAt: { type: Date, default: Date.now }
}));
const Message = mongoose.model("Message", new mongoose.Schema({
  from: { type: String, index: true },
  to: { type: String, index: true },
  text: String,
  createdAt: { type: Date, default: Date.now }
}));

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "web")));
app.use("/updates", express.static(path.join(__dirname, "..", "updates")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

function normalizePhone(v) { return String(v || "").replace(/[^\d+]/g, "").trim(); }
function avatarFromPhone(phone) { return String(phone || "U").replace(/[^\dA-Z]/gi, "").charAt(0).toUpperCase() || "U"; }
function publicUser(user) { return { phone: user.phone, avatar: user.avatar }; }

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/auth", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || "");
    if (!phone || !password) return res.status(400).json({ error: "phone and password required" });
    let user = await User.findOne({ phone });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({ phone, passwordHash, avatar: avatarFromPhone(phone) });
      return res.json({ ok: true, mode: "registered", user: publicUser(user) });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "wrong password" });
    res.json({ ok: true, mode: "login", user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/users/find/:phone", async (req, res) => {
  const phone = normalizePhone(req.params.phone);
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(publicUser(user));
});

app.post("/contacts/add", async (req, res) => {
  const owner = normalizePhone(req.body.owner);
  const peer = normalizePhone(req.body.peer);
  if (!owner || !peer) return res.status(400).json({ error: "owner and peer required" });
  if (owner === peer) return res.status(400).json({ error: "cannot add yourself" });
  const peerUser = await User.findOne({ phone: peer });
  if (!peerUser) return res.status(404).json({ error: "user not found" });
  const exists = await Contact.findOne({ owner, peer });
  if (!exists) await Contact.create({ owner, peer });
  res.json({ ok: true, peer: publicUser(peerUser) });
});

app.get("/contacts/:owner", async (req, res) => {
  const owner = normalizePhone(req.params.owner);
  const rows = await Contact.find({ owner }).sort({ createdAt: -1 });
  const phones = rows.map(r => r.peer);
  const users = await User.find({ phone: { $in: phones } });
  const map = new Map(users.map(u => [u.phone, u]));
  res.json(phones.map(p => map.get(p)).filter(Boolean).map(publicUser));
});

app.get("/messages/:a/:b", async (req, res) => {
  const a = normalizePhone(req.params.a);
  const b = normalizePhone(req.params.b);
  const items = await Message.find({ $or: [{ from: a, to: b }, { from: b, to: a }] }).sort({ createdAt: 1 });
  res.json(items);
});

io.on("connection", socket => {
  socket.on("message", async payload => {
    const from = normalizePhone(payload.from);
    const to = normalizePhone(payload.to);
    const text = String(payload.text || "").trim();
    if (!from || !to || !text) return;
    const msg = await Message.create({ from, to, text });
    io.emit("message", msg);
  });
});

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "web", "index.html")));
server.listen(PORT, () => console.log("Vortex backend running on port", PORT));
