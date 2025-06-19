import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { Express, Request, Response } from 'express';

let io: SocketIOServer;

export const initializeSocket = (app: Express) => {
  const httpServer = createServer(app);
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', credentials: true, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinRoom', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
      
      // Send a test message to confirm room joining
      socket.emit('test', { message: `Successfully joined room for user ${userId}`, userId });
      
      // Log all rooms this socket is in
      const rooms = Array.from(socket.rooms);
      console.log(`Socket ${socket.id} is now in rooms:`, rooms);
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
      console.log('Client disconnected:', socket.id);
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

export const testSocketConnection = (req: Request, res: Response) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const io = getSocketInstance();
    
    // Get all sockets in the user's room
    const room = io.sockets.adapter.rooms.get(userId as string);
    const connectedUsers = room ? Array.from(room) : [];
    
    console.log(`Testing socket connection for user ${userId}`);
    console.log(`Connected users in room:`, connectedUsers);
    
    // Send a test message to the user's room
    io.to(userId as string).emit('test', { 
      message: 'Test message from server', 
      timestamp: new Date().toISOString(),
      connectedUsers 
    });
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Test message sent',
      connectedUsers,
      roomExists: !!room
    });
  } catch (error) {
    console.error('Error testing socket connection:', error);
    return res.status(500).json({ error: 'Socket server error' });
  }
};

export const getSocketInstance = () => {
  if (!io) {
    console.error('Socket.IO server not initialized');
    throw new Error('Socket.IO server not initialized');
  }
  return io;
};
