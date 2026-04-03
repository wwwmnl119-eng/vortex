const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

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
  console.error("Mongo URI env var missing. Set MONGO_URI (or MONGO_URL).");
  process.exit(1);
}

mongoose.connect(mongoUri);

const User = mongoose.model("User", new mongoose.Schema({
  phone:String,
  passwordHash:String,
  role:String
}));

const ChannelMessage = mongoose.model("ChannelMessage", new mongoose.Schema({
  channelSlug:String,
  text:String,
  createdBy:String
}));

function hasRole(user){
  return user && (user.role==="admin"||user.role==="delover");
}

app.post("/admin/channel-send", async (req,res)=>{
  const {me, slug, text} = req.body;
  const user = await User.findOne({phone:me});
  if(!hasRole(user)) return res.json({error:"no access"});
  const msg = await ChannelMessage.create({channelSlug:slug,text,createdBy:me});
  io.emit("msg", msg);
  res.json({ok:true});
});

server.listen(process.env.PORT || 3000);
