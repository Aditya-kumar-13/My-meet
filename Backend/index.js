const express = require("express");
const app = express();
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const http = require("http");
const router = require("./routes/user");
const dotenv = require("dotenv");

dotenv.config();
connectDB();

const allowedOrigins = ["http://localhost:5173", "https://165.232.151.23"];

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());
app.use("/", router);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on("create-room", (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    socket.join(roomId);
    console.log(`Room ${roomId} created/joined by ${socket.id}`);
    socket.emit("room-created", roomId);
  });

  socket.on("join-room", (roomId) => {
    if (!rooms.has(roomId)) {
      console.warn(`Attempt to join non-existent room ${roomId}`);
      socket.emit("invalid-room");
      return;
    }

    const roomUsers = rooms.get(roomId);
    roomUsers.add(socket.id);
    socket.join(roomId);

    console.log(
      `${socket.id} joined ${roomId} (Total users: ${roomUsers.size})`
    );

    const others = Array.from(roomUsers).filter((id) => id !== socket.id);
    socket.emit("existing-users", others);

    setTimeout(() => {
      socket.to(roomId).emit("user-joined", socket.id);
    }, 100);
  });

  socket.on("leave-room", (roomId) => {
    if (!rooms.has(roomId)) return;

    const roomUsers = rooms.get(roomId);
    if (roomUsers.delete(socket.id)) {
      console.log(`{socket.id} left ${roomId} (Remaining: ${roomUsers.size})`);
      socket.to(roomId).emit("user-left", socket.id);
      socket.leave(roomId);

      if (roomUsers.size === 0) {
        rooms.delete(roomId);
        console.log(`Cleaned up empty room ${roomId}`);
      }
    }
  });

  socket.on("offer", ({ roomId, offer, sender, target }) => {
    if (!rooms.has(roomId) || !rooms.get(roomId).has(sender)) {
      console.warn(`Offer from unauthorized sender ${sender}`);
      return;
    }
    if (!target || !rooms.get(roomId).has(target)) {
      console.warn(`Offer to invalid target ${target}`);
      return;
    }
    console.log(`Offer from ${sender} to ${target} → Room: ${roomId}`);
    socket.to(target).emit("offer", { sender, offer, target });
  });

  socket.on("answer", ({ roomId, answer, sender, target }) => {
    if (!rooms.has(roomId) || !rooms.get(roomId).has(sender)) {
      console.warn(`Answer from unauthorized sender ${sender}`);
      return;
    }
    if (!target || !rooms.get(roomId).has(target)) {
      console.warn(`Answer to invalid target ${target}`);
      return;
    }
    console.log(`Answer from ${sender} to ${target} → Room: ${roomId}`);
    socket.to(target).emit("answer", { sender, answer, target });
  });

  socket.on("ice-candidate", ({ roomId, candidate, sender, target }) => {
    if (!rooms.has(roomId) || !rooms.get(roomId).has(sender)) {
      console.warn(`ICE candidate from unauthorized sender ${sender}`);
      return;
    }
    if (!target || !rooms.get(roomId).has(target)) {
      console.warn(`ICE candidate to invalid target ${target}`);
      return;
    }
    console.log(
      `❄️ ICE candidate from ${sender} to ${target} → Room: ${roomId}`
    );
    socket.to(target).emit("ice-candidate", { sender, candidate, target });
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);

    rooms.forEach((users, roomId) => {
      if (users.delete(socket.id)) {
        console.log(`${socket.id} left ${roomId} (Remaining: ${users.size})`);
        socket.to(roomId).emit("user-left", socket.id);

        if (users.size === 0) {
          rooms.delete(roomId);
          console.log(`Cleaned up empty room ${roomId}`);
        }
      }
    });
  });

  socket.on("error", (err) => {
    console.error(`Socket error (${socket.id}):`, err);
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    rooms: rooms.size,
    connections: io.engine.clientsCount,
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
