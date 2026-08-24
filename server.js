const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("create-room", ({ roomCode, secret }) => {
    socket.join(roomCode);
    rooms[roomCode] = { hostId: socket.id, hostSecret: secret };
  });

  socket.on("join-room", ({ roomCode, secret }) => {
    const room = rooms[roomCode];
    if (room) {
      socket.join(roomCode);
      room.joinerId = socket.id;
      room.joinerSecret = secret;

      // Exchange secrets securely between host and joiner
      io.to(room.hostId).emit("game-start", { opponentSecret: secret, isHost: true });
      io.to(socket.id).emit("game-start", { opponentSecret: room.hostSecret, isHost: false });
    } else {
      socket.emit("error-msg", "Room not found!");
    }
  });

  socket.on("send-message", ({ roomCode, text }) => {
    socket.to(roomCode).emit("receive-message", { text });
  });

  socket.on("game-over", ({ roomCode, text }) => {
    socket.to(roomCode).emit("peer-won", { text });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));