const io = require('socket.io-client');

// Test socket connection
const testSocketConnection = () => {
  const socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to socket server');
    console.log('Socket ID:', socket.id);
    
    // Test joining a room
    const testUserId = 'test-user-123';
    socket.emit('joinRoom', testUserId);
  });

  socket.on('test', (data) => {
    console.log('✅ Received test message:', data);
  });

  socket.on('notifications', (notification) => {
    console.log('✅ Received notification:', notification);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected:', reason);
  });

  // Test sending a notification after 2 seconds
  setTimeout(() => {
    console.log('Testing notification emission...');
    fetch('http://localhost:5000/api/v1/notification/test-socket?userId=test-user-123')
      .then(response => response.json())
      .then(data => {
        console.log('Test endpoint response:', data);
      })
      .catch(error => {
        console.error('Test endpoint error:', error);
      });
  }, 2000);

  // Cleanup after 10 seconds
  setTimeout(() => {
    console.log('Cleaning up test connection...');
    socket.disconnect();
    process.exit(0);
  }, 10000);
};

console.log('🧪 Starting socket connection test...');
testSocketConnection(); 