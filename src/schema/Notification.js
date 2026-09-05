// /src/schema/Notification.js
import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['message', 'connection', 'comment', 'vote', 'reply', 'system'],
    required: true,
  },
  title: { type: String, required: true },
  // Asymmetrically encrypted with Scratch ECC (Algorithm 2)
  message: { type: String, required: true },
  keyVersion: { type: String, default: 'v1' },
  // Message Authentication Code (HMAC-SHA256) verifying integrity
  mac: { type: String, default: '' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
