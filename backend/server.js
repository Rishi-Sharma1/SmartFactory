import http from 'http';
import app from './src/app.js';
import env from './src/config/env.js';
import { initSocket } from './src/config/socket.js';

const server = http.createServer(app);

// Initialize Socket.IO instance
initSocket(server);

const PORT = env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Smart Factory Backend Server running on port ${PORT} [${env.NODE_ENV}]`);
});
