// /lib/auth.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from './encryption';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment variables.');
}

export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

export const generateJWT = (user) => {
    return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyJWT = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

export const encryptData = (data) => {
    return encrypt(data);
};

export const decryptData = (data) => {
    return decrypt(data);
};
