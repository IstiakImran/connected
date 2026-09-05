// /src/lib/auth.js
// Authentication & Security facade utilizing from-scratch primitives.

import { hashPassword as scratchHashPassword, verifyPassword as scratchVerifyPassword } from './crypto/hash.js';
import { createSecureSession, verifySecureSession } from './crypto/session.js';
import {
  encryptUserField,
  decryptUserField,
  encryptPostContent,
  decryptPostContent,
  signPayload,
  verifyPayloadIntegrity,
  hashForBlindIndex,
} from './encryption.js';

// Scratch Salted Password Hashing
export const hashPassword = async (password, salt = null) => {
  return scratchHashPassword(password, salt);
};

export const comparePassword = async (password, storedHash, salt) => {
  return scratchVerifyPassword(password, storedHash, salt);
};

// Anti-Hijacking Token / Session Management
export const generateSessionToken = (user, req) => {
  return createSecureSession(user, req);
};

export const verifySessionToken = (token, req) => {
  return verifySecureSession(token, req);
};

// Compatibility aliases
export const generateJWT = generateSessionToken;
export const verifyJWT = verifySessionToken;

// Re-exports
export {
  encryptUserField,
  decryptUserField,
  encryptPostContent,
  decryptPostContent,
  signPayload,
  verifyPayloadIntegrity,
  hashForBlindIndex,
};

export const encryptData = encryptUserField;
export const decryptData = decryptUserField;
