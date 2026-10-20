import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app.js";
import { config } from "./config/env.js";
import { initRideSockets } from "./sockets/rideSocket.js";

const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: [config.clientUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach socket handlers
initRideSockets(io);

// Start HTTP & WebSocket server
server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 RideX Backend Server running on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Allowed Client URL: ${config.clientUrl}`);
  console.log(`🔒 Security: Helmet, CORS & Rate Limiting active`);
  console.log(`=======================================================`);
});

export { server, io };
