// /src/schema/Comment.js
import mongoose, { Schema } from 'mongoose';

const CommentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Parent comment reference for nested replies
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },

    // Asymmetrically encrypted with Scratch ECC (Algorithm 2)
    content: { type: String, required: true },
    keyVersion: { type: String, default: 'v1' },

    // Message Authentication Code (MAC) verifying data integrity & detecting tampering
    mac: { type: String, required: true },
  },
  { timestamps: true }
);

export const Comment =
  mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
