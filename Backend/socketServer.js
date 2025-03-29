// const { Server } = require("socket.io");

// module.exports = (server) => {
//   const io = new Server(server, {
//     cors: {
//       origin: process.env.FRONTEND_URL,
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//   });

//   let rooms = {}; // Store room members

//   io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);

//     // Handle room creation
//     socket.on("create-room", (roomId) => {
//       if (!rooms[roomId]) rooms[roomId] = [];
//       rooms[roomId].push(socket.id);
//       socket.join(roomId);
//       console.log(`${socket.id} created room ${roomId}`);
//     });

//     // Handle joining a room
//     socket.on("join-room", (roomId) => {
//       if (rooms[roomId]) {
//         rooms[roomId].push(socket.id);
//         socket.join(roomId);
//         console.log(`${socket.id} joined room ${roomId}`);
//         socket.to(roomId).emit("user-joined", socket.id);
//       }
//     });

//     // Handle WebRTC signaling (ICE candidates & SDP exchange)
//     socket.on("signal", (data) => {
//       io.to(data.to).emit("signal", { from: data.from, signal: data.signal });
//     });

//     // Handle user disconnect
//     socket.on("disconnect", () => {
//       for (const room in rooms) {
//         rooms[room] = rooms[room].filter((id) => id !== socket.id);
//         if (rooms[room].length === 0) delete rooms[room];
//       }
//       console.log("User disconnected:", socket.id);
//     });
//   });
// };
