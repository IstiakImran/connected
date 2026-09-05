// /src/schema/DirectMessage.js
import mongoose, { Schema } from 'mongoose';

const DirectMessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // Asymmetrically encrypted with Scratch ECC
  content: { type: String, required: true },
  keyVersion: { type: String, default: 'v1' },

  // Message Authentication Code (MAC) verifying data integrity
  mac: { type: String, required: true },

  read: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', DirectMessageSchema);
