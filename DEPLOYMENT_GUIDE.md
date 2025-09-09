# 🚀 CrowdCare Deployment Guide with MongoDB Atlas

## Prerequisites
- MongoDB Atlas account (free tier available)
- Vercel account (free tier available)
- GitHub account (for code repository)

## Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Choose "Build a new app" → "I'm learning MongoDB"

### 1.2 Create a Cluster
1. Choose **M0 Sandbox** (Free tier)
2. Select a cloud provider (AWS recommended)
3. Choose a region close to your users
4. Name your cluster (e.g., "CrowdCare-Cluster")
5. Click "Create Cluster"

### 1.3 Configure Database Access
1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Create a username (e.g., "crowdcare-user")
5. Generate a secure password (save it!)
6. Set privileges to **Read and write to any database**
7. Click **Add User**

### 1.4 Configure Network Access
1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. For development: Click **Allow Access from Anywhere** (0.0.0.0/0)
4. For production: Add specific IP addresses
5. Click **Confirm**

### 1.5 Get Connection String
1. Go to **Clusters** in the left sidebar
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Select **Node.js** and version **4.1 or later**
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `<dbname>` with `crowdcare`

**Example connection string:**
```
mongodb+srv://crowdcare-user:yourpassword@crowdcare-cluster.abc123.mongodb.net/crowdcare?retryWrites=true&w=majority
```

## Step 2: Prepare for Deployment

### 2.1 Update Environment Variables
Create a `.env.local` file for local testing:

```env
MONGODB_URI=mongodb+srv://crowdcare-user:yourpassword@crowdcare-cluster.abc123.mongodb.net/crowdcare?retryWrites=true&w=majority
MONGODB_DB=crowdcare
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-super-secret-session-key-here
OPENAI_API_KEY=your-openai-api-key-here
```

### 2.2 Test Local Connection
```bash
npm run dev
```

You should see:
```
✅ Connected to MongoDB Atlas
serving on port 5000
```

## Step 3: Deploy to Vercel

### 3.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 3.2 Login to Vercel
```bash
vercel login
```

### 3.3 Deploy
```bash
vercel
```

Follow the prompts:

- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name: **crowdcare** (or your preferred name)
- Directory: **./** (current directory)
- Override settings? **N**

### 3.4 Set Environment Variables in Vercel
1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `MONGODB_URI` | Your MongoDB Atlas connection string | Production, Preview, Development |
| `MONGODB_DB` | `crowdcare` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `SESSION_SECRET` | A random secret string | Production, Preview, Development |
| `OPENAI_API_KEY` | Your OpenAI API key | Production, Preview, Development |

### 3.5 Redeploy
After adding environment variables:
```bash
vercel --prod
```

## Step 4: Test Deployment

### 4.1 Check Deployment Status
Visit your Vercel URL (provided after deployment)

### 4.2 Test API Endpoints
```bash
# Test departments endpoint
curl https://your-app.vercel.app/api/departments

# Test issues endpoint
curl https://your-app.vercel.app/api/issues
```

### 4.3 Test Frontend
Visit your Vercel URL in a browser to test the frontend

## Step 5: Production Optimizations

### 5.1 MongoDB Atlas Production Settings
1. **Upgrade Cluster**: Consider M10+ for production
2. **Enable Monitoring**: Set up alerts and monitoring
3. **Backup**: Enable automated backups
4. **Security**: Use IP whitelisting for production

### 5.2 Vercel Production Settings
1. **Custom Domain**: Add your custom domain
2. **Analytics**: Enable Vercel Analytics
3. **Monitoring**: Set up error tracking

## Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
- Check connection string format
- Verify IP whitelist includes 0.0.0.0/0
- Ensure database user has correct permissions

**2. Environment Variables Not Working**
- Redeploy after adding environment variables
- Check variable names match exactly
- Ensure variables are set for correct environments

**3. Build Failures**
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check for TypeScript errors

**4. API Endpoints Not Working**
- Check server logs in Vercel dashboard
- Verify MongoDB connection
- Test endpoints individually

### Getting Help
- Check Vercel logs: `vercel logs`
- Check MongoDB Atlas logs in dashboard
- Review application logs in Vercel dashboard

## 🎉 Success!

Once deployed, your CrowdCare application will be:
- ✅ Running on MongoDB Atlas (cloud database)
- ✅ Deployed on Vercel (global CDN)
- ✅ Production-ready with automatic scaling
- ✅ Secure with environment variables
- ✅ Monitored with built-in analytics

Your application is now live and ready for users! 🚀
