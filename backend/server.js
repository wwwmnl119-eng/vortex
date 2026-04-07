
const express = require("express");
const path = require("path");
const app = express();

// FIX: correct static serving
app.use(express.static(path.join(__dirname, "web")));
app.use("/mobile", express.static(path.join(__dirname, "web")));

app.listen(process.env.PORT || 3000);
