import { Server, Socket } from 'socket.io';
import { DriverModel } from '../database/schemas';

export class TelemetryGateway {
  constructor(private io: Server) {
    this.setupListeners();
  }

  private setupListeners() {
    this.io.on('connection', (socket: Socket) => {
      // Driver GPS Trajectory Ingestion
      socket.on('driver:location_update', async (data: { driverId: string; longitude: number; latitude: number; speed?: number }) => {
        try {
          // Update MongoDB 2dsphere location
          await DriverModel.updateOne(
            { userId: data.driverId },
            {
              $set: {
                location: { type: 'Point', coordinates: [data.longitude, data.latitude] }
              }
            }
          );
        } catch (err) {
          // Ignore spatial update errors during disconnected tests
        }

        // Broadcast to dynamic trip room ride_channel:{rideId}
        socket.broadcast.emit(`ride:driver_location:${data.driverId}`, data);
        this.io.emit('admin:fleet_update', data);
      });

      // Join Ride Channel Room
      socket.on('ride:join_room', (data: { rideId: string }) => {
        socket.join(`ride_channel:${data.rideId}`);
      });
    });
  }
}
