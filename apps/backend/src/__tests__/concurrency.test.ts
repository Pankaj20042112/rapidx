import { ridesService } from '../services/rides.service';

describe('RideX MongoDB & Redlock Anti-Race Concurrency Verification', () => {
  let rideId: string;
  const driver1UserId = 'usr-driver-race-1';
  const driver2UserId = 'usr-driver-race-2';

  beforeEach(async () => {
    // Register Mock Driver 1
    ridesService.registerMockDriver({
      id: 'drv-1',
      userId: driver1UserId,
      status: 'ONLINE',
      kycStatus: 'APPROVED',
      vehicleCategory: 'CAB_ECONOMY',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    });

    // Register Mock Driver 2
    ridesService.registerMockDriver({
      id: 'drv-2',
      userId: driver2UserId,
      status: 'ONLINE',
      kycStatus: 'APPROVED',
      vehicleCategory: 'CAB_ECONOMY',
      location: { type: 'Point', coordinates: [77.5950, 12.9720] },
    });

    // Create Searching Ride
    const { ride } = await ridesService.createRide({
      customerId: 'usr-customer-race',
      pickupLocation: [77.5946, 12.9716], // [lng, lat]
      pickupAddress: 'Tech Hub',
      destinationLocation: [80.2707, 13.0827], // [lng, lat]
      destinationAddress: 'Airport',
      vehicleCategory: 'CAB_ECONOMY',
      estimatedFare: 250,
      distanceKm: 15,
      durationMin: 30,
    });

    rideId = (ride as any)._id || (ride as any).id;
  });

  test('Anti-Race Guard: Two simultaneous driver acceptances produce strictly 1 winner and 0 duplicates', async () => {
    // Fire simultaneous acceptance calls
    const results = await Promise.allSettled([
      ridesService.acceptRideTransaction(rideId, driver1UserId),
      ridesService.acceptRideTransaction(rideId, driver2UserId),
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // ASSERTION: Exactly 1 driver wins the ride
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const winningRide: any = (fulfilled[0] as PromiseFulfilledResult<any>).value;
    expect(winningRide.status).toBe('DRIVER_ASSIGNED');
    expect(winningRide.driverId).toBeDefined();
  });

  test('Cryptographic OTP verification validates 4-digit bcrypt hash', async () => {
    const { ride, plainOtp } = await ridesService.createRide({
      customerId: 'usr-customer-otp',
      pickupLocation: [77.5946, 12.9716],
      pickupAddress: 'Pickup',
      destinationLocation: [80.2707, 13.0827],
      destinationAddress: 'Destination',
      estimatedFare: 100,
      distanceKm: 5,
      durationMin: 15,
    });

    const targetId = (ride as any)._id || (ride as any).id;
    (ride as any).status = 'DRIVER_ARRIVED';

    // Valid OTP start
    const startedRide = await ridesService.verifyOtpAndStartRide(targetId, plainOtp);
    expect(startedRide.status).toBe('IN_PROGRESS');

    // Invalid OTP rejection
    await expect(ridesService.verifyOtpAndStartRide(targetId, '9999')).rejects.toThrow();
  });
});
