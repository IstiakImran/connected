// /src/lib/crypto/ecc.js
// Pure mathematical from-scratch Elliptic Curve Cryptography (secp256k1).
// Used for Social Posts, Feeds & Messaging payload encryption.
// Implemented with native BigInt operations without external or built-in cipher libraries.

import { sha256Bytes } from './sha256.js';
import { modInverse } from './rsa.js';

// secp256k1 Curve Parameters
export const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
export const A = 0n;
export const B = 7n;
export const Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
export const Gy = 0x483ada7726a3c4655da4fbf00e1108a8fd17b448a68554199c47d08ffb10d4b8n;
export const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bb5bf5ca4bdb69541n;

export const POINT_G = { x: Gx, y: Gy };

function modP(val) {
  return ((val % P) + P) % P;
}

export function pointAdd(P1, P2) {
  if (!P1) return P2;
  if (!P2) return P1;

  if (P1.x === P2.x && P1.y !== P2.y) {
    return null; // Point at infinity
  }

  let lambda;
  if (P1.x === P2.x && P1.y === P2.y) {
    // Point doubling: lambda = (3 * x^2 + a) / (2 * y) mod P
    const num = modP(3n * P1.x * P1.x + A);
    const den = modP(2n * P1.y);
    lambda = modP(num * modInverse(den, P));
  } else {
    // Point addition: lambda = (y2 - y1) / (x2 - x1) mod P
    const num = modP(P2.y - P1.y);
    const den = modP(P2.x - P1.x);
    lambda = modP(num * modInverse(den, P));
  }

  const x3 = modP(lambda * lambda - P1.x - P2.x);
  const y3 = modP(lambda * (P1.x - x3) - P1.y);
  return { x: x3, y: y3 };
}

export function scalarMultiply(k, point = POINT_G) {
  k = BigInt(k) % N;
  if (k === 0n) return null;

  let result = null;
  let current = point;

  while (k > 0n) {
    if (k & 1n) {
      result = pointAdd(result, current);
    }
    current = pointAdd(current, current);
    k >>= 1n;
  }
  return result;
}

export function generateECCKeyPair() {
  // Generate random 256-bit scalar d in [2, N-1]
  let hex = '';
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    hex += hexChars[Math.floor(Math.random() * 16)];
  }
  let d = (BigInt('0x' + hex) % (N - 2n)) + 2n;
  const Q = scalarMultiply(d, POINT_G);

  return {
    publicKey: {
      x: Q.x.toString(16),
      y: Q.y.toString(16)
    },
    privateKey: {
      d: d.toString(16)
    }
  };
}

// Asymmetric ElGamal-style encryption using scratch point multiplication + scratch SHA-256 KDF
function deriveKeyStream(sharedX, length) {
  const stream = new Uint8Array(length);
  let offset = 0;
  let counter = 0;

  while (offset < length) {
    const seed = sharedX.toString(16) + ':' + counter;
    const block = sha256Bytes(seed);
    const take = Math.min(block.length, length - offset);
    stream.set(block.subarray(0, take), offset);
    offset += take;
    counter++;
  }
  return stream;
}

export function eccEncrypt(text, publicKey) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  if (str.length === 0) return '';

  const Q = {
    x: BigInt('0x' + publicKey.x),
    y: BigInt('0x' + publicKey.y)
  };

  // Sender chooses random ephemeral scalar k in [2, N-1]
  let hex = '';
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    hex += hexChars[Math.floor(Math.random() * 16)];
  }
  const k = (BigInt('0x' + hex) % (N - 2n)) + 2n;

  // Ephemeral point C1 = k * G
  const C1 = scalarMultiply(k, POINT_G);
  // Shared point S = k * Q
  const S = scalarMultiply(k, Q);

  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(str);

  // Derive mask stream from S.x
  const keyStream = deriveKeyStream(S.x, msgBytes.length);

  // XOR mask
  const cipherBytes = new Uint8Array(msgBytes.length);
  for (let i = 0; i < msgBytes.length; i++) {
    cipherBytes[i] = msgBytes[i] ^ keyStream[i];
  }

  const c2Hex = Array.from(cipherBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `ECC:${C1.x.toString(16)}.${C1.y.toString(16)}:${c2Hex}`;
}

export function eccDecrypt(ciphertext, privateKey) {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  if (!ciphertext.startsWith('ECC:')) {
    return ciphertext;
  }

  const parts = ciphertext.slice(4).split(':');
  if (parts.length !== 2) return ciphertext;

  const [c1Part, c2Hex] = parts;
  const [c1xHex, c1yHex] = c1Part.split('.');

  const C1 = {
    x: BigInt('0x' + c1xHex),
    y: BigInt('0x' + c1yHex)
  };

  const d = BigInt('0x' + privateKey.d);
  // Recipient computes shared secret: S = d * C1 = d * (k * G) = k * (d * G) = k * Q
  const S = scalarMultiply(d, C1);
  if (!S) throw new Error('Invalid ECC point multiplication.');

  const cipherBytes = new Uint8Array(c2Hex.length / 2);
  for (let i = 0; i < c2Hex.length; i += 2) {
    cipherBytes[i / 2] = parseInt(c2Hex.substr(i, 2), 16);
  }

  const keyStream = deriveKeyStream(S.x, cipherBytes.length);
  const msgBytes = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i++) {
    msgBytes[i] = cipherBytes[i] ^ keyStream[i];
  }

  const decoder = new TextDecoder();
  return decoder.decode(msgBytes);
}
