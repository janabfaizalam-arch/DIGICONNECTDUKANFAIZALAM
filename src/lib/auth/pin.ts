import argon2 from "argon2";

/**
 * Hash a PIN using Argon2id.
 * Argon2id is highly secure against GPU cracking and side-channel attacks.
 * @param pin The raw PIN string.
 * @returns The hashed PIN.
 */
export async function hashPIN(pin: string): Promise<string> {
  return argon2.hash(pin, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,         // 3 iterations
    parallelism: 1,      // 1 thread
  });
}

/**
 * Verify a PIN against an Argon2id hash.
 * @param hash The previously hashed PIN from the database.
 * @param pin The raw PIN string to verify.
 * @returns boolean indicating if the PIN matches.
 */
export async function verifyPIN(hash: string, pin: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, pin);
  } catch (error) {
    console.error("Error verifying PIN:", error);
    return false;
  }
}
