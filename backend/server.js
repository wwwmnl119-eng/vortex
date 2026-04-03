
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

mongoose.connect(process.env.MONGO_URI);

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

server.listen(3000);
