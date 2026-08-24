const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable CORS so outside networks can connect
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("create-room", ({ roomCode, secret }) => {
    rooms[roomCode] = { host: socket.id, hostSecret: secret };
    socket.join(roomCode);
  });

  socket.on("join-room", ({ roomCode, secret }) => {
    const room = rooms[roomCode];
    if (room) {
      room.guest = socket.id;
      room.guestSecret = secret;
      socket.join(roomCode);

      io.to(room.host).emit("game-start", { opponentSecret: room.guestSecret, isHost: true });
      io.to(room.guest).emit("game-start", { opponentSecret: room.hostSecret, isHost: false });
    } else {
      socket.emit("error-msg", "חדר לא נמצא");
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
server.listen(PORT, ()args => console.log(`Server running on port ${PORT}`));
