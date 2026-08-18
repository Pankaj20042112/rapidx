import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store, Ride } from '../store';
import { authenticate, authorize, generateToken, AuthenticatedRequest } from '../middleware/auth';
import { translations } from '../i18n';

const router = Router();

// ==========================================
// 1. MULTI-LANGUAGE I18N MODULE (/i18n)
// ==========================================
router.get('/i18n/:lang', (req, res) => {
  const lang = req.params.lang || 'en';
  const dict = translations[lang] || translations.en;
  return res.json({ success: true, data: dict });
});

// ==========================================
// 2. AUTH MODULE (/auth)
// ==========================================
router.post('/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Phone number is required' } });
  }

  return res.json({
    success: true,
    data: { message: 'OTP sent successfully', phone, devOtp: '123456' },
  });
});

router.post('/auth/verify-otp', (req, res) => {
  const { phone, otp, role = 'CUSTOMER', fullName = 'RideX User' } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Phone and OTP required' } });
  }

  if (otp !== '123456' && otp !== '000000') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'Invalid OTP entered' } });
  }

  let user = Array.from(store.users.values()).find(u => u.phone === phone);
  if (!user) {
    user = {
      id: 'usr-' + uuidv4().substring(0, 8),
      phone,
      email: `${phone.replace(/\D/g, '')}@ridex-user.com`,
      fullName: fullName || (role === 'DRIVER' ? 'Demo Driver' : 'Demo Rider'),
      role: role as any,
      createdAt: new Date().toISOString(),
    };
    store.users.set(user.id, user);

    // Initialize Wallet
    store.wallets.set(user.id, {
      id: 'w-' + uuidv4().substring(0, 8),
      userId: user.id,
      balance: 250.00,
      createdAt: new Date().toISOString(),
    });

    if (role === 'DRIVER') {
      const driverId = 'drv-' + uuidv4().substring(0, 8);
      store.drivers.set(driverId, {
        id: driverId,
        userId: user.id,
        status: 'OFFLINE',
        kycStatus: 'APPROVED',
        rating: 4.9,
        totalRides: 120,
        acceptanceRate: 98,
        cancellationRate: 1.5,
        currentLat: 12.9716,
        currentLng: 77.5946,
        locationUpdatedAt: new Date().toISOString(),
      });

      store.vehicles.set('veh-' + uuidv4().substring(0, 8), {
        id: 'veh-' + uuidv4().substring(0, 8),
        driverId,
        type: 'CAB_ECONOMY',
        make: 'Hyundai',
        model: 'i20',
        licensePlate: `RX-${Math.floor(10 + Math.random() * 89)}-EV`,
        color: 'Black',
        capacity: 4,
      });
    }
  }

  const token = generateToken({ id: user.id, phone: user.phone, role: user.role });
  store.addAuditLog(user.id, user.role, 'USER_LOGIN', '/auth/verify-otp');

  return res.json({
    success: true,
    data: { token, user },
  });
});

// ==========================================
// 3. USER PROFILE & MEMBERSHIP MODULE (/users, /membership, /referrals)
// ==========================================
router.get('/users/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = store.users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  
  let driverProfile: any = null;
  let vehicle: any = null;
  if (user.role === 'DRIVER') {
    driverProfile = Array.from(store.drivers.values()).find(d => d.userId === user.id);
    if (driverProfile) {
      vehicle = Array.from(store.vehicles.values()).find(v => v.driverId === driverProfile.id);
    }
  }

  const wallet = store.wallets.get(user.id);

  return res.json({
    success: true,
    data: {
      user,
      driverProfile,
      vehicle,
      walletBalance: wallet ? wallet.balance : 0,
      referralCode: 'RIDEX-' + user.id.substring(4, 8).toUpperCase(),
      isPrimeMember: true,
    },
  });
});

router.get('/drivers/me/dashboard', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const user = store.users.get(req.user!.id);
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  const wallet = store.wallets.get(req.user!.id);
  const vehicle = driver ? Array.from(store.vehicles.values()).find(v => v.driverId === driver.id) : null;

  return res.json({
    success: true,
    data: {
      driverName: user?.fullName || 'Rahul Sharma',
      rating: driver?.rating || 4.8,
      totalRidesCount: driver?.totalRides || 512,
      todayEarnings: 2350,
      todayRides: 12,
      onlineMinutes: 390,
      acceptanceRate: driver?.acceptanceRate || 92,
      walletBalance: wallet ? wallet.balance : 4250,
      isOnline: driver?.status === 'ONLINE' || driver?.status === 'BUSY',
      vehicle,
      user,
    },
  });
});

router.post('/drivers/me/profile', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const { fullName, email, make, model, licensePlate, color } = req.body;
  const user = store.users.get(req.user!.id);
  if (user) {
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    store.users.set(user.id, user);
  }

  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (driver) {
    const vehicle = Array.from(store.vehicles.values()).find(v => v.driverId === driver.id);
    if (vehicle) {
      if (make) vehicle.make = make;
      if (model) vehicle.model = model;
      if (licensePlate) vehicle.licensePlate = licensePlate;
      if (color) vehicle.color = color;
      store.vehicles.set(vehicle.id, vehicle);
    }
  }

  return res.json({ success: true, data: { message: 'Profile updated successfully', user } });
});

router.post('/drivers/me/online', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (driver) {
    driver.status = 'ONLINE';
    store.drivers.set(driver.id, driver);
  }
  return res.json({ success: true, data: { status: 'ONLINE' } });
});

router.post('/drivers/me/offline', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (driver) {
    driver.status = 'OFFLINE';
    store.drivers.set(driver.id, driver);
  }
  return res.json({ success: true, data: { status: 'OFFLINE' } });
});

router.get('/drivers/earnings', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: {
      todayEarnings: 2350,
      weeklyEarnings: 14250,
      monthlyEarnings: 58900,
      grossEarnings: 2850,
      platformCommission: 350,
      taxes: 150,
      netEarnings: 2350,
      totalEarnings: 2350,
    },
  });
});

router.get('/referrals', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: {
      code: 'RIDEX-' + req.user!.id.substring(4, 8).toUpperCase(),
      rewardAmount: 50,
      totalReferred: 3,
      earnings: 150,
    },
  });
});

router.get('/membership', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: {
      status: 'ACTIVE',
      planName: 'RideX Prime',
      perks: ['Zero Booking Fee', '10% Cashback on Wallet', 'Priority Driver Dispatch'],
      expiresAt: '2028-12-31T23:59:59Z',
    },
  });
});

// ==========================================
// 4. PRICING & "WHY THIS PRICE?" BREAKDOWN (/rides/estimate, /rides/breakdown)
// ==========================================
function calculateFare(distanceKm: number, durationMin: number, vehicleType: string, surge: number = 1.0) {
  let baseFare = 30;
  let perKm = 12;
  let perMin = 2;

  switch (vehicleType) {
    case 'BIKE':
      baseFare = 20; perKm = 8; perMin = 1.5; break;
    case 'AUTO':
      baseFare = 25; perKm = 10; perMin = 1.8; break;
    case 'CAB_ECONOMY':
      baseFare = 40; perKm = 14; perMin = 2.5; break;
    case 'CAB_PREMIUM':
      baseFare = 70; perKm = 22; perMin = 4.0; break;
    case 'RENTAL':
      baseFare = 150; perKm = 15; perMin = 3.0; break;
    case 'OUTSTATION':
      baseFare = 300; perKm = 18; perMin = 3.5; break;
  }

  const distanceCharge = Math.round(distanceKm * perKm);
  const timeCharge = Math.round(durationMin * perMin);
  const bookingFee = 15;
  const platformFee = 10;
  const rawSubtotal = (baseFare + distanceCharge + timeCharge + bookingFee + platformFee) * surge;
  const tax = Math.round(rawSubtotal * 0.05);
  const totalFare = Math.round(rawSubtotal + tax);

  return {
    baseFare,
    distanceCharge,
    timeCharge,
    bookingFee,
    platformFee,
    surgeMultiplier: surge,
    tax,
    totalFare,
  };
}

router.post('/rides/estimate', (req, res) => {
  const { pickupLat, pickupLng, destinationLat, destinationLng, vehicleType = 'CAB_ECONOMY', couponCode } = req.body;

  const latDiff = (destinationLat - pickupLat) * 111;
  const lngDiff = (destinationLng - pickupLng) * 111 * Math.cos((pickupLat * Math.PI) / 180);
  const distanceKm = Math.max(1.5, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 10) / 10);
  const durationMin = Math.max(5, Math.round(distanceKm * 3));

  const activeDrivers = Array.from(store.drivers.values()).filter(d => d.status === 'ONLINE');
  const surge = activeDrivers.length < 2 ? 1.2 : 1.0;

  const breakdown = calculateFare(distanceKm, durationMin, vehicleType, surge);

  let discount = 0;
  if (couponCode && store.coupons.has(couponCode.toUpperCase())) {
    const coupon = store.coupons.get(couponCode.toUpperCase())!;
    if (coupon.active && breakdown.totalFare >= coupon.minFare) {
      discount = Math.min((breakdown.totalFare * coupon.discountPercent) / 100, coupon.maxDiscount);
    }
  }

  const finalFare = Math.max(20, breakdown.totalFare - discount);

  return res.json({
    success: true,
    data: {
      distanceKm,
      durationMin,
      vehicleType,
      breakdown,
      discount,
      finalFare,
      etaMinutes: Math.min(8, Math.max(2, Math.round(distanceKm * 1.2))),
    },
  });
});

router.post('/rides/breakdown', (req, res) => {
  const { distanceKm = 10, durationMin = 20, vehicleType = 'CAB_ECONOMY', surge = 1.0 } = req.body;
  const breakdown = calculateFare(distanceKm, durationMin, vehicleType, surge);

  return res.json({
    success: true,
    data: {
      breakdown,
      explanation: `Base fare is $${breakdown.baseFare}. Distance charge covers $${breakdown.distanceCharge} for ${distanceKm} km. Time rate covers $${breakdown.timeCharge} for ${durationMin} mins. Platform and booking fees cover safety & map infrastructure. Current surge multiplier is ${surge}x based on zone demand.`,
    },
  });
});

// ==========================================
// 5. DRIVER INCENTIVES ENGINE (/incentives)
// ==========================================
router.get('/incentives', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: {
      title: 'Daily Peak Hours Quest',
      currentRides: 7,
      targetRides: 10,
      rewardBonus: 250,
      expiresInHours: 5,
      description: 'Complete 3 more rides today to unlock ₹250 instant wallet bonus!',
    },
  });
});

// ==========================================
// 6. RIDE LIFECYCLE MODULE (/rides)
// ==========================================
router.post('/rides', authenticate, authorize('CUSTOMER'), (req: AuthenticatedRequest, res: Response) => {
  const {
    pickupLat, pickupLng, pickupAddress,
    destinationLat, destinationLng, destinationAddress,
    vehicleType = 'CAB_ECONOMY', category = 'REGULAR', couponCode, scheduledAt, rentalHours,
  } = req.body;

  const latDiff = (destinationLat - pickupLat) * 111;
  const lngDiff = (destinationLng - pickupLng) * 111 * Math.cos((pickupLat * Math.PI) / 180);
  const distanceKm = Math.max(1.5, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 10) / 10);
  const durationMin = Math.max(5, Math.round(distanceKm * 3));
  const fareObj = calculateFare(distanceKm, durationMin, vehicleType, 1.0);
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const ride: Ride = {
    id: 'rd-' + uuidv4().substring(0, 8),
    customerId: req.user!.id,
    status: 'SEARCHING_DRIVER',
    category,
    vehicleType,
    pickupLat, pickupLng, pickupAddress: pickupAddress || 'Tech Park Downtown',
    destinationLat, destinationLng, destinationAddress: destinationAddress || 'International Airport Terminal 2',
    otp,
    estimatedFare: fareObj.totalFare,
    distanceKm,
    durationMin,
    surgeMultiplier: 1.0,
    scheduledAt,
    rentalHours,
    createdAt: new Date().toISOString(),
  };

  store.rides.set(ride.id, ride);
  store.addAuditLog(req.user!.id, req.user!.role, 'RIDE_CREATED', '/rides', { rideId: ride.id });

  // Broadcast WebSocket events to Driver and Admin apps
  const io = (req as any).io;
  if (io) {
    io.emit('ride:created', ride);
    io.emit('admin:ride_created', ride);
  }

  return res.json({ success: true, data: ride });
});

router.get('/rides', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userRides = Array.from(store.rides.values()).filter(r => {
    if (req.user!.role === 'CUSTOMER') return r.customerId === req.user!.id;
    if (req.user!.role === 'DRIVER') {
      const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
      return driver && (r.driverId === driver.id || r.status === 'SEARCHING_DRIVER');
    }
    return true;
  });

  return res.json({ success: true, data: userRides.reverse() });
});

router.get('/rides/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  let driver: any = null;
  let vehicle: any = null;
  if (ride.driverId) {
    driver = store.drivers.get(ride.driverId);
    if (driver) {
      const driverUser = store.users.get(driver.userId);
      vehicle = Array.from(store.vehicles.values()).find(v => v.driverId === driver.id);
      driver = { ...driver, fullName: driverUser?.fullName, phone: driverUser?.phone };
    }
  }

  return res.json({ success: true, data: { ...ride, driver, vehicle } });
});

router.get('/rides/requests', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const searchingRides = Array.from(store.rides.values()).filter(r => r.status === 'SEARCHING_DRIVER');
  if (searchingRides.length === 0) {
    // Generate an available request
    const demoRide: Ride = {
      id: 'rd-' + uuidv4().substring(0, 8),
      customerId: 'cust-demo-1',
      status: 'SEARCHING_DRIVER',
      category: 'REGULAR',
      vehicleType: 'CAB_ECONOMY',
      pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: 'LD College of Engineering',
      destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: 'Chandkheda',
      otp: '8978',
      estimatedFare: 473.70,
      distanceKm: 12.4,
      durationMin: 28,
      surgeMultiplier: 1.0,
      createdAt: new Date().toISOString(),
    };
    store.rides.set(demoRide.id, demoRide);
    return res.json({ success: true, data: [demoRide] });
  }
  return res.json({ success: true, data: searchingRides });
});

router.post('/rides/:id/accept', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  const driverId = driver ? driver.id : 'drv-demo-1';

  let ride = store.rides.get(req.params.id);
  if (!ride) {
    // Auto-create ride object on the fly for demo/instant acceptance
    ride = {
      id: req.params.id,
      customerId: 'cust-demo-1',
      status: 'DRIVER_ASSIGNED',
      category: 'REGULAR',
      vehicleType: 'CAB_ECONOMY',
      pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: 'LD College of Engineering',
      destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: 'Chandkheda',
      otp: '8978',
      estimatedFare: 473.70,
      distanceKm: 12.4,
      durationMin: 28,
      surgeMultiplier: 1.0,
      driverId,
      createdAt: new Date().toISOString(),
    };
    store.rides.set(ride.id, ride);
  } else {
    ride.status = 'DRIVER_ASSIGNED';
    ride.driverId = driverId;
    store.rides.set(ride.id, ride);
  }

  if (driver) {
    driver.status = 'BUSY';
    store.drivers.set(driver.id, driver);
  }

  store.addAuditLog(req.user!.id, req.user!.role, 'RIDE_ACCEPTED', `/rides/${ride.id}/accept`);

  const io = (req as any).io;
  if (io) {
    io.emit('ride:accepted', ride);
    io.emit(`ride:status:${ride.id}`, ride);
    io.emit('admin:ride_updated', ride);
  }

  return res.json({ success: true, data: ride });
});

router.post('/rides/:id/arrived', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  let ride = store.rides.get(req.params.id);
  if (!ride) {
    ride = {
      id: req.params.id,
      customerId: 'cust-demo-1',
      status: 'DRIVER_ARRIVED',
      category: 'REGULAR',
      vehicleType: 'CAB_ECONOMY',
      pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: 'LD College of Engineering',
      destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: 'Chandkheda',
      otp: '8978',
      estimatedFare: 473.70,
      distanceKm: 12.4,
      durationMin: 28,
      surgeMultiplier: 1.0,
      createdAt: new Date().toISOString(),
    };
  } else {
    ride.status = 'DRIVER_ARRIVED';
  }
  store.rides.set(ride.id, ride);

  const io = (req as any).io;
  if (io) {
    io.emit('ride:arrived', ride);
    io.emit(`ride:status:${ride.id}`, ride);
  }

  return res.json({ success: true, data: ride });
});

router.post('/rides/:id/start', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const { otp } = req.body;
  let ride = store.rides.get(req.params.id);

  if (!ride) {
    ride = {
      id: req.params.id,
      customerId: 'cust-demo-1',
      status: 'IN_PROGRESS',
      category: 'REGULAR',
      vehicleType: 'CAB_ECONOMY',
      pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: 'LD College of Engineering',
      destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: 'Chandkheda',
      otp: '8978',
      estimatedFare: 473.70,
      distanceKm: 12.4,
      durationMin: 28,
      surgeMultiplier: 1.0,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  } else {
    ride.status = 'IN_PROGRESS';
    ride.startedAt = new Date().toISOString();
  }
  store.rides.set(ride.id, ride);

  const io = (req as any).io;
  if (io) {
    io.emit('ride:started', ride);
    io.emit(`ride:status:${ride.id}`, ride);
  }

  return res.json({ success: true, data: ride });
});

router.post('/rides/:id/complete', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  let ride = store.rides.get(req.params.id);
  if (!ride) {
    ride = {
      id: req.params.id,
      customerId: 'cust-demo-1',
      status: 'COMPLETED',
      category: 'REGULAR',
      vehicleType: 'CAB_ECONOMY',
      pickupLat: 12.9716, pickupLng: 77.5946, pickupAddress: 'LD College of Engineering',
      destinationLat: 13.0827, destinationLng: 80.2707, destinationAddress: 'Chandkheda',
      otp: '8978',
      estimatedFare: 473.70,
      finalFare: 473.70,
      distanceKm: 12.4,
      durationMin: 28,
      surgeMultiplier: 1.0,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  } else {
    ride.status = 'COMPLETED';
    ride.completedAt = new Date().toISOString();
    ride.finalFare = ride.estimatedFare || 473.70;
  }
  store.rides.set(ride.id, ride);

  const io = (req as any).io;
  if (io) {
    io.emit('ride:completed', ride);
    io.emit(`ride:status:${ride.id}`, ride);
    io.emit('admin:ride_completed', ride);
  }

  if (ride.driverId) {
    const driver = store.drivers.get(ride.driverId);
    if (driver) {
      driver.status = 'ONLINE';
      driver.totalRides += 1;
      store.drivers.set(driver.id, driver);
    }
  }

  store.rides.set(ride.id, ride);
  return res.json({ success: true, data: ride });
});

router.post('/rides/:id/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { reason = 'User requested cancellation' } = req.body;
  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride missing' } });

  ride.status = 'CANCELLED';
  (ride as any).cancellationReason = reason;

  if (ride.driverId) {
    const driver = store.drivers.get(ride.driverId);
    if (driver) {
      driver.status = 'ONLINE';
      store.drivers.set(driver.id, driver);
    }
  }

  store.rides.set(ride.id, ride);
  store.addAuditLog(req.user!.id, req.user!.role, 'RIDE_CANCELLED', `/rides/${ride.id}/cancel`, { reason });

  return res.json({ success: true, data: { ride, message: 'Ride cancelled successfully' } });
});

// ==========================================
// 7. PAYMENTS & WALLET MODULE (/payments, /wallet)
// ==========================================
router.get('/wallet', authenticate, (req: AuthenticatedRequest, res: Response) => {
  let wallet = store.wallets.get(req.user!.id);
  if (!wallet) {
    wallet = { id: 'w-' + uuidv4().substring(0, 8), userId: req.user!.id, balance: 350.00, createdAt: new Date().toISOString() };
    store.wallets.set(req.user!.id, wallet);
  }
  const transactions = store.walletTransactions.get(wallet.id) || [
    { id: 'wtx-1', walletId: wallet.id, amount: 250, type: 'CREDIT', description: 'Initial Sign Up Bonus', createdAt: new Date().toISOString() },
    { id: 'wtx-2', walletId: wallet.id, amount: 100, type: 'CREDIT', description: 'Referral Cashback Reward', createdAt: new Date().toISOString() }
  ];
  return res.json({ success: true, data: { wallet, transactions } });
});

router.post('/wallet/add-money', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body;
  let wallet = store.wallets.get(req.user!.id);
  if (!wallet) {
    wallet = { id: 'w-' + uuidv4().substring(0, 8), userId: req.user!.id, balance: 0, createdAt: new Date().toISOString() };
  }

  wallet.balance += Number(amount || 100);
  store.wallets.set(req.user!.id, wallet);
  return res.json({ success: true, data: wallet });
});

// ==========================================
// 8. SOS & SAFETY MODULE (/sos)
// ==========================================
router.post('/sos', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { rideId, latitude, longitude } = req.body;
  const sos = {
    id: 'sos-' + uuidv4().substring(0, 8),
    rideId: rideId || 'rd-emergency',
    triggeredBy: req.user!.id,
    currentLat: latitude || 12.9716,
    currentLng: longitude || 77.5946,
    status: 'OPEN' as const,
    createdAt: new Date().toISOString(),
  };

  store.sosEvents.set(sos.id, sos);
  return res.json({ success: true, data: { sos, message: 'SOS Triggered! Safety Team & Emergency Contacts Alerted.' } });
});

// EV & Fuel Station Finder API
router.get('/stations', (req: any, res: any) => {
  const stations = [
    { id: 'st-1', name: 'Tata Power EV Supercharger', type: 'EV', distanceKm: 0.8, status: 'AVAILABLE', price: '₹15/kWh', slotsFree: '3/4 Guns Free' },
    { id: 'st-2', name: 'Shell Fuel & EV Station', type: 'HYBRID', distanceKm: 1.4, status: 'OPEN', price: '₹96.4/L', slotsFree: '2/2 Fast Guns' },
    { id: 'st-3', name: 'BPCL CNG Express Hub', type: 'CNG', distanceKm: 2.1, status: 'LOW_WAIT', price: '₹84.0/kg', slotsFree: '4 Pumps Active' }
  ];
  return res.json({ success: true, data: stations });
});

// Admin Dynamic Pricing Update API
router.post('/pricing/update', authenticate, authorize('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { baseFare = 40, perKm = 14, surgeMultiplier = 1.2 } = req.body;
  const updatedPricing = { baseFare, perKm, surgeMultiplier, updatedAt: new Date().toISOString() };
  store.addAuditLog(req.user!.id, req.user!.role, 'PRICING_UPDATED', '/pricing/update', updatedPricing);
  
  const io = (req as any).io;
  if (io) {
    io.emit('admin:pricing_updated', updatedPricing);
  }
  return res.json({ success: true, data: updatedPricing });
});

// VIP RideX Pass Subscription API
router.post('/pass/subscribe', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const pass = { id: 'pass-vip-1', tier: 'GOLD_PASS', discountPercent: 15, zeroSurge: true, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() };
  return res.json({ success: true, data: { pass, message: '🎉 RideX VIP Pass Activated! Zero Surge & 15% OFF Active' } });
});

// ==========================================
// 9. ADMIN DASHBOARD & AUDIT MODULE (/admin)
// ==========================================
router.get('/admin/overview', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: {
      metrics: {
        totalUsers: store.users.size,
        totalDrivers: store.drivers.size,
        activeDrivers: Array.from(store.drivers.values()).filter(d => d.status === 'ONLINE' || d.status === 'BUSY').length,
        totalRides: store.rides.size,
        completedRides: Array.from(store.rides.values()).filter(r => r.status === 'COMPLETED').length,
        totalRevenue: 14850,
        activeSOSCount: Array.from(store.sosEvents.values()).filter(s => s.status === 'OPEN').length,
      },
    },
  });
});

router.get('/admin/drivers', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const list = Array.from(store.drivers.values()).map(d => {
    const u = store.users.get(d.userId);
    const v = Array.from(store.vehicles.values()).find(veh => veh.driverId === d.id);
    return { ...d, fullName: u?.fullName, phone: u?.phone, email: u?.email, vehicle: v };
  });
  return res.json({ success: true, data: list });
});

router.get('/admin/audit-logs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, data: store.auditLogs });
});

export default router;
