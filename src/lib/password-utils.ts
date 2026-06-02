/**
 * Password utilities — bcrypt-based password hashing and verification.
 *
 * Supports two modes:
 * 1. Pre-computed ADMIN_PASSWORD_HASH env var (preferred)
 * 2. Fallback: hash ADMIN_PASSWORD at runtime for migration
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function getPasswordHash(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 * Returns false if the hash is empty or invalid.
 */
export async function verifyPassword(
  password: string,
  hash: string | undefined | null,
): Promise<boolean> {
  if (!hash || !password) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Resolve the effective password hash from env vars.
 *
 * Priority:
 * 1. ADMIN_PASSWORD_HASH — pre-computed bcrypt hash
 * 2. ADMIN_PASSWORD — compute hash at runtime (migration mode)
 *
 * Returns null if neither is configured.
 */
export async function resolvePasswordHash(): Promise<string | null> {
  const precomputedHash = process.env.ADMIN_PASSWORD_HASH;
  if (precomputedHash) {
    return precomputedHash;
  }

  const plainPassword = process.env.ADMIN_PASSWORD;
  if (plainPassword) {
    // Migration mode: hash the plaintext password at startup
    return getPasswordHash(plainPassword);
  }

  return null;
}
