const mongoose = require("mongoose");
require("dotenv").config();

const connect = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/my-meet";
    await mongoose.connect(mongoURI);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (e) {
    console.log("Error connecting to MongoDB");
    console.log(e);
    process.exit(1);
  }
};
module.exports = connect;
