# Deploying EtherFlow to Vercel

This guide explains how to deploy EtherFlow to Vercel and handle the Alchemy API key properly.

## Important Security Note

⚠️ **The Alchemy API key will be visible to users** since this is a client-side React app. This is the expected behavior for frontend applications. To mitigate risks:

1. Use Alchemy's **free tier** API key (not a paid plan key)
2. Set **rate limits** and **domain restrictions** in your Alchemy dashboard
3. Monitor usage in the Alchemy dashboard
4. Consider this a **demo/development** deployment approach

## 🎯 Demo Mode Feature

The app now includes a built-in demo mode that allows visitors to try the app with limited usage:

- **2 API calls per session** using your demo API key
- **Pre-loaded demo addresses** (Vitalik, Binance, Uniswap)
- **Session-based limits** (resets on page refresh)
- **Graceful fallback** when limits are reached

### Demo Mode Setup
1. Create a **separate Alchemy API key** for demo purposes
2. Set it as `REACT_APP_DEMO_API_KEY` in Vercel
3. Configure **tight rate limits** for this key in Alchemy dashboard
4. Monitor usage and adjust limits as needed

## Deployment Steps

### 1. Prepare Your Repository

Make sure your `.env` file is in `.gitignore` (it should be by default):

```bash
# Verify .env is ignored
git status
# Should not show .env file
```

### 2. Get Your Alchemy API Key

1. Go to [Alchemy](https://www.alchemy.com/)
2. Sign up for a free account
3. Create a new app for Ethereum Mainnet
4. Copy your API key

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts and add your environment variable when prompted
```

#### Option B: Using GitHub Integration

1. Push your code to GitHub:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Connect your GitHub repository
5. Configure the environment variable:
   - Variable name: `REACT_APP_ALCHEMY_API_KEY`
   - Value: Your Alchemy API key

### 4. Configure Environment Variables

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add these environment variables:
   - **Name**: `REACT_APP_ALCHEMY_API_KEY`
   - **Value**: Your personal Alchemy API key (fallback)
   - **Environments**: Production, Preview, Development
   
   - **Name**: `REACT_APP_DEMO_API_KEY` (Optional)
   - **Value**: A separate API key for demo usage (recommended)
   - **Environments**: Production, Preview, Development

### 5. Alchemy Security Configuration

To protect your API key:

1. **Domain Restrictions** (Recommended):
   - In your Alchemy dashboard, go to your app settings
   - Add your Vercel domain (e.g., `your-app.vercel.app`) to allowed domains
   - This prevents unauthorized domains from using your key

2. **Rate Limiting**:
   - Set reasonable rate limits in Alchemy dashboard
   - Monitor usage regularly

3. **HTTP Referrer Restrictions**:
   - Add your domain as an allowed referrer
   - This adds an extra layer of protection

## Alternative: User-Provided API Keys

For a more secure approach, you could modify the app to let users provide their own API keys:

### Implementation Option

```javascript
// In App.js - Add state for user-provided API key
const [userApiKey, setUserApiKey] = useState('');

// Add UI for API key input
<Input 
  type="password" 
  placeholder="Enter your Alchemy API key" 
  value={userApiKey}
  onChange={(e) => setUserApiKey(e.target.value)}
/>

// Use user key if provided, otherwise use environment key
const apiKey = userApiKey || process.env.REACT_APP_ALCHEMY_API_KEY;
```

This way:
- Users provide their own API keys (stored locally)
- No API key exposure in your deployment
- Each user uses their own quota

## Deployment Commands

```bash
# Build locally to test
npm run build

# Deploy to Vercel
vercel --prod

# Check deployment
vercel ls
```

## Environment Variables for Different Stages

| Environment | Purpose | API Key Source |
|-------------|---------|----------------|
| Development | Local development | `.env` file (gitignored) |
| Preview | Testing deployments | Vercel environment variables |
| Production | Live app | Vercel environment variables |

## Monitoring

After deployment:
1. Monitor Alchemy dashboard for API usage
2. Set up alerts for unusual activity
3. Regularly rotate API keys if needed
4. Check Vercel analytics for traffic patterns

## Troubleshooting

### API Key Not Working
- Verify the environment variable name exactly matches `REACT_APP_ALCHEMY_API_KEY`
- Check that the key is valid in Alchemy dashboard
- Ensure domain restrictions allow your Vercel domain

### Build Failures
- Make sure `vercel-build` script is in package.json
- Check that all dependencies install correctly
- Verify no syntax errors in the code

### Runtime Errors
- Check browser console for errors
- Verify API key is being loaded (check network tab)
- Test API endpoints independently

## Example vercel.json

The project includes a `vercel.json` file with optimal settings for React apps:

```json
{
  "name": "etherflow",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

This ensures proper routing for the single-page application.