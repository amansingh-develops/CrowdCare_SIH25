import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerSimpleRoutes } from '../server/simple-routes';
import { connectToDatabase } from '../server/db';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize database connection once
let dbInitialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize database connection only once
    if (!dbInitialized) {
      await connectToDatabase();
      dbInitialized = true;
    }
    
    // Register API routes
    await registerSimpleRoutes(app);
    
    // Handle the request
    return new Promise((resolve, reject) => {
      app(req, res, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('API Handler Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
