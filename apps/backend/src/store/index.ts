import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  phone: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPPORT_AGENT' | 'SUPER_ADMIN';
  profilePic?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  status: 'OFFLINE' | 'ONLINE' | 'BUSY' | 'SUSPENDED';
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rating: number;
  totalRides: number;
  acceptanceRate: number;
  cancellationRate: number;
  currentLat: number;
  currentLng: number;
  locationUpdatedAt: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  type: 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | 'RENTAL' | 'OUTSTATION';
  make: string;
  model: string;
  licensePlate: string;
  color: string;
  capacity: number;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  documentType: string;
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
}

export interface Ride {
  id: string;
  customerId: string;
  driverId?: string;
  status: 'SEARCHING_DRIVER' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  category: 'REGULAR' | 'RENTAL' | 'OUTSTATION' | 'SHARED' | 'SCHEDULED';
  vehicleType: 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | 'RENTAL' | 'OUTSTATION';
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  otp: string;
  estimatedFare: number;
  finalFare?: number;
  distanceKm: number;
  durationMin: number;
  surgeMultiplier: number;
  scheduledAt?: string;
  rentalHours?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface Payment {
  id: string;
  rideId: string;
  userId: string;
  amount: number;
  method: 'UPI' | 'CARD' | 'CASH' | 'WALLET';
  status: 'PENDING' | 'AUTHORIZED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface DriverEarning {
  id: string;
  driverId: string;
  rideId: string;
  grossFare: number;
  platformCommission: number;
  tax: number;
  netEarnings: number;
  createdAt: string;
}

export interface Rating {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  score: number;
  feedback?: string;
  category?: string;
  createdAt: string;
}

export interface SOSEvent {
  id: string;
  rideId: string;
  triggeredBy: string;
  currentLat: number;
  currentLng: number;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  category: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  messages: Array<{ id: string; senderId: string; text: string; createdAt: string }>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  role?: string;
  action: string;
  endpoint: string;
  details?: any;
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  maxDiscount: number;
  minFare: number;
  active: boolean;
  expiresAt: string;
}

class InMemoryStore {
  public users: Map<string, User> = new Map();
  public drivers: Map<string, Driver> = new Map();
  public vehicles: Map<string, Vehicle> = new Map();
  public documents: Map<string, DriverDocument> = new Map();
  public rides: Map<string, Ride> = new Map();
  public payments: Map<string, Payment> = new Map();
  public wallets: Map<string, Wallet> = new Map();
  public walletTransactions: Map<string, WalletTransaction[]> = new Map();
  public driverEarnings: Map<string, DriverEarning[]> = new Map();
  public ratings: Map<string, Rating> = new Map();
  public sosEvents: Map<string, SOSEvent> = new Map();
  public supportTickets: Map<string, SupportTicket> = new Map();
  public auditLogs: AuditLog[] = [];
  public coupons: Map<string, Coupon> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed Admin User
    const adminUser: User = {
      id: 'usr-admin-1',
      phone: '+19999999999',
      email: 'admin@ridex.com',
      fullName: 'RideX Master Admin',
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    };
    this.users.set(adminUser.id, adminUser);
    this.wallets.set(adminUser.id, { id: 'w-admin-1', userId: adminUser.id, balance: 1000, createdAt: new Date().toISOString() });

    // Seed Demo Customer
    const customerUser: User = {
      id: 'usr-cust-1',
      phone: '+18888888888',
      email: 'alex.rider@example.com',
      fullName: 'Alex Johnson',
      role: 'CUSTOMER',
      createdAt: new Date().toISOString(),
    };
    this.users.set(customerUser.id, customerUser);
    this.wallets.set(customerUser.id, { id: 'w-cust-1', userId: customerUser.id, balance: 250.00, createdAt: new Date().toISOString() });

    // Seed Demo Drivers (with nearby coordinates in Tech Hub city center: 12.9716 N, 77.5946 E)
    const driver1User: User = {
      id: 'usr-drv-1',
      phone: '+17777777777',
      email: 'sam.driver@example.com',
      fullName: 'Sam Speed',
      role: 'DRIVER',
      createdAt: new Date().toISOString(),
    };
    this.users.set(driver1User.id, driver1User);

    const driver1: Driver = {
      id: 'drv-1',
      userId: driver1User.id,
      status: 'ONLINE',
      kycStatus: 'APPROVED',
      rating: 4.85,
      totalRides: 340,
      acceptanceRate: 95.0,
      cancellationRate: 2.0,
      currentLat: 12.9720,
      currentLng: 77.5950,
      locationUpdatedAt: new Date().toISOString(),
    };
    this.drivers.set(driver1.id, driver1);

    const vehicle1: Vehicle = {
      id: 'veh-1',
      driverId: driver1.id,
      type: 'CAB_ECONOMY',
      make: 'Toyota',
      model: 'Prius',
      licensePlate: 'RX-99-EV',
      color: 'Silver',
      capacity: 4,
    };
    this.vehicles.set(vehicle1.id, vehicle1);

    const driver2User: User = {
      id: 'usr-drv-2',
      phone: '+16666666666',
      email: 'marco.bike@example.com',
      fullName: 'Marco Express',
      role: 'DRIVER',
      createdAt: new Date().toISOString(),
    };
    this.users.set(driver2User.id, driver2User);

    const driver2: Driver = {
      id: 'drv-2',
      userId: driver2User.id,
      status: 'ONLINE',
      kycStatus: 'APPROVED',
      rating: 4.92,
      totalRides: 512,
      acceptanceRate: 98.0,
      cancellationRate: 1.0,
      currentLat: 12.9690,
      currentLng: 77.5920,
      locationUpdatedAt: new Date().toISOString(),
    };
    this.drivers.set(driver2.id, driver2);

    const vehicle2: Vehicle = {
      id: 'veh-2',
      driverId: driver2.id,
      type: 'BIKE',
      make: 'Yamaha',
      model: 'FZ',
      licensePlate: 'RX-01-BK',
      color: 'Matte Black',
      capacity: 1,
    };
    this.vehicles.set(vehicle2.id, vehicle2);

    // Seed Coupons
    this.coupons.set('RIDEX50', {
      code: 'RIDEX50',
      discountPercent: 50,
      maxDiscount: 100,
      minFare: 50,
      active: true,
      expiresAt: '2028-12-31T23:59:59Z',
    });
    this.coupons.set('WELCOME20', {
      code: 'WELCOME20',
      discountPercent: 20,
      maxDiscount: 50,
      minFare: 30,
      active: true,
      expiresAt: '2028-12-31T23:59:59Z',
    });
  }

  public addAuditLog(userId: string | undefined, role: string | undefined, action: string, endpoint: string, details?: any) {
    this.auditLogs.unshift({
      id: uuidv4(),
      userId,
      role,
      action,
      endpoint,
      details,
      createdAt: new Date().toISOString(),
    });
  }
}

export const store = new InMemoryStore();
