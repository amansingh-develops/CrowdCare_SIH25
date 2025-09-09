# MongoDB Atlas Setup Guide

## ✅ Migration Complete!

Your CrowdCare application has been successfully migrated from SQLite to MongoDB Atlas. Here's what was changed and how to set up your MongoDB Atlas connection.

## 🔄 What Was Changed

### 1. **Dependencies Updated**
- ❌ Removed: `drizzle-orm`, `drizzle-zod`, `drizzle-kit`, `better-sqlite3`
- ✅ Added: `mongodb`, `mongoose`

### 2. **Database Configuration**
- **File**: `server/db.ts`
- **Change**: Now uses MongoDB client instead of SQLite
- **Connection**: MongoDB Atlas cloud database

### 3. **Schema Migration**
- **File**: `shared/mongodb-schema.ts` (new)
- **Change**: Converted from Drizzle SQLite schema to MongoDB document schema
- **Features**: All original functionality preserved

### 4. **Storage Layer**
- **File**: `server/mongodb-storage.ts` (new)
- **Change**: Complete rewrite using MongoDB operations
- **Features**: Aggregation pipelines, proper indexing, optimized queries

## 🚀 MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new cluster (M0 Sandbox is free)

### Step 2: Configure Database Access
1. Go to **Database Access** in your Atlas dashboard
2. Click **Add New Database User**
3. Create a user with **Read and write to any database** permissions
4. Save the username and password

### Step 3: Configure Network Access
1. Go to **Network Access** in your Atlas dashboard
2. Click **Add IP Address**
3. Add `0.0.0.0/0` for development (or your specific IP for production)
4. Click **Confirm**

### Step 4: Get Connection String
1. Go to **Clusters** in your Atlas dashboard
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `crowdcare`

### Step 5: Update Environment Variables
Create a `.env` file in your project root:

```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crowdcare?retryWrites=true&w=majority
MONGODB_DB=crowdcare

# Server Configuration
PORT=5000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your_session_secret_here

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=your_openai_api_key_here
```

## 🧪 Testing the Connection

### 1. Start the Server
```bash
npm run dev
```

### 2. Verify Connection
You should see:
```
✅ Connected to MongoDB Atlas
serving on port 5000
```

### 3. Test API Endpoints
```bash
# Test departments endpoint
curl http://localhost:5000/api/departments

# Test issues endpoint
curl http://localhost:5000/api/issues
```

## 📊 Database Collections

Your MongoDB database will automatically create these collections:

- **users** - User accounts and profiles
- **departments** - Government departments
- **issues** - Reported issues/problems
- **issueImages** - Images attached to issues
- **issueComments** - Comments on issues
- **issueUpvotes** - User upvotes on issues

## 🚀 Deployment

### Vercel Deployment
1. Add environment variables in Vercel dashboard
2. Deploy as usual - MongoDB Atlas works perfectly with Vercel

### Other Platforms
- **Railway**: Supports MongoDB Atlas
- **Render**: Supports MongoDB Atlas
- **Heroku**: Supports MongoDB Atlas
- **DigitalOcean**: Supports MongoDB Atlas

## 🔧 Troubleshooting

### Connection Issues
- Verify your MongoDB Atlas connection string
- Check that your IP is whitelisted
- Ensure database user has correct permissions

### Environment Variables
- Make sure `.env` file is in project root
- Verify all required variables are set
- Restart server after changing environment variables

### Performance
- MongoDB Atlas automatically handles indexing
- Use MongoDB Compass for database management
- Monitor performance in Atlas dashboard

## 🎉 Benefits of MongoDB Atlas

- ✅ **Cloud-hosted** - No local database management
- ✅ **Automatic backups** - Data safety guaranteed
- ✅ **Scalable** - Grows with your application
- ✅ **Global** - Deploy anywhere in the world
- ✅ **Managed** - No server maintenance required
- ✅ **Free tier** - Perfect for development and small apps

Your application is now ready for production deployment with MongoDB Atlas! 🚀
