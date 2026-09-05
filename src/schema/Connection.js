// /src/schema/Connection.js
import mongoose, { Schema } from 'mongoose';

const ConnectionSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per relationship direction
ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export const Connection =
  mongoose.models.Connection || mongoose.model('Connection', ConnectionSchema);
