const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/vortex";

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

mongoose.connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err.message));

const User = mongoose.model("User", {
  phone: String,
  username: String,
  avatar: String
});

const Contact = mongoose.model("Contact", {
  owner: String,
  peer: String,
  addedAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", {
  from: String,
  to: String,
  text: String,
  time: { type: Date, default: Date.now }
});

function makeAvatar(username, phone) {
  return String(username || phone || "U").trim().charAt(0).toUpperCase();
}

app.use("/", express.static("web"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/register", async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const username = String(req.body.username || "").trim();
  if (!phone) return res.status(400).json({ error: "phone required" });

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone, username, avatar: makeAvatar(username, phone) });
  } else if (username && user.username !== username) {
    user.username = username;
    user.avatar = makeAvatar(username, phone);
    await user.save();
  }

  res.json({ ok: true, user });
});

app.post("/contacts/add", async (req, res) => {
  const owner = String(req.body.owner || "").trim();
  const peer = String(req.body.peer || "").trim();
  if (!owner || !peer) return res.status(400).json({ error: "owner and peer required" });

  const peerUser = await User.findOne({ phone: peer });
  if (!peerUser) return res.status(404).json({ error: "user not found" });

  const exists = await Contact.findOne({ owner, peer });
  if (!exists) await Contact.create({ owner, peer });

  res.json({ ok: true, peer: peerUser });
});

app.get("/contacts/:owner", async (req, res) => {
  const rows = await Contact.find({ owner: req.params.owner }).sort({ addedAt: -1 });
  const peers = await Promise.all(rows.map(r => User.findOne({ phone: r.peer })));
  res.json(peers.filter(Boolean));
});

app.get("/messages/:a/:b", async (req, res) => {
  const { a, b } = req.params;
  const messages = await Message.find({
    $or: [{ from: a, to: b }, { from: b, to: a }]
  }).sort({ time: 1 });
  res.json(messages);
});

io.on("connection", socket => {
  socket.on("message", async data => {
    const from = String(data.from || "").trim();
    const to = String(data.to || "").trim();
    const text = String(data.text || "").trim();
    if (!from || !to || !text) return;
    const msg = await Message.create({ from, to, text });
    io.emit("message", msg);
  });
});

server.listen(PORT, () => {
  console.log("Vortex running on port", PORT);
});
