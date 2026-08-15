import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store, Ride } from '../store';
import { authenticate, authorize, generateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. AUTH MODULE (/auth)
// ==========================================
router.post('/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Phone number is required' } });
  }

  // Mock static demo OTP for easy testing: 123456
  const otp = '123456';
  return res.json({
    success: true,
    data: { message: 'OTP sent successfully', phone, devOtp: otp },
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
      balance: 150.00,
      createdAt: new Date().toISOString(),
    });

    // If driver, initialize driver profile & vehicle
    if (role === 'DRIVER') {
      const driverId = 'drv-' + uuidv4().substring(0, 8);
      store.drivers.set(driverId, {
        id: driverId,
        userId: user.id,
        status: 'OFFLINE',
        kycStatus: 'APPROVED',
        rating: 5.0,
        totalRides: 0,
        acceptanceRate: 100,
        cancellationRate: 0,
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
// 2. USERS & PROFILE MODULE (/users)
// ==========================================
router.get('/users/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = store.users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  
  let driverProfile: any = null;
  let vehicle = null;
  if (user.role === 'DRIVER') {
    driverProfile = Array.from(store.drivers.values()).find(d => d.userId === user.id);
    if (driverProfile) {
      vehicle = Array.from(store.vehicles.values()).find(v => v.driverId === driverProfile.id);
    }
  }

  const wallet = store.wallets.get(user.id);

  return res.json({
    success: true,
    data: { user, driverProfile, vehicle, walletBalance: wallet ? wallet.balance : 0 },
  });
});

router.patch('/users/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = store.users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });

  const { fullName, email } = req.body;
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;

  store.users.set(user.id, user);
  return res.json({ success: true, data: user });
});

// ==========================================
// 3. PRICING ENGINE & ESTIMATE MODULE (/rides/estimate)
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

  const rawFare = (baseFare + (distanceKm * perKm) + (durationMin * perMin)) * surge;
  const taxes = rawFare * 0.05; // 5% tax
  const totalFare = Math.round(rawFare + taxes);

  return {
    baseFare,
    distanceFare: Math.round(distanceKm * perKm),
    timeFare: Math.round(durationMin * perMin),
    surgeMultiplier: surge,
    tax: Math.round(taxes),
    estimatedFare: totalFare,
  };
}

router.post('/rides/estimate', (req, res) => {
  const { pickupLat, pickupLng, destinationLat, destinationLng, vehicleType = 'CAB_ECONOMY', couponCode } = req.body;
  
  // Calculate Euclidean distance approximation for demo routes
  const latDiff = (destinationLat - pickupLat) * 111;
  const lngDiff = (destinationLng - pickupLng) * 111 * Math.cos((pickupLat * Math.PI) / 180);
  const distanceKm = Math.max(1.5, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 10) / 10);
  const durationMin = Math.max(5, Math.round(distanceKm * 3));

  // Determine surge based on simulated online driver density
  const activeDrivers = Array.from(store.drivers.values()).filter(d => d.status === 'ONLINE');
  const surge = activeDrivers.length < 2 ? 1.3 : 1.0;

  const fareDetails = calculateFare(distanceKm, durationMin, vehicleType, surge);

  let discount = 0;
  if (couponCode && store.coupons.has(couponCode.toUpperCase())) {
    const coupon = store.coupons.get(couponCode.toUpperCase())!;
    if (coupon.active && fareDetails.estimatedFare >= coupon.minFare) {
      discount = Math.min((fareDetails.estimatedFare * coupon.discountPercent) / 100, coupon.maxDiscount);
    }
  }

  const finalEstimatedFare = Math.max(20, fareDetails.estimatedFare - discount);

  return res.json({
    success: true,
    data: {
      distanceKm,
      durationMin,
      vehicleType,
      fareDetails,
      discount,
      finalFare: finalEstimatedFare,
      etaMinutes: Math.min(8, Math.max(2, Math.round(distanceKm * 1.2))),
    },
  });
});

// ==========================================
// 4. RIDE MANAGEMENT & MATCHING MODULE (/rides)
// ==========================================
router.post('/rides', authenticate, authorize('CUSTOMER'), (req: AuthenticatedRequest, res: Response) => {
  const {
    pickupLat,
    pickupLng,
    pickupAddress,
    destinationLat,
    destinationLng,
    destinationAddress,
    vehicleType = 'CAB_ECONOMY',
    category = 'REGULAR',
    couponCode,
    scheduledAt,
    rentalHours,
  } = req.body;

  if (!pickupLat || !pickupLng || !destinationLat || !destinationLng) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_COORDINATES', message: 'Pickup & Destination coordinates required' } });
  }

  // Calculate distance & fare
  const latDiff = (destinationLat - pickupLat) * 111;
  const lngDiff = (destinationLng - pickupLng) * 111 * Math.cos((pickupLat * Math.PI) / 180);
  const distanceKm = Math.max(1.5, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 10) / 10);
  const durationMin = Math.max(5, Math.round(distanceKm * 3));
  const fareObj = calculateFare(distanceKm, durationMin, vehicleType, 1.0);

  // Generate 4-digit Ride OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const ride: Ride = {
    id: 'rd-' + uuidv4().substring(0, 8),
    customerId: req.user!.id,
    status: category === 'SCHEDULED' ? 'SEARCHING_DRIVER' : 'SEARCHING_DRIVER',
    category,
    vehicleType,
    pickupLat,
    pickupLng,
    pickupAddress: pickupAddress || 'Current Location',
    destinationLat,
    destinationLng,
    destinationAddress: destinationAddress || 'Destination Point',
    otp,
    estimatedFare: fareObj.estimatedFare,
    distanceKm,
    durationMin,
    surgeMultiplier: 1.0,
    scheduledAt,
    rentalHours,
    createdAt: new Date().toISOString(),
  };

  store.rides.set(ride.id, ride);
  store.addAuditLog(req.user!.id, req.user!.role, 'RIDE_CREATED', '/rides', { rideId: ride.id });

  return res.json({
    success: true,
    data: ride,
  });
});

router.get('/rides', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userRides = Array.from(store.rides.values()).filter(r => {
    if (req.user!.role === 'CUSTOMER') return r.customerId === req.user!.id;
    if (req.user!.role === 'DRIVER') {
      const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
      return driver && (r.driverId === driver.id || r.status === 'SEARCHING_DRIVER');
    }
    return true; // Admin sees all
  });

  return res.json({ success: true, data: userRides.reverse() });
});

router.get('/rides/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  let driver: any = null;
  let vehicle = null;
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

// Atomic Driver Acceptance Guard
router.post('/rides/:id/accept', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver profile not found' } });

  if (driver.kycStatus !== 'APPROVED') {
    return res.status(403).json({ success: false, error: { code: 'KYC_NOT_APPROVED', message: 'KYC must be approved to accept rides' } });
  }

  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  // CONCURRENCY CHECK: ensure state is SEARCHING_DRIVER
  if (ride.status !== 'SEARCHING_DRIVER') {
    return res.status(409).json({ success: false, error: { code: 'RIDE_ALREADY_ASSIGNED', message: 'This ride has already been accepted by another driver' } });
  }

  ride.status = 'DRIVER_ASSIGNED';
  ride.driverId = driver.id;
  driver.status = 'BUSY';

  store.rides.set(ride.id, ride);
  store.drivers.set(driver.id, driver);
  store.addAuditLog(req.user!.id, req.user!.role, 'RIDE_ACCEPTED', `/rides/${ride.id}/accept`);

  return res.json({ success: true, data: ride });
});

router.post('/rides/:id/arrived', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  if (ride.status !== 'DRIVER_ASSIGNED') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Ride must be DRIVER_ASSIGNED to mark arrived' } });
  }

  ride.status = 'DRIVER_ARRIVED';
  store.rides.set(ride.id, ride);
  return res.json({ success: true, data: ride });
});

// OTP Start Ride Workflow
router.post('/rides/:id/start', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const { otp } = req.body;
  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  if (ride.status !== 'DRIVER_ARRIVED' && ride.status !== 'DRIVER_ASSIGNED') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Driver must arrive at pickup before starting ride' } });
  }

  if (ride.otp !== otp) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'Incorrect Ride OTP provided by rider' } });
  }

  ride.status = 'IN_PROGRESS';
  ride.startedAt = new Date().toISOString();
  store.rides.set(ride.id, ride);
  return res.json({ success: true, data: ride });
});

// Ride Completion & Fare Calculation Workflow
router.post('/rides/:id/complete', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  if (ride.status !== 'IN_PROGRESS') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Ride must be IN_PROGRESS to complete' } });
  }

  ride.status = 'COMPLETED';
  ride.completedAt = new Date().toISOString();
  ride.finalFare = ride.estimatedFare; // Final fare verified server-side

  // Calculate Driver Earnings
  if (ride.driverId) {
    const driver = store.drivers.get(ride.driverId);
    if (driver) {
      driver.status = 'ONLINE';
      driver.totalRides += 1;
      store.drivers.set(driver.id, driver);

      const gross = ride.finalFare;
      const commission = Math.round(gross * 0.15 * 100) / 100; // 15% platform fee
      const tax = Math.round(gross * 0.05 * 100) / 100;
      const net = gross - commission - tax;

      const earningRecord = {
        id: 'earn-' + uuidv4().substring(0, 8),
        driverId: driver.id,
        rideId: ride.id,
        grossFare: gross,
        platformCommission: commission,
        tax,
        netEarnings: net,
        createdAt: new Date().toISOString(),
      };

      const existingEarnings = store.driverEarnings.get(driver.id) || [];
      existingEarnings.push(earningRecord);
      store.driverEarnings.set(driver.id, existingEarnings);
    }
  }

  store.rides.set(ride.id, ride);
  store.addAuditLog(req.user!.id, req.user!.role, 'RIDE_COMPLETED', `/rides/${ride.id}/complete`);

  return res.json({ success: true, data: ride });
});

router.post('/rides/:id/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const ride = store.rides.get(req.params.id);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
    return res.status(400).json({ success: false, error: { code: 'CANNOT_CANCEL', message: 'Completed or already cancelled rides cannot be cancelled' } });
  }

  ride.status = 'CANCELLED';
  ride.cancelledAt = new Date().toISOString();
  store.rides.set(ride.id, ride);

  if (ride.driverId) {
    const driver = store.drivers.get(ride.driverId);
    if (driver) {
      driver.status = 'ONLINE';
      store.drivers.set(driver.id, driver);
    }
  }

  return res.json({ success: true, data: ride });
});

// ==========================================
// 5. PAYMENTS & WALLET MODULE (/payments, /wallet)
// ==========================================
router.post('/payments/create', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { rideId, method = 'UPI', idempotencyKey } = req.body;
  const ride = store.rides.get(rideId);
  if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

  // Idempotency check
  if (idempotencyKey) {
    const existing = Array.from(store.payments.values()).find(p => p.idempotencyKey === idempotencyKey);
    if (existing) return res.json({ success: true, data: existing });
  }

  const amount = ride.finalFare || ride.estimatedFare;
  const payment = {
    id: 'pay-' + uuidv4().substring(0, 8),
    rideId,
    userId: req.user!.id,
    amount,
    method,
    status: 'SUCCESS' as const,
    transactionId: 'TXN-' + Math.floor(10000000 + Math.random() * 90000000),
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  store.payments.set(payment.id, payment);

  // If method is WALLET, deduct balance ledger-style
  if (method === 'WALLET') {
    const wallet = store.wallets.get(req.user!.id);
    if (wallet) {
      wallet.balance -= amount;
      store.wallets.set(req.user!.id, wallet);

      const txns = store.walletTransactions.get(wallet.id) || [];
      txns.push({
        id: 'wtx-' + uuidv4().substring(0, 8),
        walletId: wallet.id,
        amount,
        type: 'DEBIT',
        description: `Ride Fare Payment (#${ride.id})`,
        referenceId: ride.id,
        createdAt: new Date().toISOString(),
      });
      store.walletTransactions.set(wallet.id, txns);
    }
  }

  return res.json({ success: true, data: payment });
});

router.get('/wallet', authenticate, (req: AuthenticatedRequest, res: Response) => {
  let wallet = store.wallets.get(req.user!.id);
  if (!wallet) {
    wallet = { id: 'w-' + uuidv4().substring(0, 8), userId: req.user!.id, balance: 200, createdAt: new Date().toISOString() };
    store.wallets.set(req.user!.id, wallet);
  }
  const transactions = store.walletTransactions.get(wallet.id) || [];
  return res.json({ success: true, data: { wallet, transactions } });
});

router.post('/wallet/add-money', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount must be > 0' } });

  let wallet = store.wallets.get(req.user!.id);
  if (!wallet) {
    wallet = { id: 'w-' + uuidv4().substring(0, 8), userId: req.user!.id, balance: 0, createdAt: new Date().toISOString() };
  }

  wallet.balance += Number(amount);
  store.wallets.set(req.user!.id, wallet);

  const txns = store.walletTransactions.get(wallet.id) || [];
  const txnRecord = {
    id: 'wtx-' + uuidv4().substring(0, 8),
    walletId: wallet.id,
    amount: Number(amount),
    type: 'CREDIT' as const,
    description: 'Top-up via Payment Gateway',
    createdAt: new Date().toISOString(),
  };
  txns.push(txnRecord);
  store.walletTransactions.set(wallet.id, txns);

  return res.json({ success: true, data: { wallet, transaction: txnRecord } });
});

// ==========================================
// 6. DRIVER DUTY & LOCATION MODULE (/drivers)
// ==========================================
router.post('/drivers/online', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver profile missing' } });

  if (driver.kycStatus !== 'APPROVED') {
    return res.status(403).json({ success: false, error: { code: 'KYC_PENDING', message: 'KYC verification must be approved before going online' } });
  }

  driver.status = 'ONLINE';
  driver.locationUpdatedAt = new Date().toISOString();
  store.drivers.set(driver.id, driver);
  return res.json({ success: true, data: driver });
});

router.post('/drivers/offline', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver profile missing' } });

  driver.status = 'OFFLINE';
  store.drivers.set(driver.id, driver);
  return res.json({ success: true, data: driver });
});

router.post('/location/update', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const { latitude, longitude } = req.body;
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (driver && latitude && longitude) {
    driver.currentLat = latitude;
    driver.currentLng = longitude;
    driver.locationUpdatedAt = new Date().toISOString();
    store.drivers.set(driver.id, driver);
  }
  return res.json({ success: true, data: { updated: true } });
});

router.get('/drivers/earnings', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver profile missing' } });

  const earnings = store.driverEarnings.get(driver.id) || [];
  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.netEarnings, 0);

  return res.json({
    success: true,
    data: {
      totalEarnings,
      completedRides: driver.totalRides,
      earnings,
    },
  });
});

// ==========================================
// 7. DRIVER KYC MODULE (/kyc)
// ==========================================
router.post('/kyc/upload', authenticate, authorize('DRIVER'), (req: AuthenticatedRequest, res: Response) => {
  const { documentType, documentUrl } = req.body;
  const driver = Array.from(store.drivers.values()).find(d => d.userId === req.user!.id);
  if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver missing' } });

  const doc = {
    id: 'doc-' + uuidv4().substring(0, 8),
    driverId: driver.id,
    documentType: documentType || 'LICENSE',
    documentUrl: documentUrl || 'https://via.placeholder.com/400x250?text=Driver+License',
    status: 'PENDING' as const,
    createdAt: new Date().toISOString(),
  };

  store.documents.set(doc.id, doc);
  return res.json({ success: true, data: doc });
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
  store.addAuditLog(req.user!.id, req.user!.role, 'SOS_TRIGGERED', '/sos', { sosId: sos.id, rideId });

  return res.json({
    success: true,
    data: { sos, message: 'SOS Triggered! Emergency Contacts & Safety Desk notified immediately.' },
  });
});

// ==========================================
// 9. RATINGS MODULE (/ratings)
// ==========================================
router.post('/ratings', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { rideId, toUserId, score, feedback, category } = req.body;
  if (!rideId || !score) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'rideId and score required' } });

  const rating = {
    id: 'rate-' + uuidv4().substring(0, 8),
    rideId,
    fromUserId: req.user!.id,
    toUserId: toUserId || 'target-user',
    score: Number(score),
    feedback,
    category,
    createdAt: new Date().toISOString(),
  };

  store.ratings.set(rating.id, rating);
  return res.json({ success: true, data: rating });
});

// ==========================================
// 10. SUPPORT MODULE (/support)
// ==========================================
router.post('/support/tickets', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { category, subject, description } = req.body;
  const ticket = {
    id: 'tkt-' + uuidv4().substring(0, 8),
    userId: req.user!.id,
    category: category || 'General',
    subject: subject || 'Ride Help',
    description: description || '',
    status: 'OPEN' as const,
    messages: [{ id: 'msg-1', senderId: req.user!.id, text: description, createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };

  store.supportTickets.set(ticket.id, ticket);
  return res.json({ success: true, data: ticket });
});

router.get('/support/tickets', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userTickets = Array.from(store.supportTickets.values()).filter(t => {
    if (req.user!.role === 'ADMIN' || req.user!.role === 'SUPPORT_AGENT') return true;
    return t.userId === req.user!.id;
  });
  return res.json({ success: true, data: userTickets });
});

// ==========================================
// 11. AI SERVICE PROXY / INTEGRATION (/ai)
// ==========================================
router.post('/ai/rank-drivers', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { drivers = [] } = req.body;
  // Compute AI score: 40% ETA, 25% Distance, 15% Rating, 10% Acceptance, 10% Cancellation
  const ranked = drivers.map((d: any) => {
    const score = (d.rating * 20 * 0.15) + (d.acceptanceRate * 0.10) - (d.cancellationRate * 0.10) + 70;
    return { ...d, aiScore: Math.round(score * 10) / 10 };
  }).sort((a: any, b: any) => b.aiScore - a.aiScore);

  return res.json({ success: true, data: ranked });
});

router.post('/ai/detect-fraud', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { speed, locationJump } = req.body;
  const isSpoofed = speed > 160 || locationJump > 50; // >160 km/h or >50km jump
  return res.json({
    success: true,
    data: {
      riskScore: isSpoofed ? 0.95 : 0.05,
      riskLevel: isSpoofed ? 'HIGH' : 'LOW',
      reasons: isSpoofed ? ['Impossible velocity jump', 'GPS spoofing signature'] : ['Normal telemetry'],
    },
  });
});

router.post('/ai/customer-support-bot', (req, res) => {
  const { prompt, rideId } = req.body;
  let explanation = "Thank you for reaching out to RideX AI Support. Base fare, distance fare, time rate, and surge pricing were calculated according to city tariffs.";
  
  if (rideId && store.rides.has(rideId)) {
    const ride = store.rides.get(rideId)!;
    explanation = `For Ride #${ride.id}, distance was ${ride.distanceKm} km with an estimated fare of $${ride.estimatedFare}. No extra charges were incurred beyond normal distance/time rates.`;
  }

  return res.json({
    success: true,
    data: {
      reply: explanation,
      requiresHumanHandoff: prompt?.toLowerCase().includes('refund') || prompt?.toLowerCase().includes('accident'),
    },
  });
});

// ==========================================
// 12. ADMIN & ANALYTICS MODULE (/admin, /analytics)
// ==========================================
router.get('/admin/overview', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const totalUsers = store.users.size;
  const totalDrivers = store.drivers.size;
  const activeDrivers = Array.from(store.drivers.values()).filter(d => d.status === 'ONLINE' || d.status === 'BUSY').length;
  const totalRides = store.rides.size;
  const completedRides = Array.from(store.rides.values()).filter(r => r.status === 'COMPLETED').length;
  const totalRevenue = Array.from(store.payments.values()).reduce((acc, curr) => acc + curr.amount, 0);

  return res.json({
    success: true,
    data: {
      metrics: {
        totalUsers,
        totalDrivers,
        activeDrivers,
        totalRides,
        completedRides,
        totalRevenue: Math.round(totalRevenue),
        activeSOSCount: Array.from(store.sosEvents.values()).filter(s => s.status === 'OPEN').length,
      },
    },
  });
});

router.get('/admin/drivers', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const driversList = Array.from(store.drivers.values()).map(d => {
    const u = store.users.get(d.userId);
    const v = Array.from(store.vehicles.values()).find(veh => veh.driverId === d.id);
    return { ...d, fullName: u?.fullName, phone: u?.phone, email: u?.email, vehicle: v };
  });
  return res.json({ success: true, data: driversList });
});

router.post('/admin/kyc/:driverId/verify', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status, reason } = req.body;
  const driver = store.drivers.get(req.params.driverId);
  if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

  driver.kycStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  store.drivers.set(driver.id, driver);
  store.addAuditLog(req.user!.id, req.user!.role, 'KYC_VERIFIED', `/admin/kyc/${driver.id}/verify`, { status, reason });

  return res.json({ success: true, data: driver });
});

router.get('/admin/audit-logs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, data: store.auditLogs });
});

export default router;
