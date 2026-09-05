// /src/lib/encryption.js
// Dual Asymmetric Encryption Facade
// Algorithm 1: Scratch RSA for Identity & Profile data
// Algorithm 2: Scratch ECC for Posts & Feeds data
// Integrity: Scratch HMAC-SHA256 for Message Authentication Codes (MAC)
// EXCLUSIVELY ASYMMETRIC - NO SYMMETRIC/AES CIPHERS

import { rsaEncrypt, rsaDecrypt } from './crypto/rsa.js';
import { eccEncrypt, eccDecrypt } from './crypto/ecc.js';
import { generateMAC, verifyMAC } from './crypto/mac.js';
import { sha256 } from './crypto/sha256.js';
import { initializeOrGetActiveKeys, getKeyByVersion } from './crypto/kmm.js';

const MAC_SECRET = process.env.MAC_SECRET || 'CSE447_INTEGRITY_MAC_MASTER_SECRET_2025';

// Blind index generator for encrypted database indexing (e.g. unique email/username checks)
export function hashForBlindIndex(value) {
  if (!value) return '';
  return sha256('blind_index_salt:' + String(value).trim().toLowerCase());
}

// Algorithm 1: Scratch RSA for Identity & Profile Details
export async function encryptUserField(text) {
  if (!text) return '';
  const keys = await initializeOrGetActiveKeys();
  const ciphertext = rsaEncrypt(text, keys.RSA.publicKey);
  return `${keys.RSA.version}:${ciphertext}`;
}

export async function decryptUserField(versionedCiphertext) {
  if (!versionedCiphertext || typeof versionedCiphertext !== 'string') return '';
  
  // Format is "version:RSA:..." or legacy "RSA:..."
  let version = 'v1';
  let ciphertext = versionedCiphertext;

  if (versionedCiphertext.startsWith('v')) {
    const colonIdx = versionedCiphertext.indexOf(':');
    version = versionedCiphertext.slice(0, colonIdx);
    ciphertext = versionedCiphertext.slice(colonIdx + 1);
  }

  const keyPair = await getKeyByVersion('RSA', version);
  return rsaDecrypt(ciphertext, keyPair.privateKey);
}

// Algorithm 2: Scratch ECC for Social Posts and Feeds
export async function encryptPostContent(text) {
  if (!text) return { ciphertext: '', version: 'v1' };
  const keys = await initializeOrGetActiveKeys();
  const ciphertext = eccEncrypt(text, keys.ECC.publicKey);
  return {
    ciphertext,
    version: keys.ECC.version
  };
}

export async function decryptPostContent(ciphertext, version = 'v1') {
  if (!ciphertext) return '';
  const keyPair = await getKeyByVersion('ECC', version);
  return eccDecrypt(ciphertext, keyPair.privateKey);
}

// Message Authentication Codes (MAC) Integrity Engine
export function signPayload(payload) {
  return generateMAC(MAC_SECRET, payload);
}

export function verifyPayloadIntegrity(payload, mac) {
  return verifyMAC(MAC_SECRET, payload, mac);
}

// Backwards compatibility facades for previous imports
export const encrypt = encryptUserField;
export const decrypt = decryptUserField;
