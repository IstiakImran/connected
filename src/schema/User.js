// /src/schema/User.js
import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  // Asymmetrically encrypted user credentials & PII (Scratch RSA)
  username: { type: String, required: true },
  usernameHash: { type: String, required: true, index: true },
  email: { type: String, required: true },
  emailHash: { type: String, required: true, index: true },
  fullName: { type: String, required: true },
  address: { type: String, required: true },

  // From-scratch multi-round salted password digest
  password: { type: String, required: true },
  salt: { type: String, required: true },

  // Role-Based Access Control (RBAC)
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  // Email Verification (Nodemailer)
  emailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  emailVerificationExpires: { type: Date },

  // Two-Step Authentication (2FA)
  twoFactorEnabled: { type: Boolean, default: true },
  twoFactorTempCode: { type: String },
  twoFactorExpires: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
