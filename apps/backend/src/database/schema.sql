-- RideX PostgreSQL + PostGIS Database Schema Definition

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enum types
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPPORT_AGENT', 'SUPER_ADMIN');
CREATE TYPE driver_status AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'SUSPENDED');
CREATE TYPE kyc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE vehicle_type AS ENUM ('BIKE', 'AUTO', 'CAB_ECONOMY', 'CAB_PREMIUM', 'RENTAL', 'OUTSTATION');
CREATE TYPE ride_status AS ENUM ('SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE ride_category AS ENUM ('REGULAR', 'RENTAL', 'OUTSTATION', 'SHARED', 'SCHEDULED');
CREATE TYPE payment_method AS ENUM ('UPI', 'CARD', 'CASH', 'WALLET');
CREATE TYPE payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE sos_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    profile_pic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status driver_status NOT NULL DEFAULT 'OFFLINE',
    kyc_status kyc_status NOT NULL DEFAULT 'PENDING',
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_rides INT DEFAULT 0,
    acceptance_rate NUMERIC(5, 2) DEFAULT 100.00,
    cancellation_rate NUMERIC(5, 2) DEFAULT 0.00,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    location_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    type vehicle_type NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    license_plate VARCHAR(30) UNIQUE NOT NULL,
    color VARCHAR(30) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Driver Documents Table (KYC)
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- LICENSE, RC, INSURANCE, GOVT_ID, SELFIE
    document_url TEXT NOT NULL,
    status kyc_status NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Rides Table
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    status ride_status NOT NULL DEFAULT 'SEARCHING_DRIVER',
    category ride_category NOT NULL DEFAULT 'REGULAR',
    vehicle_type vehicle_type NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_address TEXT NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    destination_address TEXT NOT NULL,
    otp VARCHAR(6) NOT NULL,
    estimated_fare NUMERIC(10, 2) NOT NULL,
    final_fare NUMERIC(10, 2),
    distance_km NUMERIC(8, 2) NOT NULL,
    duration_min INT NOT NULL,
    surge_multiplier NUMERIC(3, 2) DEFAULT 1.00,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    rental_hours INT,
    share_group_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID UNIQUE NOT NULL REFERENCES rides(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    transaction_id VARCHAR(100) UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Wallet Transactions (Ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    description TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Driver Earnings
CREATE TABLE IF NOT EXISTS driver_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    ride_id UUID UNIQUE NOT NULL REFERENCES rides(id),
    gross_fare NUMERIC(10, 2) NOT NULL,
    platform_commission NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    net_earnings NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Ratings
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    score INT NOT NULL CHECK (score >= 1 AND score <= 5),
    feedback TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ride_rating UNIQUE(ride_id, from_user_id)
);

-- 11. SOS Events
CREATE TABLE IF NOT EXISTS sos_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id),
    triggered_by UUID NOT NULL REFERENCES users(id),
    current_lat DOUBLE PRECISION NOT NULL,
    current_lng DOUBLE PRECISION NOT NULL,
    status sos_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    role user_role,
    action VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_kyc ON drivers(kyc_status);
CREATE INDEX IF NOT EXISTS idx_rides_customer ON rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
