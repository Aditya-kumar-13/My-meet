const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, "your_secret_key"); // Verify token
    req.user = decoded; // Store user info in req.user
    next(); // Call the next middleware
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = authenticate;
