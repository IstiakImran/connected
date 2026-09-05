// /lib/dbConnect.js
import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows Node.js querySrv ECONNREFUSED issue with MongoDB Atlas SRV connection strings
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (err) {
  console.warn('Could not set custom DNS servers:', err.message);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI must be set in environment variables.');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  console.log('✓ Connected to MongoDB');
  return cached.conn;
}
