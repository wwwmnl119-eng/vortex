
const express=require("express");
const mongoose=require("mongoose");
const path=require("path");
const app=express();

app.use(express.json());
app.use(express.static(path.join(__dirname,"web")));

mongoose.connect(process.env.MONGO_URI);

const User=mongoose.model("User",new mongoose.Schema({phone:String,passwordHash:String}));
const Contact=mongoose.model("Contact",new mongoose.Schema({owner:String,peer:String}));
const Message=mongoose.model("Message",new mongoose.Schema({from:String,to:String,text:String}));
const ChannelMessage=mongoose.model("ChannelMessage",new mongoose.Schema({channelSlug:String,text:String}));

const bcrypt=require("bcryptjs");

app.post("/auth",async(req,res)=>{
  let {phone,password}=req.body;
  let user=await User.findOne({phone});
  if(!user){
    let hash=await bcrypt.hash(password,10);
    await User.create({phone,passwordHash:hash});
    return res.json({ok:true});
  }
  let ok=await bcrypt.compare(password,user.passwordHash);
  if(!ok)return res.json({error:"wrong"});
  res.json({ok:true});
});

app.get("/contacts/:me",async(req,res)=>{
  let list=await Contact.find({owner:req.params.me});
  let users=await User.find({phone:{$in:list.map(x=>x.peer)}});
  res.json(users);
});

app.get("/messages/:a/:b",async(req,res)=>{
  let msgs=await Message.find({$or:[{from:req.params.a,to:req.params.b},{from:req.params.b,to:req.params.a}]});
  res.json(msgs);
});

app.post("/message",async(req,res)=>{
  await Message.create(req.body);
  res.json({ok:true});
});

app.get("/channel-messages/:slug",async(req,res)=>{
  let msgs=await ChannelMessage.find({channelSlug:req.params.slug});
  res.json(msgs);
});

app.post("/admin/channel-send",async(req,res)=>{
  await ChannelMessage.create({channelSlug:req.body.slug,text:req.body.text});
  res.json({ok:true});
});

app.listen(process.env.PORT||3000);
