import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test database connection
    const { db } = await connectToDatabase();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: db ? 'connected' : 'mock',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
