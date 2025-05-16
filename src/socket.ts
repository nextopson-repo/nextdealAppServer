import { Server } from 'socket.io';
import { createServer } from 'http';
import { Express, Request, Response } from 'express';
import { AppDataSource } from './server';

let io: Server;

export const initializeSocket = (app: Express) => {
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: { origin: '*', credentials: true, methods: ['GET', 'POST'] },
  });

 

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinRoom', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });


    // Broadcast message to all clients
    socket.on('broadcastMessage', (message) => {
      console.log('Broadcasting message:', message);
      io.emit('receiveBroadcast', { message });
    });

    // Broadcast message to a specific room
    socket.on('broadcastToRoom', ({ roomId, message }) => {
      console.log(`Broadcasting to room ${roomId}:`, message);
      socket.to(roomId).emit('receiveRoomBroadcast', { roomId, message });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return httpServer;
};

export const broadcastMessage = (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  io.emit('receiveBroadcast', { message });
  return res.status(200).json({ status: 'success', message: 'Broadcast sent' });
};

export const getSocketInstance = () => io;
