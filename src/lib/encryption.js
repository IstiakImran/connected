// /lib/encryption.js
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;

if (!key || !iv) {
    throw new Error('Encryption key and IV must be set in environment variables.');
}

export const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

export const decrypt = (encrypted) => {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
