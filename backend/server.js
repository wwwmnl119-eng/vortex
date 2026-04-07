
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// FIX STATIC
const webPath = path.join(__dirname, "web");
app.use(express.static(webPath));

app.get("/", (req,res)=>{
  res.sendFile(path.join(webPath, "index.html"));
});

app.use(express.json());

// DB
mongoose.connect(process.env.MONGO_URI);

// TEMP ROUTE
app.post("/auth", (req,res)=> res.json({ok:true}));

app.listen(process.env.PORT || 3000, ()=>{
  console.log("Server started");
});
