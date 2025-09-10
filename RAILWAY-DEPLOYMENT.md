# Railway Deployment Guide

## Quick Railway Deployment Steps

### 1. Prepare Your Repository
✅ Your app is already configured for Railway deployment!

### 2. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)

### 3. Deploy Your Project

#### Option A: GitHub Integration (Recommended)
1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Connect to Railway**:
   - Click "Deploy from GitHub repo" 
   - Select your `freelance-invoice-generator` repository
   - Railway will auto-detect it's a Node.js project

3. **Set Environment Variables**:
   - Go to your Railway project dashboard
   - Click "Variables" tab
   - Copy variables from `railway.env.example` and customize them:
     
   **Essential Variables:**
   ```
   NODE_ENV=production
   BUSINESS_NAME=Your Actual Business Name
   BUSINESS_EMAIL=your-real-email@example.com
   BUSINESS_ADDRESS=Your Real Address
   ALLOWED_ORIGINS=https://your-app-name.railway.app
   ```

4. **Deploy**:
   - Railway automatically builds and deploys
   - You'll get a URL like `https://your-app-name.railway.app`

#### Option B: Railway CLI (Advanced)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway deploy
```

### 4. Verify Deployment
Visit your Railway URL and check:
- ✅ Homepage loads: `https://your-app.railway.app`
- ✅ Health check works: `https://your-app.railway.app/health`
- ✅ API responds: `https://your-app.railway.app/api/invoices`

### 5. Custom Domain (Optional)
In Railway dashboard:
1. Go to "Settings" → "Domains"
2. Add your custom domain
3. Update DNS records as instructed

## Railway Features Your App Uses

✅ **Node.js Runtime** - Runs your Express server  
✅ **Automatic Builds** - Uses your `npm start` command  
✅ **Environment Variables** - Secure config management  
✅ **Health Checks** - Uses your `/health` endpoint  
✅ **Static File Serving** - Serves your built frontend  
✅ **Puppeteer Support** - PDF generation works  

## Cost Estimate
- **Development/Testing**: Free (within $5 credit limit)
- **Light Production**: $3-8/month
- **Active Production**: $10-20/month

## Common Issues & Solutions

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is 16+ (set in `package.json` engines)

### Environment Variables
- Update `ALLOWED_ORIGINS` to include your Railway URL
- Set `NODE_ENV=production` for optimal performance

### PDF Generation Issues
- Railway supports Puppeteer out of the box
- No additional configuration needed

## Next Steps After Deployment

1. **Test all features** on your live URL
2. **Set up custom domain** (optional)
3. **Configure real email service** (Gmail, SendGrid, etc.)
4. **Add database** if needed (Railway offers PostgreSQL)
5. **Set up monitoring** (Railway provides basic logs)

## Support
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Your app logs: Available in Railway dashboard
