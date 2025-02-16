import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com");
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    if (rooms.has(roomId)) {
      const roomData = rooms.get(roomId);
      socket.emit('video-state', roomData);
    }
  });

  socket.on('video-state-change', (data) => {
    const { roomId, videoId, playerState, currentTime } = data;
    rooms.set(roomId, { videoId, playerState, currentTime });
    socket.to(roomId).emit('video-state', { videoId, playerState, currentTime });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});