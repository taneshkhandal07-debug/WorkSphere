const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 3001 });

// Store active connections and typing states
console.log('WebSocket Broadcast Server initializing on port 3001...');

wss.on('connection', (ws) => {
  console.log('Client connected successfully.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Broadcast parsed message to all other connected clients
      const payloadString = JSON.stringify(data);
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(payloadString);
        }
      });
    } catch (err) {
      console.error('Error broadcasting websocket frame:', err);
      
      // Fallback: broadcast raw message
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(message.toString());
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected.');
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err);
  });
});

console.log('WebSocket Server is running at ws://localhost:3001');
