// /src/lib/crypto/mac.js
// Pure from-scratch implementation of HMAC-SHA256 (RFC 2104)
// Implemented directly using scratch SHA-256.

import { sha256Bytes, sha256 } from './sha256.js';

function stringOrBufferToBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (typeof input !== 'string') input = String(input);
  const bytes = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

export function hmacSha256(keyInput, messageInput) {
  const BLOCK_SIZE = 64; // SHA-256 block size is 64 bytes
  let keyBytes = stringOrBufferToBytes(keyInput);
  const msgBytes = stringOrBufferToBytes(messageInput);

  if (keyBytes.length > BLOCK_SIZE) {
    keyBytes = sha256Bytes(keyBytes);
  }

  const paddedKey = new Uint8Array(BLOCK_SIZE);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(BLOCK_SIZE);
  const iKeyPad = new Uint8Array(BLOCK_SIZE);

  for (let i = 0; i < BLOCK_SIZE; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  // Inner hash: H(iKeyPad || message)
  const innerConcat = new Uint8Array(BLOCK_SIZE + msgBytes.length);
  innerConcat.set(iKeyPad, 0);
  innerConcat.set(msgBytes, BLOCK_SIZE);
  const innerHash = sha256Bytes(innerConcat);

  // Outer hash: H(oKeyPad || innerHash)
  const outerConcat = new Uint8Array(BLOCK_SIZE + innerHash.length);
  outerConcat.set(oKeyPad, 0);
  outerConcat.set(innerHash, BLOCK_SIZE);
  const finalHash = sha256Bytes(outerConcat);

  return Array.from(finalHash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateMAC(key, data) {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  return hmacSha256(key, serialized);
}

export function verifyMAC(key, data, expectedMac) {
  if (!key || !data || !expectedMac) return false;
  const computed = generateMAC(key, data);
  // Constant-time string comparison to resist timing attacks
  if (computed.length !== expectedMac.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedMac.charCodeAt(i);
  }
  return diff === 0;
}
