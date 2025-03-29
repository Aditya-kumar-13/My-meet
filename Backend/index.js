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
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use("/", router);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`🔗 New connection: ${socket.id}`);

  socket.on("create-room", (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    socket.join(roomId);
    console.log(`🏠 Room ${roomId} created/joined by ${socket.id}`);
    socket.emit("room-created", roomId);
  });

  socket.on("join-room", (roomId) => {
    if (!rooms.has(roomId)) {
      console.warn(`⚠️ Attempt to join non-existent room ${roomId}`);
      socket.emit("invalid-room");
      return;
    }

    const roomUsers = rooms.get(roomId);
    roomUsers.add(socket.id);
    socket.join(roomId);

    console.log(
      `📞 ${socket.id} joined ${roomId} (Total users: ${roomUsers.size})`
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
      console.log(
        `🚪 ${socket.id} left ${roomId} (Remaining: ${roomUsers.size})`
      );
      socket.to(roomId).emit("user-left", socket.id);
      socket.leave(roomId);

      if (roomUsers.size === 0) {
        rooms.delete(roomId);
        console.log(`🧹 Cleaned up empty room ${roomId}`);
      }
    }
  });

  socket.on("offer", ({ roomId, offer, sender }) => {
    if (!rooms.has(roomId) || !rooms.get(roomId).has(sender)) {
      console.warn(`⚠️ Offer from unauthorized sender ${sender}`);
      return;
    }
    console.log(`📤 Offer from ${sender} → Room: ${roomId}`);
    socket.to(roomId).emit("offer", { sender, offer });
  });

  socket.on("answer", ({ roomId, answer, sender }) => {
    if (!rooms.has(roomId)) {
      console.warn(`⚠️ Answer for non-existent room ${roomId}`);
      return;
    }
    console.log(`📥 Answer from ${sender} → Room: ${roomId}`);
    socket.to(roomId).emit("answer", { sender, answer });
  });

  socket.on("ice-candidate", ({ roomId, candidate, sender }) => {
    if (!rooms.has(roomId)) {
      console.warn(`⚠️ ICE candidate for non-existent room ${roomId}`);
      return;
    }
    console.log(`❄️ ICE candidate from ${sender} → Room: ${roomId}`);
    socket.to(roomId).emit("ice-candidate", { sender, candidate });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);

    rooms.forEach((users, roomId) => {
      if (users.delete(socket.id)) {
        console.log(
          `🚪 ${socket.id} left ${roomId} (Remaining: ${users.size})`
        );
        socket.to(roomId).emit("user-left", socket.id);

        if (users.size === 0) {
          rooms.delete(roomId);
          console.log(`🧹 Cleaned up empty room ${roomId}`);
        }
      }
    });
  });

  socket.on("error", (err) => {
    console.error(`⚠️ Socket error (${socket.id}):`, err);
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
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
