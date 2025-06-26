/**
 * Demo Service
 * 
 * Manages demo API usage limits for sessions without their own API keys
 */

// Demo configuration
const DEMO_CONFIG = {
  MAX_CALLS_PER_SESSION: 2,
  SESSION_STORAGE_KEY: 'etherflow_demo_usage',
  DEMO_API_KEY: process.env.REACT_APP_DEMO_API_KEY, // Your demo API key
  DEMO_ADDRESSES: [
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik's address
    '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE', // Binance hot wallet
    '0xA090e606E30bD747d4E6245a1517EbE430F0057e', // Compound Finance
    '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', // DeFi whale
    '0x742d35Cc6634C0532925a3b8d0949d2C493E66Fe', // Mid-tier DeFi user
    '0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489', // NFT collector
    '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf' // Active trader
  ]
};

/**
 * Get current demo usage for this session
 */
export const getDemoUsage = () => {
  try {
    const stored = sessionStorage.getItem(DEMO_CONFIG.SESSION_STORAGE_KEY);
    if (stored) {
      const usage = JSON.parse(stored);
      return {
        callsUsed: usage.callsUsed || 0,
        maxCalls: DEMO_CONFIG.MAX_CALLS_PER_SESSION,
        remainingCalls: DEMO_CONFIG.MAX_CALLS_PER_SESSION - (usage.callsUsed || 0),
        isExhausted: (usage.callsUsed || 0) >= DEMO_CONFIG.MAX_CALLS_PER_SESSION,
        firstUsed: usage.firstUsed || null
      };
    }
  } catch (error) {
    console.warn('Error reading demo usage:', error);
  }
  
  return {
    callsUsed: 0,
    maxCalls: DEMO_CONFIG.MAX_CALLS_PER_SESSION,
    remainingCalls: DEMO_CONFIG.MAX_CALLS_PER_SESSION,
    isExhausted: false,
    firstUsed: null
  };
};

/**
 * Check if demo API can be used
 */
export const canUseDemoAPI = () => {
  const usage = getDemoUsage();
  return !usage.isExhausted && DEMO_CONFIG.DEMO_API_KEY;
};

/**
 * Increment demo usage counter
 */
export const incrementDemoUsage = () => {
  try {
    const usage = getDemoUsage();
    const newUsage = {
      callsUsed: usage.callsUsed + 1,
      firstUsed: usage.firstUsed || new Date().toISOString()
    };
    
    sessionStorage.setItem(DEMO_CONFIG.SESSION_STORAGE_KEY, JSON.stringify(newUsage));
    return getDemoUsage();
  } catch (error) {
    console.warn('Error updating demo usage:', error);
    return getDemoUsage();
  }
};

/**
 * Reset demo usage (for development/testing)
 */
export const resetDemoUsage = () => {
  try {
    sessionStorage.removeItem(DEMO_CONFIG.SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Error resetting demo usage:', error);
  }
};

/**
 * Get the appropriate API key based on user input and demo availability
 */
export const getEffectiveApiKey = (userProvidedKey = null) => {
  // Priority: User's key > Demo key (if available) > Environment key
  if (userProvidedKey && userProvidedKey.trim()) {
    return userProvidedKey.trim();
  }
  
  if (canUseDemoAPI()) {
    return DEMO_CONFIG.DEMO_API_KEY;
  }
  
  return process.env.REACT_APP_ALCHEMY_API_KEY;
};

/**
 * Check if using demo API key
 */
export const isUsingDemoAPI = (apiKey) => {
  return apiKey === DEMO_CONFIG.DEMO_API_KEY;
};

/**
 * Get suggested demo addresses
 */
export const getDemoAddresses = () => {
  return DEMO_CONFIG.DEMO_ADDRESSES;
};

/**
 * Get demo status for display
 */
export const getDemoStatus = () => {
  const usage = getDemoUsage();
  const hasDemoKey = !!DEMO_CONFIG.DEMO_API_KEY;
  
  return {
    ...usage,
    hasDemoKey,
    canUseDemo: canUseDemoAPI(),
    demoAddresses: DEMO_CONFIG.DEMO_ADDRESSES
  };
};

export default {
  getDemoUsage,
  canUseDemoAPI,
  incrementDemoUsage,
  resetDemoUsage,
  getEffectiveApiKey,
  isUsingDemoAPI,
  getDemoAddresses,
  getDemoStatus
};