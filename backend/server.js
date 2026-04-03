
const express = require("express");
const http = require("http");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI; // FIXED

mongoose.connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err.message));

const User = mongoose.model("User", new mongoose.Schema({
  phone: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: "user" }
}));

const ChannelMessage = mongoose.model("ChannelMessage", new mongoose.Schema({
  channelSlug: String,
  text: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
}));

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

function hasRole(user, roles){
  return user && roles.includes(user.role);
}

app.post("/auth", async (req,res)=>{
  const { phone, password } = req.body;
  const user = await User.findOne({ phone });
  if(!user) return res.status(404).json({error:"no user"});
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({error:"wrong"});
  res.json({ok:true, user});
});

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
