import mongoose, { Schema, Document } from 'mongoose';

// 1. GeoJSON Point Interface
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// 2. User Schema
export interface IUser extends Document {
  phone: string;
  email?: string;
  fullName: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPPORT_AGENT' | 'SUPER_ADMIN';
  profilePic?: string;
  createdAt: Date;
}

export const UserSchema = new Schema<IUser>({
  phone: { type: String, required: true, unique: true, index: true },
  email: { type: String, unique: true, sparse: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['CUSTOMER', 'DRIVER', 'ADMIN', 'SUPPORT_AGENT', 'SUPER_ADMIN'], default: 'CUSTOMER' },
  profilePic: { type: String },
}, { timestamps: true });

// 3. Driver Schema with 2dsphere Spatial Index
export interface IDriver extends Document {
  userId: string;
  status: 'OFFLINE' | 'ONLINE' | 'BUSY' | 'SUSPENDED';
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  vehicleCategory: 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | 'RENTAL' | 'OUTSTATION';
  location: GeoJSONPoint;
  rating: number;
  totalRides: number;
  acceptanceRate: number;
  cancellationRate: number;
}

export const DriverSchema = new Schema<IDriver>({
  userId: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['OFFLINE', 'ONLINE', 'BUSY', 'SUSPENDED'], default: 'OFFLINE', index: true },
  kycStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  vehicleCategory: { type: String, enum: ['BIKE', 'AUTO', 'CAB_ECONOMY', 'CAB_PREMIUM', 'RENTAL', 'OUTSTATION'], default: 'CAB_ECONOMY' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  rating: { type: Number, default: 5.0 },
  totalRides: { type: Number, default: 0 },
  acceptanceRate: { type: Number, default: 100 },
  cancellationRate: { type: Number, default: 0 },
}, { timestamps: true });

DriverSchema.index({ location: '2dsphere' });

// 4. Ride Schema with GeoJSON & Optimistic Concurrency Control
export interface IRide extends Document {
  customerId: string;
  driverId?: string;
  status: 'SEARCHING_DRIVER' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  category: 'REGULAR' | 'RENTAL' | 'OUTSTATION' | 'SHARED' | 'SCHEDULED';
  vehicleCategory: 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_PREMIUM' | 'RENTAL' | 'OUTSTATION';
  pickupLocation: GeoJSONPoint;
  pickupAddress: string;
  destinationLocation: GeoJSONPoint;
  destinationAddress: string;
  plainOtp: string;
  otpHash: string;
  estimatedFare: number;
  finalFare?: number;
  distanceKm: number;
  durationMin: number;
  surgeMultiplier: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export const RideSchema = new Schema<IRide>({
  customerId: { type: String, required: true, index: true },
  driverId: { type: String, index: true },
  status: {
    type: String,
    enum: ['SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'SEARCHING_DRIVER',
    index: true,
  },
  category: { type: String, enum: ['REGULAR', 'RENTAL', 'OUTSTATION', 'SHARED', 'SCHEDULED'], default: 'REGULAR' },
  vehicleCategory: { type: String, enum: ['BIKE', 'AUTO', 'CAB_ECONOMY', 'CAB_PREMIUM', 'RENTAL', 'OUTSTATION'], default: 'CAB_ECONOMY' },
  pickupLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  pickupAddress: { type: String, required: true },
  destinationLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  destinationAddress: { type: String, required: true },
  plainOtp: { type: String, required: true },
  otpHash: { type: String, required: true },
  estimatedFare: { type: Number, required: true },
  finalFare: { type: Number },
  distanceKm: { type: Number, required: true },
  durationMin: { type: Number, required: true },
  surgeMultiplier: { type: Number, default: 1.0 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
}, { timestamps: true, optimisticConcurrency: true });

RideSchema.index({ pickupLocation: '2dsphere' });

// 5. Wallet & Double-Entry Ledger Schema
export interface IWallet extends Document {
  userId: string;
  balance: number;
}

export const WalletSchema = new Schema<IWallet>({
  userId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, required: true, default: 0.0 },
}, { timestamps: true });

export interface IWalletTransaction extends Document {
  walletId: string;
  userId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  idempotencyKey: string;
  referenceId?: string;
}

export const WalletTransactionSchema = new Schema<IWalletTransaction>({
  walletId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  description: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  referenceId: { type: String },
}, { timestamps: true });

// 6. SOS Event Schema
export interface ISOSEvent extends Document {
  rideId: string;
  triggeredBy: string;
  location: GeoJSONPoint;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';
}

export const SOSEventSchema = new Schema<ISOSEvent>({
  rideId: { type: String, required: true, index: true },
  triggeredBy: { type: String, required: true, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  status: { type: String, enum: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
}, { timestamps: true });

// 7. Pricing Rule Schema
export interface IPricingRule extends Document {
  city: string;
  vehicleCategory: string;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  surgeMultiplier: number;
}

export const PricingRuleSchema = new Schema<IPricingRule>({
  city: { type: String, required: true, default: 'GLOBAL' },
  vehicleCategory: { type: String, required: true },
  baseFare: { type: Number, required: true },
  perKmRate: { type: Number, required: true },
  perMinRate: { type: Number, required: true },
  surgeMultiplier: { type: Number, default: 1.0 },
}, { timestamps: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
export const DriverModel = mongoose.model<IDriver>('Driver', DriverSchema);
export const RideModel = mongoose.model<IRide>('Ride', RideSchema);
export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);
export const WalletTransactionModel = mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);
export const SOSEventModel = mongoose.model<ISOSEvent>('SOSEvent', SOSEventSchema);
export const PricingRuleModel = mongoose.model<IPricingRule>('PricingRule', PricingRuleSchema);
