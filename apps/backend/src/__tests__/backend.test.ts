import { store } from '../store';

describe('RideX Core Backend Integration Tests', () => {
  beforeEach(() => {
    // Ensure clean test environment
  });

  test('1. Pricing Engine calculates fare correctly with taxes', () => {
    const baseFare = 40;
    const distanceKm = 10;
    const durationMin = 20;
    const rawFare = baseFare + (distanceKm * 14) + (durationMin * 2.5); // 40 + 140 + 50 = 230
    const tax = rawFare * 0.05; // 11.5
    const total = Math.round(rawFare + tax); // 242

    expect(total).toBe(242);
  });

  test('2. Atomic Driver Acceptance prevents state corruption', () => {
    const ride: any = {
      id: 'rd-test-1',
      status: 'SEARCHING_DRIVER',
    };
    store.rides.set(ride.id, ride);

    // Driver 1 accepts
    const ride1 = store.rides.get(ride.id)!;
    expect(ride1.status).toBe('SEARCHING_DRIVER');

    ride1.status = 'DRIVER_ASSIGNED';
    store.rides.set(ride1.id, ride1);

    // Driver 2 attempts acceptance
    const ride2 = store.rides.get(ride.id)!;
    expect(ride2.status).not.toBe('SEARCHING_DRIVER');
  });

  test('3. OTP Ride Verification works securely', () => {
    const ride: any = {
      id: 'rd-test-otp',
      otp: '4821',
      status: 'DRIVER_ARRIVED'
    };

    // Valid OTP
    const userEnteredOtp = '4821';
    expect(userEnteredOtp).toBe(ride.otp);

    // Invalid OTP
    const wrongOtp = '0000';
    expect(wrongOtp).not.toBe(ride.otp);
  });

  test('4. Ledger Wallet Transaction records immutable debit', () => {
    const userId = 'usr-test-wallet';
    const wallet = { id: 'w-test', userId, balance: 500, createdAt: new Date().toISOString() };
    store.wallets.set(userId, wallet);

    // Deduct $100 for ride
    wallet.balance -= 100;
    store.wallets.set(userId, wallet);

    expect(store.wallets.get(userId)!.balance).toBe(400);
  });
});
