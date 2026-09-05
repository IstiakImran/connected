// /src/lib/crypto/kmm.js
// Key Management Module (KMM)
// Handles Key Generation, Storage, Distribution, and Rotation.
// Protects private keys in encrypted format.

import { generateRSAKeyPair, rsaEncrypt, rsaDecrypt } from './rsa.js';
import { generateECCKeyPair, eccEncrypt, eccDecrypt } from './ecc.js';
import { sha256, sha256Bytes } from './sha256.js';
import { KeyStore } from '@/schema/KeyStore.js';
import { dbConnect } from '@/lib/dbConnect.js';

const MASTER_KMM_SECRET = process.env.MASTER_KMM_SECRET || 'CSE447_SECURE_KMM_ROOT_SECRET_KEY_2025';

// Encrypt private key object before database storage using scratch stream mask derived from MASTER_KMM_SECRET
function protectPrivateKey(privateKeyObj) {
  const serialized = JSON.stringify(privateKeyObj);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(serialized);

  const stream = new Uint8Array(bytes.length);
  let offset = 0;
  let counter = 0;
  while (offset < bytes.length) {
    const block = sha256Bytes(MASTER_KMM_SECRET + ':' + counter);
    const take = Math.min(block.length, bytes.length - offset);
    stream.set(block.subarray(0, take), offset);
    offset += take;
    counter++;
  }

  const encryptedBytes = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    encryptedBytes[i] = bytes[i] ^ stream[i];
  }

  return Array.from(encryptedBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Decrypt private key object upon retrieval
function unprotectPrivateKey(cipherHex) {
  const encryptedBytes = new Uint8Array(cipherHex.length / 2);
  for (let i = 0; i < cipherHex.length; i += 2) {
    encryptedBytes[i / 2] = parseInt(cipherHex.substr(i, 2), 16);
  }

  const stream = new Uint8Array(encryptedBytes.length);
  let offset = 0;
  let counter = 0;
  while (offset < encryptedBytes.length) {
    const block = sha256Bytes(MASTER_KMM_SECRET + ':' + counter);
    const take = Math.min(block.length, encryptedBytes.length - offset);
    stream.set(block.subarray(0, take), offset);
    offset += take;
    counter++;
  }

  const decryptedBytes = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decryptedBytes[i] = encryptedBytes[i] ^ stream[i];
  }

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBytes);
  return JSON.parse(jsonStr);
}

// In-memory cache for high-speed active key resolution
let activeKeysCache = {
  RSA: null,
  ECC: null,
  lastFetched: 0
};

export async function initializeOrGetActiveKeys() {
  await dbConnect();

  const now = Date.now();
  if (activeKeysCache.RSA && activeKeysCache.ECC && now - activeKeysCache.lastFetched < 60000) {
    return activeKeysCache;
  }

  let rsaEntry = await KeyStore.findOne({ algorithm: 'RSA', isActive: true });
  let eccEntry = await KeyStore.findOne({ algorithm: 'ECC', isActive: true });

  if (!rsaEntry) {
    const rsaKeys = generateRSAKeyPair();
    rsaEntry = await KeyStore.create({
      version: 'v1',
      algorithm: 'RSA',
      publicKey: rsaKeys.publicKey,
      encryptedPrivateKey: protectPrivateKey(rsaKeys.privateKey),
      isActive: true,
      createdAt: new Date(),
    });
  }

  if (!eccEntry) {
    const eccKeys = generateECCKeyPair();
    eccEntry = await KeyStore.create({
      version: 'v1',
      algorithm: 'ECC',
      publicKey: eccKeys.publicKey,
      encryptedPrivateKey: protectPrivateKey(eccKeys.privateKey),
      isActive: true,
      createdAt: new Date(),
    });
  }

  activeKeysCache = {
    RSA: {
      version: rsaEntry.version,
      publicKey: rsaEntry.publicKey,
      privateKey: unprotectPrivateKey(rsaEntry.encryptedPrivateKey)
    },
    ECC: {
      version: eccEntry.version,
      publicKey: eccEntry.publicKey,
      privateKey: unprotectPrivateKey(eccEntry.encryptedPrivateKey)
    },
    lastFetched: now
  };

  return activeKeysCache;
}

// Retrieve public keys for distribution
export async function getPublicKeysForDistribution() {
  const keys = await initializeOrGetActiveKeys();
  return {
    RSA: {
      algorithm: 'RSA',
      version: keys.RSA.version,
      publicKey: keys.RSA.publicKey
    },
    ECC: {
      algorithm: 'ECC',
      version: keys.ECC.version,
      publicKey: keys.ECC.publicKey
    }
  };
}

// Retrieve key for a specific historical or active version
export async function getKeyByVersion(algorithm, version) {
  await dbConnect();
  const entry = await KeyStore.findOne({ algorithm, version });
  if (!entry) {
    // Fall back to active
    const active = await initializeOrGetActiveKeys();
    return active[algorithm];
  }
  return {
    version: entry.version,
    publicKey: entry.publicKey,
    privateKey: unprotectPrivateKey(entry.encryptedPrivateKey)
  };
}

// Key Rotation Module: Marks current active keys as rotated and instantiates next version
export async function rotateKeys() {
  await dbConnect();

  // Find latest versions
  const latestRSA = await KeyStore.findOne({ algorithm: 'RSA' }).sort({ createdAt: -1 });
  const latestECC = await KeyStore.findOne({ algorithm: 'ECC' }).sort({ createdAt: -1 });

  const nextRsaVer = 'v' + ((latestRSA ? parseInt(latestRSA.version.replace('v', ''), 10) : 0) + 1);
  const nextEccVer = 'v' + ((latestECC ? parseInt(latestECC.version.replace('v', ''), 10) : 0) + 1);

  // Deactivate existing
  await KeyStore.updateMany({ isActive: true }, { isActive: false, rotatedAt: new Date() });

  // Generate new keys
  const newRSA = generateRSAKeyPair();
  const newECC = generateECCKeyPair();

  const createdRSA = await KeyStore.create({
    version: nextRsaVer,
    algorithm: 'RSA',
    publicKey: newRSA.publicKey,
    encryptedPrivateKey: protectPrivateKey(newRSA.privateKey),
    isActive: true,
    createdAt: new Date(),
  });

  const createdECC = await KeyStore.create({
    version: nextEccVer,
    algorithm: 'ECC',
    publicKey: newECC.publicKey,
    encryptedPrivateKey: protectPrivateKey(newECC.privateKey),
    isActive: true,
    createdAt: new Date(),
  });

  activeKeysCache = {
    RSA: {
      version: createdRSA.version,
      publicKey: createdRSA.publicKey,
      privateKey: newRSA.privateKey
    },
    ECC: {
      version: createdECC.version,
      publicKey: createdECC.publicKey,
      privateKey: newECC.privateKey
    },
    lastFetched: Date.now()
  };

  return {
    success: true,
    message: `Keys successfully rotated to RSA ${nextRsaVer} and ECC ${nextEccVer}`,
    activeVersions: {
      RSA: nextRsaVer,
      ECC: nextEccVer
    }
  };
}

// Get full rotation history for Admin Audit
export async function getRotationHistory() {
  await dbConnect();
  const history = await KeyStore.find().sort({ createdAt: -1 }).select('-encryptedPrivateKey');
  return history;
}
