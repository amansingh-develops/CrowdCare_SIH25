# Vercel Deployment Guide for CrowdCare

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- GitHub repository with your code
- Vercel account (free tier available)
- MongoDB Atlas account (optional, app works with mock data)

### 2. Deploy to Vercel

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your CrowdCare repository

2. **Configure Build Settings:**
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `dist/public`
   - Install Command: `npm install`

3. **Set Environment Variables:**
   In Vercel dashboard → Project Settings → Environment Variables, add:

   ```
   NODE_ENV=production
   SESSION_SECRET=your-super-secret-session-key-here
   ```

   **Optional (for MongoDB):**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crowdcare?retryWrites=true&w=majority
   MONGODB_DB=crowdcare
   ```

   **Optional (for AI features):**
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

## 🔧 Configuration Details

### Database Options

**Option 1: Mock Database (Default)**
- No setup required
- Data resets on each deployment
- Perfect for demos and testing

**Option 2: MongoDB Atlas (Recommended for Production)**
1. Create MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Set `MONGODB_URI` in Vercel environment variables

### API Routes
- All API endpoints are available at `/api/*`
- Frontend is served from the root `/`
- Static files are served from `/assets/*`

## 🎯 Features Working in Production

✅ **User Authentication** (Citizen & Admin)  
✅ **Issue Reporting** with image upload  
✅ **Admin Dashboard** with issue management  
✅ **Community Features** (upvotes, comments)  
✅ **Real-time Updates** via WebSocket  
✅ **Gamification System** (points, badges)  
✅ **File Storage** for images  
✅ **Responsive Design** for all devices  

## 🔍 Troubleshooting

### Build Errors
- Check that all dependencies are in `package.json`
- Ensure TypeScript compilation passes
- Verify all imports are correct

### Runtime Errors
- Check Vercel function logs
- Verify environment variables are set
- Ensure API routes are properly configured

### Database Connection Issues
- App automatically falls back to mock database
- Check MongoDB URI format
- Verify network access in MongoDB Atlas

## 📱 Access Your Deployed App

Once deployed, your CrowdCare app will be available at:
- **Frontend**: `https://your-project.vercel.app`
- **API Documentation**: `https://your-project.vercel.app/api/docs`
- **Health Check**: `https://your-project.vercel.app/api/health`

## 🔄 Updates and Maintenance

- Push changes to GitHub
- Vercel automatically redeploys
- Environment variables persist across deployments
- Database data persists (if using MongoDB Atlas)

## 💡 Pro Tips

1. **Custom Domain**: Add your own domain in Vercel settings
2. **Analytics**: Enable Vercel Analytics for usage insights
3. **Performance**: Monitor Core Web Vitals in Vercel dashboard
4. **Security**: Use strong session secrets and API keys
5. **Backup**: Regular database backups if using MongoDB Atlas

Your CrowdCare application is now ready for production use! 🎉
