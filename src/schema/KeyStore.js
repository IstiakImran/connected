// /src/schema/KeyStore.js
import mongoose, { Schema } from 'mongoose';

const KeyStoreSchema = new Schema({
  version: { type: String, required: true },
  algorithm: { type: String, required: true, enum: ['RSA', 'ECC'] },
  publicKey: { type: Schema.Types.Mixed, required: true },
  encryptedPrivateKey: { type: Schema.Types.Mixed, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  rotatedAt: { type: Date },
});

export const KeyStore = mongoose.models.KeyStore || mongoose.model('KeyStore', KeyStoreSchema);
