// /models/Post.js
import mongoose, { Schema } from 'mongoose';

const PostSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
