const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Enable CORS so players on cellular data or different Wi-Fi networks can connect
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Basic health check route for Render
app.get("/", (req, res) => {
  res.send("Food Guessing Game Server is Live!");
});

const rooms = {};

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create Room
  socket.on("create-room", ({ roomCode, secret }) => {
    rooms[roomCode] = { 
      host: socket.id, 
      hostSecret: secret 
    };
    socket.join(roomCode);
    console.log(`Room ${roomCode} created by ${socket.id}`);
  });

  // Join Room
  socket.on("join-room", ({ roomCode, secret }) => {
    const room = rooms[roomCode];

    if (room) {
      if (room.guest) {
        socket.emit("error-msg", "החדר מלא!");
        return;
      }

      room.guest = socket.id;
      room.guestSecret = secret;
      socket.join(roomCode);

      console.log(`Player ${socket.id} joined room ${roomCode}`);

      // Notify both players that the game has started
      io.to(room.host).emit("game-start", { opponentSecret: room.guestSecret, isHost: true });
      io.to(room.guest).emit("game-start", { opponentSecret: room.hostSecret, isHost: false });
    } else {
      socket.emit("error-msg", "קוד חדר לא תקין או שהחדר לא קיים");
    }
  });

  // Relay Chat & Guesses
  socket.on("send-message", ({ roomCode, text }) => {
    socket.to(roomCode).emit("receive-message", { text });
  });

  // Handle Game Over / Win State
  socket.on("game-over", ({ roomCode, text }) => {
    socket.to(roomCode).emit("peer-won", { text });
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    for (const code in rooms) {
      if (rooms[code].host === socket.id || rooms[code].guest === socket.id) {
        delete rooms[code];
        break;
      }
    }
  });
});

// Listen on environment port (Render requirement)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
