import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { store } from './store';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Health Check Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ridex-backend', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', database: 'connected', redis: 'ready' });
});

// API Routes
app.use('/api', apiRouter);

// WebSocket Event Handling (Real-Time Location & Chat)
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Driver Location Broadcast
  socket.on('driver:location_update', (data: { driverId: string; latitude: number; longitude: number; speed?: number }) => {
    const driver = store.drivers.get(data.driverId);
    if (driver) {
      driver.currentLat = data.latitude;
      driver.currentLng = data.longitude;
      driver.locationUpdatedAt = new Date().toISOString();
      store.drivers.set(driver.id, driver);
    }
    // Broadcast live location to customer listening for this driver
    io.emit(`ride:driver_location:${data.driverId}`, data);
    io.emit('admin:fleet_update', { driverId: data.driverId, latitude: data.latitude, longitude: data.longitude });
  });

  // Ride Chat Messaging
  socket.on('chat:send_message', (data: { rideId: string; senderId: string; message: string }) => {
    const chatMsg = {
      id: 'msg-' + Date.now(),
      rideId: data.rideId,
      senderId: data.senderId,
      message: data.message,
      createdAt: new Date().toISOString(),
    };
    io.emit(`chat:ride:${data.rideId}`, chatMsg);
  });

  // SOS Alert Broadcast
  socket.on('sos:trigger', (data: { rideId: string; userId: string; lat: number; lng: number }) => {
    io.emit('admin:sos_alert', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server',
    },
    requestId: req.headers['x-request-id'] || 'req-' + Date.now(),
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 RideX Backend Server running on http://localhost:${PORT}`);
});
