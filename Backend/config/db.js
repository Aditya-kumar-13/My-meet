const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.NODE_ENV === "production"
    ? process.env.MONGO_URI
    : "mongodb://127.0.0.1:27017/my-meet";

const dbOptions = {
  autoCreate: true,
};

const connect = async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(MONGO_URI, dbOptions);
    console.log(`MongoDB connected: ${mongoose.connection.db.databaseName}`);
  } catch (e) {
    console.error("Error connecting to MongoDB:", e.message);
    process.exit(-1);
  }
};

module.exports = connect;
