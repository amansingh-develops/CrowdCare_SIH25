import { MongoClient, Db } from 'mongodb';
import { mockDb } from './mock-db';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdcare';
const MONGODB_DB = process.env.MONGODB_DB || 'crowdcare';

let client: MongoClient;
let db: Db;
let useMockDb = false;

export async function connectToDatabase() {
  // For Vercel deployment, use mock database if MongoDB URI is not properly configured
  if (!process.env.MONGODB_URI || 
      process.env.MONGODB_URI.includes('localhost') || 
      process.env.MONGODB_URI.includes('cluster.mongodb.net') === false ||
      useMockDb) {
    console.log('🔄 Using Mock Database for development/production');
    return { client: null, db: mockDb as any };
  }

  if (client && db) {
    return { client, db };
  }

  try {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db(MONGODB_DB);
    
    console.log('✅ Connected to MongoDB Atlas');
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('🔄 Falling back to Mock Database for development');
    useMockDb = true;
    return { client: null, db: mockDb as any };
  }
}

export { db };