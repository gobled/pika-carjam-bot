import { promises as fs } from 'fs';
import { join } from 'path';

export interface ReferralData {
  userId: number;
  referredBy?: number; // Who referred this user
  referredUsers: number[]; // Users this person referred
  totalReferrals: number;
  unclaimedReferrals: number; // Number of referrals not yet claimed for rewards
  lastUpdated: number;
}

// Simple in-memory storage for development
// In production, replace with Redis (Vercel KV) or database
const inMemoryStorage = new Map<number, ReferralData>();

// File path for JSON storage (fallback for persistence in development)
const STORAGE_FILE = join(process.cwd(), 'data', 'referrals.json');

// Initialize storage from file on startup
let initialized = false;

async function ensureStorageFile() {
  try {
    const dir = join(process.cwd(), 'data');
    await fs.mkdir(dir, { recursive: true });

    try {
      const data = await fs.readFile(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(data) as Record<string, ReferralData>;

      // Load into memory
      Object.entries(parsed).forEach(([key, value]) => {
        inMemoryStorage.set(Number(key), value);
      });
    } catch (error) {
      // File doesn't exist yet, that's okay
      await fs.writeFile(STORAGE_FILE, JSON.stringify({}), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to initialize storage file:', error);
  }
}

async function saveToFile() {
  try {
    const data: Record<string, ReferralData> = {};
    inMemoryStorage.forEach((value, key) => {
      data[key.toString()] = value;
    });

    await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save to file:', error);
  }
}

async function init() {
  if (!initialized) {
    await ensureStorageFile();
    initialized = true;
  }
}

export async function getUserReferralData(userId: number): Promise<ReferralData> {
  await init();

  const existing = inMemoryStorage.get(userId);
  if (existing) {
    return existing;
  }

  // Create new record
  const newData: ReferralData = {
    userId,
    referredUsers: [],
    totalReferrals: 0,
    unclaimedReferrals: 0,
    lastUpdated: Date.now(),
  };

  inMemoryStorage.set(userId, newData);
  await saveToFile();

  return newData;
}

export async function recordReferral(
  newUserId: number,
  referrerId: number
): Promise<boolean> {
  await init();

  // Get or create both users' data
  const newUserData = await getUserReferralData(newUserId);
  const referrerData = await getUserReferralData(referrerId);

  // Check if this user was already referred
  if (newUserData.referredBy !== undefined) {
    return false; // Already has a referrer
  }

  // Check if referrer is trying to refer themselves
  if (newUserId === referrerId) {
    return false;
  }

  // Check if this referral was already recorded
  if (referrerData.referredUsers.includes(newUserId)) {
    return false;
  }

  // Record the referral
  newUserData.referredBy = referrerId;
  newUserData.lastUpdated = Date.now();

  referrerData.referredUsers.push(newUserId);
  referrerData.totalReferrals += 1;
  referrerData.unclaimedReferrals += 1;
  referrerData.lastUpdated = Date.now();

  inMemoryStorage.set(newUserId, newUserData);
  inMemoryStorage.set(referrerId, referrerData);

  await saveToFile();

  return true;
}

export async function claimReferralRewards(
  userId: number
): Promise<{ success: boolean; rewardsClaimed: number }> {
  await init();

  const userData = await getUserReferralData(userId);

  if (userData.unclaimedReferrals === 0) {
    return { success: false, rewardsClaimed: 0 };
  }

  const rewardsClaimed = userData.unclaimedReferrals;
  userData.unclaimedReferrals = 0;
  userData.lastUpdated = Date.now();

  inMemoryStorage.set(userId, userData);
  await saveToFile();

  return { success: true, rewardsClaimed };
}

export async function hasUnclaimedReferrals(userId: number): Promise<number> {
  await init();
  const userData = await getUserReferralData(userId);
  return userData.unclaimedReferrals;
}
