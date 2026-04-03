
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

// FIX STATIC
app.use(express.static(path.join(__dirname, "web")));
app.use("/mobile", express.static(path.join(__dirname, "web/mobile")));

// MODELS
const User = mongoose.model("User", new mongoose.Schema({
  phone: String,
  passwordHash: String,
  role: { type: String, default: "user" }
}));

const ChannelMessage = mongoose.model("ChannelMessage", new mongoose.Schema({
  channelSlug: String,
  text: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
}));

function hasRole(user, roles){
  return user && roles.includes(user.role);
}

// AUTH
app.post("/auth", async (req,res)=>{
  const { phone, password } = req.body;
  const user = await User.findOne({ phone });
  if(!user) return res.status(404).json({error:"no user"});
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({error:"wrong password"});
  res.json({ok:true, user});
});

// CHANNEL SEND
app.post("/admin/channel-send", async (req,res)=>{
  const { me, slug, text } = req.body;
  const user = await User.findOne({ phone: me });

  if (!hasRole(user, ["admin","delover"])) {
    return res.status(403).json({ error: "no access" });
  }

  const msg = await ChannelMessage.create({
    channelSlug: slug,
    text,
    createdBy: me
  });

  io.emit("channel-message", msg);
  res.json({ok:true});
});

server.listen(PORT, ()=>console.log("server running"));
