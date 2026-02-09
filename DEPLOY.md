# Deploy to Vercel - Quick Guide

## Step 1: Install Vercel CLI (Optional but helpful)
```powershell
npm install -g vercel
```

## Step 2: Push to GitHub

1. Go to https://github.com and create a new repository
2. Run these commands in your terminal:

```powershell
cd "c:\Users\PC\OneDrive\Desktop\chauffeur drive\paygate-branch-links"
git init
git add .
git commit -m "Initial commit - PayGate payment links"
```

3. Connect to your GitHub repo:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy on Vercel

### Method A: Via Vercel Website (Easiest)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Vercel will auto-detect settings
6. Add Environment Variables:
   - `PAYGATE_ID` = 1050115100012
   - `PAYGATE_KEY` = iPuY238Ocl0s
   - `BASE_URL` = https://your-app-name.vercel.app (Vercel will show you this)
   - `NODE_ENV` = production
7. Click "Deploy"

### Method B: Via CLI

```powershell
cd "c:\Users\PC\OneDrive\Desktop\chauffeur drive\paygate-branch-links"
vercel
```

Follow prompts, then set environment variables:
```powershell
vercel env add PAYGATE_ID
vercel env add PAYGATE_KEY
vercel env add BASE_URL
vercel env add NODE_ENV
```

## Step 4: Update BASE_URL

After deployment, Vercel gives you a URL like: `https://your-app-name.vercel.app`

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `BASE_URL` to your actual Vercel URL
3. Redeploy (or it auto-redeploys)

## Your Live URLs will be:
- https://your-app-name.vercel.app/pay/benefit-a
- https://your-app-name.vercel.app/pay/benefit-b

## Custom Domain (Optional)

In Vercel Dashboard → Domains → Add your custom domain (e.g., yourdomain.co.za)
Then update BASE_URL to your custom domain.
