const express = require("express");
const app = express();
app.use((req, res, next) => {
  console.log("We got a request to:", req.path);
  next();
});

app.get("/", (req, res) => {
  res.send("Welcome to Backend Homepage");
});

app.listen(5001, () => {
  console.log("Listening on port 5001");
});
