# Demo Mode Setup Guide

## 🎯 What's Been Implemented

EtherFlow now includes a **session-based demo system** that allows visitors to try your app with limited API usage.

### Features Added:
- ✅ **2 API calls per session** (configurable)
- ✅ **Session storage** tracking (resets on page refresh)
- ✅ **Pre-loaded demo addresses** (Vitalik, Binance, Uniswap)
- ✅ **Graceful UI** showing usage limits and status
- ✅ **User API key input** for unlimited usage
- ✅ **Demo exhaustion handling** with helpful messaging

## 🔑 API Key Strategy

You'll need **two API keys** for optimal demo deployment:

### 1. Personal API Key (`REACT_APP_ALCHEMY_API_KEY`)
- Your main API key for fallback
- Higher rate limits for your personal use

### 2. Demo API Key (`REACT_APP_DEMO_API_KEY`) 
- **Separate key specifically for public demo**
- Lower rate limits (recommended)
- Easy to monitor and rotate

## 🚀 Quick Setup

### For Local Development:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your keys:
REACT_APP_ALCHEMY_API_KEY=your_main_api_key
REACT_APP_DEMO_API_KEY=your_demo_api_key
```

### For Vercel Deployment:
1. Set both environment variables in Vercel dashboard
2. Configure rate limits in Alchemy for demo key
3. Monitor usage in Alchemy dashboard

## 🎮 How Demo Mode Works

### User Experience:
1. **Visitor arrives** → Sees demo panel with 2 calls remaining
2. **Clicks demo address** → Uses 1 API call, shows results
3. **Uses second call** → Gets analysis, sees "1 call remaining"
4. **Exhausts limit** → Prompted to get their own API key or refresh

### Admin Experience:
- Monitor demo usage in Alchemy dashboard
- Adjust rate limits as needed
- Rotate demo API key if abused

## 🔒 Security Benefits

- **Limited exposure**: Demo key has restricted usage
- **Easy monitoring**: Separate demo key usage tracking
- **Graceful degradation**: App still works when demo exhausted
- **User education**: Encourages users to get their own keys

## 📊 Usage Monitoring

Track these metrics in your Alchemy dashboard:
- **Demo API calls per day**
- **Unique sessions using demo**
- **Rate limit hits**
- **Geographic distribution**

## 🛠️ Customization Options

In `src/services/demoService.js`, you can adjust:
- `MAX_CALLS_PER_SESSION`: Change from 2 to any number
- `DEMO_ADDRESSES`: Add/remove pre-loaded addresses
- Session storage behavior

## 🚨 Important Notes

1. **Demo API key will be visible** in browser (same as any frontend app)
2. **Use free-tier keys only** for demo purposes
3. **Set domain restrictions** in Alchemy dashboard
4. **Monitor usage regularly** to prevent abuse
5. **Consider rotating demo keys** periodically

## 🎯 Ready for Production

Your app now provides:
- **Professional demo experience** for visitors
- **Secure API key handling** with limits
- **Clear upgrade path** to personal API keys
- **Monitoring and control** capabilities

Deploy with confidence! 🚀