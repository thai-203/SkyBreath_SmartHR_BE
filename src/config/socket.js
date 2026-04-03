import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';

let io = null;

/**
 * Khởi tạo Socket.io server và gắn vào httpServer.
 * Middleware xác thực JWT trên mỗi kết nối.
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Middleware xác thực JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      const secret = process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      socket.userId = decoded.sub;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user_${userId}`);
    console.log(`[Socket] User ${userId} connected → room user_${userId}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${userId} disconnected`);
    });
  });

  console.log('[Socket] Socket.io server initialized');
  return io;
};

/**
 * Lấy instance io hiện tại để emit event từ service.
 */
export const getIO = () => {
  if (!io) {
    console.warn('[Socket] Socket.io chưa được khởi tạo');
  }
  return io;
};
