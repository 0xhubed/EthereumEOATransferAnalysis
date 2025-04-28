// Import the SDK dynamically to avoid chunk loading issues
import * as alchemySdk from 'alchemy-sdk';
const { Alchemy, Network } = alchemySdk;

// Configuration will be set from environment variable
let alchemy = null;

// Initialize Alchemy SDK with API key
export const initializeAlchemy = (apiKey = process.env.REACT_APP_ALCHEMY_API_KEY, network = Network.ETH_MAINNET) => {
  if (!apiKey) {
    console.error("No Alchemy API key provided");
    throw new Error("Alchemy API key is required");
  }
  
  try {
    const settings = {
      apiKey: apiKey,
      network: network,
    };
    
    alchemy = new Alchemy(settings);
    return alchemy;
  } catch (error) {
    console.error("Error initializing Alchemy SDK:", error);
    throw error;
  }
};

// Get transactions for a specific address with optional time range
export const getAddressTransactions = async (address, startTime = null, endTime = null) => {
  if (!alchemy) {
    throw new Error('Alchemy SDK not initialized. Please provide API key first.');
  }
  
  try {
    // Base query params
    const baseParams = {
      category: ["external"],
      excludeZeroValue: true,
      withMetadata: true, // Ensure we get block timestamps for the timeline
      maxCount: 1000, // Get more transactions for better analysis
    };
    
    // Add time range filters if provided
    if (startTime) {
      baseParams.fromBlock = startTime; // Can be a block number or timestamp
    }
    
    if (endTime) {
      baseParams.toBlock = endTime; // Can be a block number or timestamp
    }
    
    // Get outgoing transactions
    const data = await alchemy.core.getAssetTransfers({
      ...baseParams,
      fromAddress: address,
    });
    
    // Get incoming transactions
    const receivedData = await alchemy.core.getAssetTransfers({
      ...baseParams,
      toAddress: address,
    });
    
    return {
      sent: data.transfers,
      received: receivedData.transfers
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

// Get saved address annotations from localStorage
export const getSavedAnnotations = () => {
  try {
    const saved = localStorage.getItem('addressAnnotations');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Error loading saved annotations:', error);
    return {};
  }
};

// Save address annotation to localStorage
export const saveAddressAnnotation = (address, annotation) => {
  try {
    const annotations = getSavedAnnotations();
    annotations[address] = annotation;
    localStorage.setItem('addressAnnotations', JSON.stringify(annotations));
    return true;
  } catch (error) {
    console.error('Error saving annotation:', error);
    return false;
  }
};

// Save a search to localStorage
export const saveSearch = (address, searchName = '') => {
  try {
    const savedSearches = getSavedSearches();
    const currentDate = new Date().toISOString();
    
    // If searchName is empty, use date as name
    const name = searchName || `Search on ${new Date().toLocaleString()}`;
    
    savedSearches.push({
      id: Date.now(),  // Unique identifier
      name: name,
      address: address,
      date: currentDate
    });
    
    // Keep only the most recent 20 searches
    const limitedSearches = savedSearches.slice(-20);
    
    localStorage.setItem('savedSearches', JSON.stringify(limitedSearches));
    return true;
  } catch (error) {
    console.error('Error saving search:', error);
    return false;
  }
};

// Get saved searches from localStorage
export const getSavedSearches = () => {
  try {
    const saved = localStorage.getItem('savedSearches');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved searches:', error);
    return [];
  }
};

// Delete a saved search from localStorage
export const deleteSavedSearch = (searchId) => {
  try {
    const savedSearches = getSavedSearches();
    const updatedSearches = savedSearches.filter(search => search.id !== searchId);
    localStorage.setItem('savedSearches', JSON.stringify(updatedSearches));
    return true;
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return false;
  }
};

// Detect anomalies in transactions
export const detectAnomalies = (transactions, partner) => {
  const anomalies = {
    largeTransfers: [],
    unusualFrequency: false,
    irregularPattern: false,
    hasAnomalies: false
  };
  
  if (!transactions || transactions.length === 0) {
    return anomalies;
  }
  
  // Calculate statistics for anomaly detection
  let values = transactions.map(tx => parseFloat(tx.value));
  let timestamps = transactions
    .filter(tx => tx.timestamp)
    .map(tx => new Date(tx.timestamp).getTime());
  
  // Sort for calculations
  values.sort((a, b) => a - b);
  timestamps.sort((a, b) => a - b);
  
  // Calculate mean and standard deviation for transaction values
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Find large transfers (more than 2 standard deviations from the mean)
  // Only if we have enough data points and non-zero std deviation
  if (values.length >= 3 && stdDev > 0) {
    // Flag values more than 2 standard deviations above the mean as anomalies
    const threshold = mean + (2 * stdDev);
    
    // Tag transactions that exceed the threshold
    transactions.forEach(tx => {
      const value = parseFloat(tx.value);
      if (value > threshold) {
        anomalies.largeTransfers.push({
          txHash: tx.hash,
          value: value,
          ratio: (value - mean) / stdDev // How many std deviations from mean
        });
      }
    });
  }
  
  // Check for unusual frequency patterns if we have timestamp data
  if (timestamps.length >= 3) {
    // Calculate time intervals between transactions
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }
    
    // Calculate mean and standard deviation for intervals
    const intervalSum = intervals.reduce((a, b) => a + b, 0);
    const intervalMean = intervalSum / intervals.length;
    
    // Check for highly irregular intervals
    const intervalSquareDiffs = intervals.map(interval => Math.pow(interval - intervalMean, 2));
    const intervalVariance = intervalSquareDiffs.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalStdDev = Math.sqrt(intervalVariance);
    
    // Coefficient of variation (CV) - high values indicate irregular patterns
    const intervalCV = intervalStdDev / intervalMean;
    
    // If CV is high, this suggests irregular transaction timing
    if (intervalCV > 1.5) {
      anomalies.unusualFrequency = true;
    }
    
    // Check for unusual patterns like many small transactions followed by one large one
    // This could indicate a potential "build up and cash out" pattern
    const lastFewValues = values.slice(-3);
    if (lastFewValues.length > 0) {
      const lastValue = lastFewValues[lastFewValues.length - 1];
      const prevAvg = values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1);
      
      if (lastValue > prevAvg * 5 && values.length >= 4) {
        anomalies.irregularPattern = true;
      }
    }
  }
  
  // Determine if this partner has any anomalies
  anomalies.hasAnomalies = 
    anomalies.largeTransfers.length > 0 || 
    anomalies.unusualFrequency || 
    anomalies.irregularPattern;
  
  return anomalies;
};

// Process transactions to find unique EOAs that interacted with the address
export const processTransferPartners = (transactions) => {
  const { sent, received } = transactions;
  const transferPartners = {};
  const annotations = getSavedAnnotations();
  
  // Process outgoing transactions
  sent.forEach(tx => {
    const partnerAddress = tx.to;
    
    // Skip if the address is a contract (we don't have a direct way to check here)
    // Initialize or update the partner entry
    if (!transferPartners[partnerAddress]) {
      transferPartners[partnerAddress] = {
        address: partnerAddress,
        totalSent: 0,
        totalReceived: 0,
        transactions: [],
        annotation: annotations[partnerAddress] || ''
      };
    }
    
    // Add sent value
    transferPartners[partnerAddress].totalSent += parseFloat(tx.value);
    
    // Add transaction to the list
    transferPartners[partnerAddress].transactions.push({
      hash: tx.hash,
      blockNum: tx.blockNum,
      value: tx.value,
      asset: tx.asset,
      direction: 'sent',
      timestamp: tx.metadata?.blockTimestamp
    });
  });
  
  // Process incoming transactions
  received.forEach(tx => {
    const partnerAddress = tx.from;
    
    // Skip if the address is a contract (we don't have a direct way to check here)
    // Initialize or update the partner entry
    if (!transferPartners[partnerAddress]) {
      transferPartners[partnerAddress] = {
        address: partnerAddress,
        totalSent: 0,
        totalReceived: 0,
        transactions: [],
        annotation: annotations[partnerAddress] || ''
      };
    }
    
    // Add received value
    transferPartners[partnerAddress].totalReceived += parseFloat(tx.value);
    
    // Add transaction to the list
    transferPartners[partnerAddress].transactions.push({
      hash: tx.hash,
      blockNum: tx.blockNum,
      value: tx.value,
      asset: tx.asset,
      direction: 'received',
      timestamp: tx.metadata?.blockTimestamp
    });
  });
  
  // Detect anomalies for each partner
  Object.values(transferPartners).forEach(partner => {
    partner.anomalies = detectAnomalies(partner.transactions, partner);
  });
  
  // Convert to array and sort by total value (sent + received)
  return Object.values(transferPartners)
    .sort((a, b) => (b.totalSent + b.totalReceived) - (a.totalSent + a.totalReceived));
};