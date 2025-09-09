# 🍃 MongoDB Atlas Setup Guide

## Quick Setup for CrowdCare

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/atlas
2. Click "Try Free"
3. Sign up with email (no credit card required)

### Step 2: Create Free Cluster
1. Choose "Shared" → "Free" (M0)
2. Select region closest to you
3. Click "Create Cluster"

### Step 3: Create Database User
1. Go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create username and password
5. Set privileges to "Read and write to any database"

### Step 4: Whitelist IP Address
1. Go to "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Clusters"
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password

### Step 6: Set Environment Variables
```bash
# Windows PowerShell
$env:MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/"
$env:MONGODB_DB="crowdcare"

# Or create .env file
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=crowdcare
```

### Step 7: Test Connection
```bash
python check_db_connection.py
```

## Example Connection String
```
mongodb+srv://crowdcare_user:your_password@cluster0.abc123.mongodb.net/
```

## For Vercel Deployment
Add these environment variables in Vercel dashboard:
- `MONGODB_URI`: Your Atlas connection string
- `MONGODB_DB`: crowdcare
