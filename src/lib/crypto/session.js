// /src/lib/crypto/session.js
// Secure Session Management & Anti-Hijacking Protection Engine
// Implements token binding with client environmental fingerprints and HMAC integrity verification.

import { sha256 } from './sha256.js';
import { generateMAC, verifyMAC } from './mac.js';

const SESSION_SIGNING_KEY = process.env.SESSION_SIGNING_KEY || 'CSE447_SESSION_ANTI_HIJACKING_KEY_2025';
const SESSION_EXPIRATION_MS = 3600000 * 24; // 24 hours

export function generateClientFingerprint(req) {
  let userAgent = 'unknown-agent';
  let ip = '127.0.0.1';

  if (req && req.headers) {
    if (typeof req.headers.get === 'function') {
      userAgent = req.headers.get('user-agent') || 'unknown-agent';
      ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    } else if (req.headers['user-agent']) {
      userAgent = req.headers['user-agent'] || 'unknown-agent';
      ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    }
  }

  // Normalize localhost and multi-hop proxy IPs
  if (typeof ip === 'string') {
    ip = ip.split(',')[0].trim();
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost') {
      ip = '127.0.0.1';
    }
  }

  return sha256(userAgent.trim() + '::' + ip);
}

export function createSecureSession(user, req) {
  const fingerprint = generateClientFingerprint(req);
  let userAgent = 'unknown-agent';
  if (req && req.headers) {
    userAgent =
      (typeof req.headers.get === 'function'
        ? req.headers.get('user-agent')
        : req.headers['user-agent']) || 'unknown-agent';
  }
  const uaHash = sha256(userAgent.trim());
  const now = Date.now();

  const payload = {
    id: user._id ? user._id.toString() : user.id,
    role: user.role || 'user',
    fingerprint,
    uaHash,
    iat: now,
    exp: now + SESSION_EXPIRATION_MS,
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = generateMAC(SESSION_SIGNING_KEY, serialized);

  return `${serialized}.${signature}`;
}

export function verifySecureSession(tokenString, req) {
  if (!tokenString || typeof tokenString !== 'string') {
    throw new Error('No authentication token provided.');
  }

  const parts = tokenString.split('.');
  if (parts.length !== 2) {
    throw new Error('Malformed session token.');
  }

  const [serialized, signature] = parts;

  // Verify token signature with scratch HMAC
  const isValidSignature = verifyMAC(SESSION_SIGNING_KEY, serialized, signature);
  if (!isValidSignature) {
    throw new Error('Invalid token signature or token tampering detected.');
  }

  const jsonStr = Buffer.from(serialized, 'base64url').toString('utf8');
  const payload = JSON.parse(jsonStr);

  // Check expiration
  if (Date.now() > payload.exp) {
    throw new Error('Session has expired. Please sign in again.');
  }

  // Anti-Hijacking Verification: Validate client environmental fingerprint
  if (req && payload.fingerprint) {
    const currentFingerprint = generateClientFingerprint(req);
    if (payload.fingerprint !== currentFingerprint) {
      let currentUA = 'unknown-agent';
      if (req.headers) {
        currentUA =
          (typeof req.headers.get === 'function'
            ? req.headers.get('user-agent')
            : req.headers['user-agent']) || 'unknown-agent';
      }
      const currentUAHash = sha256(currentUA.trim());

      // If user agent doesn't even match, strictly block
      if (payload.uaHash && payload.uaHash !== currentUAHash) {
        console.warn('SECURITY ALERT: Potential session hijacking detected! User-Agent mismatch.');
        throw new Error('Session hijacking detected: Client environment fingerprint mismatch.');
      }
    }
  }

  return payload;
}
