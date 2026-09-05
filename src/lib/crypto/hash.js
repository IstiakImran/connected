// /src/lib/crypto/hash.js
// Pure from-scratch salted password hashing using scratch SHA-256.
// No bcrypt or framework password hashing methods.

import { sha256 } from './sha256.js';

const ITERATIONS = 5000;

export function generateSalt(length = 16) {
  let salt = '';
  const chars = 'abcdef0123456789';
  for (let i = 0; i < length * 2; i++) {
    salt += chars[Math.floor(Math.random() * chars.length)];
  }
  return salt;
}

export function hashPassword(password, salt = null) {
  const actualSalt = salt || generateSalt();
  let digest = sha256(actualSalt + ':' + password);
  for (let i = 1; i < ITERATIONS; i++) {
    digest = sha256(digest + ':' + actualSalt + ':' + i);
  }
  return {
    hash: digest,
    salt: actualSalt,
    iterations: ITERATIONS
  };
}

export function verifyPassword(password, storedHash, salt) {
  if (!password || !storedHash || !salt) return false;
  const computed = hashPassword(password, salt);
  return computed.hash === storedHash;
}
