const express = require("express");
const app = express();
const routes = require("./routes/user");
const connectDB = require("./config/db");
const cors = require("cors");

connectDB();
require("dotenv").config();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use("/", routes);

app.get("/", (req, res) => {
  res.send("Welcome to Backend Homepage");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
