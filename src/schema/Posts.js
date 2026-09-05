// /src/schema/Posts.js
import mongoose, { Schema } from 'mongoose';

const PostSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Asymmetrically encrypted with Scratch ECC
  content: { type: String, required: true },
  keyVersion: { type: String, default: 'v1' },

  // Message Authentication Code (MAC) verifying data integrity & detecting tampering
  mac: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
