const User = require("../models/userModel");
const bcrypt = require("bcrypt");

async function SignUp(req, res) {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already registered" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({
      name: name,
      email: email,
      password: hashedPassword,
    });
    console.log(hashedPassword);
    await user.save();
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function Login(req, res) {
  try {
    const { email, password } = req.body;
    const exist = await User.findOne({ email });
    if (!exist) {
      return res
        .status(400)
        .json({ message: "User not found! Please sign up" });
    }
    const isMatch = await bcrypt.compare(password, exist.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Password!" });
    }
    return res.status(200).json({ message: "Login Successful" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
module.exports = { SignUp, Login };
