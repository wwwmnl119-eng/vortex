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
  username: { type: String, default: "" },
  passwordHash: String,
  avatar: String,
  role: {
    type: String,
    enum: ["user", "beta", "moderator", "delover", "admin"],
    default: "user"
  },
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


const Channel = mongoose.model("Channel", new mongoose.Schema({
  slug: { type: String, unique: true, index: true },
  title: String,
  verified: { type: Boolean, default: false },
  description: String,
  createdAt: { type: Date, default: Date.now }
}));

const ChannelMessage = mongoose.model("ChannelMessage", new mongoose.Schema({
  channelSlug: { type: String, index: true },
  text: String,
  createdBy: { type: String, index: true, default: "system" },
  createdAt: { type: Date, default: Date.now }
}));


const ChannelComment = mongoose.model("ChannelComment", new mongoose.Schema({
  postId: { type: String, index: true },
  from: { type: String, index: true },
  text: String,
  createdAt: { type: Date, default: Date.now }
}));

const app = express();
app.use(express.json());
app.use(cors());

app.use("/mobile", express.static(path.join(__dirname, "web", "mobile")));
app.get("/mobile", (_req, res) => {
  res.sendFile(path.join(__dirname, "web", "mobile", "index.html"));
});

app.use("/admin", express.static(path.join(__dirname, "web", "admin")));
app.use(express.static(path.join(__dirname, "web")));


async function ensureSystemChannel() {
  let channel = await Channel.findOne({ slug: "vortex-official" });
  if (!channel) {
    channel = await Channel.create({
      slug: "vortex-official",
      title: "Vortex Offical",
      verified: true,
      description: "Закреплённый канал проекта"
    });
  } else {
    let changed = false;
    if (channel.title !== "Vortex Offical") { channel.title = "Vortex Offical"; changed = true; }
    if (!channel.verified) { channel.verified = true; changed = true; }
    if (channel.description !== "Закреплённый канал проекта") { channel.description = "Закреплённый канал проекта"; changed = true; }
    if (changed) await channel.save();
  }

  const count = await ChannelMessage.countDocuments({ channelSlug: "vortex-official" });
  if (!count) {
    await ChannelMessage.create({
      channelSlug: "vortex-official",
      text: "Добро пожаловать в Vortex. Здесь будут обновления, новости и важные объявления.",
      createdBy: "system"
    });
  }
}

ensureSystemChannel().catch(err => console.error("System channel init error:", err.message));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

function normalizePhone(v) {
  return String(v || "").replace(/[^\d+]/g, "").trim();
}
function avatarFromPhone(phone) {
  return String(phone || "U").replace(/[^\dA-Z]/gi, "").charAt(0).toUpperCase() || "U";
}
function publicUser(user) {
  return {
    phone: user.phone,
    username: user.username || "",
    avatar: user.avatar,
    role: user.role || "user"
  };
}
function hasRole(user, roles) {
  return !!user && roles.includes(user.role);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

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
        passwordHash,
        avatar: avatarFromPhone(phone),
        role: "user"
      });
      return res.json({ ok: true, mode: "registered", user: publicUser(user) });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "wrong password" });

    if (username && !user.username) {
      user.username = username;
      await user.save();
    }

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
  const result = phones.map(p => map.get(p)).filter(Boolean).map(publicUser);
  res.json(result);
});

app.get("/messages/:a/:b", async (req, res) => {
  const a = normalizePhone(req.params.a);
  const b = normalizePhone(req.params.b);
  const items = await Message.find({
    $or: [{ from: a, to: b }, { from: b, to: a }]
  }).sort({ createdAt: 1 });
  res.json(items);
});



app.get("/channels", async (_req, res) => {
  const rows = await Channel.find().sort({ createdAt: 1 });
  res.json(rows);
});

app.get("/channel-messages/:slug", async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  const rows = await ChannelMessage.find({ channelSlug: slug }).sort({ createdAt: 1 });
  res.json(rows);
});

app.post("/admin/channel-send", async (req, res) => {
  const me = normalizePhone(req.body.me);
  const slug = String(req.body.slug || "").trim();
  const text = String(req.body.text || "").trim();

  const admin = await User.findOne({ phone: me });
  if (!hasRole(admin, ["admin", "delover"])) {
    return res.status(403).json({ error: "no access" });
  }

  if (!slug || !text) {
    return res.status(400).json({ error: "slug and text required" });
  }

  const channel = await Channel.findOne({ slug });
  if (!channel) return res.status(404).json({ error: "channel not found" });

  const msg = await ChannelMessage.create({
    channelSlug: slug,
    text,
    createdBy: me
  });

  io.emit("channel-message", msg);
  res.json({ ok: true, message: msg });
});



app.get("/channel-comments/:postId", async (req, res) => {
  const postId = String(req.params.postId || "").trim();
  if (!postId) return res.status(400).json({ error: "postId required" });
  const rows = await ChannelComment.find({ postId }).sort({ createdAt: 1 });
  res.json(rows);
});

app.post("/channel-comments/send", async (req, res) => {
  const from = normalizePhone(req.body.from);
  const postId = String(req.body.postId || "").trim();
  const text = String(req.body.text || "").trim();

  if (!from || !postId || !text) {
    return res.status(400).json({ error: "from, postId and text required" });
  }

  const user = await User.findOne({ phone: from });
  if (!user) return res.status(404).json({ error: "user not found" });

  const post = await ChannelMessage.findById(postId);
  if (!post) return res.status(404).json({ error: "post not found" });

  const comment = await ChannelComment.create({ postId, from, text });
  io.emit("channel-comment", comment);
  res.json({ ok: true, comment });
});

// ADMIN
app.get("/admin/users", async (req, res) => {
  const me = normalizePhone(req.query.me);
  const admin = await User.findOne({ phone: me });

  if (!hasRole(admin, ["admin"])) {
    return res.status(403).json({ error: "no access" });
  }

  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map(publicUser));
});

app.post("/admin/set-role", async (req, res) => {
  const me = normalizePhone(req.body.me);
  const target = normalizePhone(req.body.target);
  const role = String(req.body.role || "").trim();

  const admin = await User.findOne({ phone: me });
  if (!hasRole(admin, ["admin"])) {
    return res.status(403).json({ error: "no access" });
  }

  if (!["user", "beta", "moderator", "delover", "admin"].includes(role)) {
    return res.status(400).json({ error: "bad role" });
  }

  const user = await User.findOne({ phone: target });
  if (!user) return res.status(404).json({ error: "not found" });

  user.role = role;
  await user.save();

  res.json({ ok: true, user: publicUser(user) });
});

app.post("/admin/delete-message", async (req, res) => {
  const me = normalizePhone(req.body.me);
  const id = String(req.body.id || "");

  const mod = await User.findOne({ phone: me });
  if (!hasRole(mod, ["admin", "moderator"])) {
    return res.status(403).json({ error: "no access" });
  }

  await Message.findByIdAndDelete(id);
  res.json({ ok: true });
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

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

server.listen(PORT, () => {
  console.log("Vortex backend running on port", PORT);
});
