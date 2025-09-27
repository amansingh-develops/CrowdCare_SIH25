# MongoDB Setup Instructions

## Option 1: MongoDB Atlas (Cloud) - Recommended

1. **Create a free MongoDB Atlas account:**
   - Go to https://www.mongodb.com/atlas
   - Sign up for a free account
   - Create a new cluster (free tier)

2. **Get your connection string:**
   - In Atlas dashboard, click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

3. **Update environment variables:**
   - Update `environment_variables.env` with your Atlas connection string
   - Example: `MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/crowdcare`

## Option 2: Local MongoDB Installation

### Windows:
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install with default settings
3. Start MongoDB service: `net start MongoDB`
4. Use connection string: `mongodb://localhost:27017/crowdcare`

### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

### Linux (Ubuntu):
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Option 3: Docker (if Docker Desktop is available)

1. Start Docker Desktop
2. Run: `docker-compose up -d mongodb`
3. MongoDB will be available at `mongodb://admin:password123@localhost:27017/crowdcare`

## Quick Test Setup (No MongoDB Required)

For immediate testing, you can use a mock database by updating the server code to work without MongoDB connection.
