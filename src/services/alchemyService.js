// Import the SDK dynamically to avoid chunk loading issues
import * as alchemySdk from 'alchemy-sdk';
import { getEffectiveApiKey, isUsingDemoAPI, incrementDemoUsage, canUseDemoAPI } from './demoService';

const { Alchemy, Network } = alchemySdk;

// Configuration will be set from environment variable
let alchemy = null;
let currentApiKey = null;

// Initialize Alchemy SDK with API key (supports demo mode)
export const initializeAlchemy = (userApiKey = null, network = Network.ETH_MAINNET) => {
  const effectiveApiKey = getEffectiveApiKey(userApiKey);
  
  if (!effectiveApiKey) {
    console.error("No Alchemy API key available");
    throw new Error("Alchemy API key is required");
  }
  
  try {
    const settings = {
      apiKey: effectiveApiKey,
      network: network,
    };
    
    alchemy = new Alchemy(settings);
    currentApiKey = effectiveApiKey;
    
    console.log("Alchemy SDK initialized", {
      usingDemo: isUsingDemoAPI(effectiveApiKey),
      network: network
    });
    
    return alchemy;
  } catch (error) {
    console.error("Error initializing Alchemy SDK:", error);
    throw error;
  }
};

// Check if demo API usage is allowed
export const checkDemoUsage = () => {
  if (isUsingDemoAPI(currentApiKey)) {
    if (!canUseDemoAPI()) {
      throw new Error("Demo usage limit exceeded. Please provide your own API key or refresh the page.");
    }
    // Increment usage counter for demo API calls
    const usage = incrementDemoUsage();
    console.log("Demo API call used:", usage);
    return usage;
  }
  return null;
};

// Get transactions for a specific address with optional time range
export const getAddressTransactions = async (address, startTime = null, endTime = null) => {
  if (!alchemy) {
    throw new Error('Alchemy SDK not initialized. Please provide API key first.');
  }
  
  // Check demo usage limits
  checkDemoUsage();
  
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

// Save a search to localStorage with extended information
export const saveSearch = (address, searchName = '', options = {}) => {
  try {
    const savedSearches = getSavedSearches();
    const currentDate = new Date().toISOString();
    
    // If searchName is empty, use date as name
    const name = searchName || `Search on ${new Date().toLocaleString()}`;
    
    // Check if this address already exists in saved searches
    const existingSearchIndex = savedSearches.findIndex(search => 
      search.address.toLowerCase() === address.toLowerCase() && 
      search.timeFilter?.startBlock === options.timeFilter?.startBlock &&
      search.timeFilter?.endBlock === options.timeFilter?.endBlock
    );
    
    const searchData = {
      id: Date.now(),  // Unique identifier
      name: name,
      address: address,
      date: currentDate,
      timeFilter: options.timeFilter || null,
      visualizationMode: options.visualizationMode || 'standard',
      notes: options.notes || '',
      tags: options.tags || [],
      lastResults: options.lastResults || null
    };
    
    if (existingSearchIndex >= 0) {
      // Update existing search
      searchData.id = savedSearches[existingSearchIndex].id; // Preserve original ID
      savedSearches[existingSearchIndex] = searchData;
    } else {
      // Add new search
      savedSearches.push(searchData);
    }
    
    // Keep only the most recent 30 searches
    const limitedSearches = savedSearches.slice(-30);
    
    localStorage.setItem('savedSearches', JSON.stringify(limitedSearches));
    return true;
  } catch (error) {
    console.error('Error saving search:', error);
    return false;
  }
};

// Get saved searches from localStorage with optional filtering
export const getSavedSearches = (filters = {}) => {
  try {
    const saved = localStorage.getItem('savedSearches');
    let searches = saved ? JSON.parse(saved) : [];
    
    // Apply filters if provided
    if (filters) {
      // Filter by address
      if (filters.address) {
        searches = searches.filter(search => 
          search.address.toLowerCase().includes(filters.address.toLowerCase())
        );
      }
      
      // Filter by tag
      if (filters.tag) {
        searches = searches.filter(search => 
          search.tags && search.tags.includes(filters.tag)
        );
      }
      
      // Filter by name
      if (filters.name) {
        searches = searches.filter(search => 
          search.name.toLowerCase().includes(filters.name.toLowerCase())
        );
      }
      
      // Filter by date range
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        searches = searches.filter(search => new Date(search.date) >= fromDate);
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        searches = searches.filter(search => new Date(search.date) <= toDate);
      }
    }
    
    // Sort by date (newest first)
    searches.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return searches;
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

// Add tags to a saved search
export const addSearchTags = (searchId, tags = []) => {
  try {
    const savedSearches = getSavedSearches();
    const searchIndex = savedSearches.findIndex(search => search.id === searchId);
    
    if (searchIndex === -1) return false;
    
    // Get existing tags and add new ones without duplicates
    const existingTags = savedSearches[searchIndex].tags || [];
    const uniqueTags = [...new Set([...existingTags, ...tags])];
    
    savedSearches[searchIndex].tags = uniqueTags;
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
    return true;
  } catch (error) {
    console.error('Error adding tags to search:', error);
    return false;
  }
};

// Remove tags from a saved search
export const removeSearchTag = (searchId, tag) => {
  try {
    const savedSearches = getSavedSearches();
    const searchIndex = savedSearches.findIndex(search => search.id === searchId);
    
    if (searchIndex === -1) return false;
    
    // Filter out the tag to remove
    const updatedTags = (savedSearches[searchIndex].tags || []).filter(t => t !== tag);
    
    savedSearches[searchIndex].tags = updatedTags;
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
    return true;
  } catch (error) {
    console.error('Error removing tag from search:', error);
    return false;
  }
};

// Update saved search notes
export const updateSearchNotes = (searchId, notes) => {
  try {
    const savedSearches = getSavedSearches();
    const searchIndex = savedSearches.findIndex(search => search.id === searchId);
    
    if (searchIndex === -1) return false;
    
    savedSearches[searchIndex].notes = notes;
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
    return true;
  } catch (error) {
    console.error('Error updating search notes:', error);
    return false;
  }
};

// Get all unique tags from saved searches
export const getAllSearchTags = () => {
  try {
    const savedSearches = getSavedSearches();
    const allTags = savedSearches.reduce((tags, search) => {
      if (search.tags && Array.isArray(search.tags)) {
        return [...tags, ...search.tags];
      }
      return tags;
    }, []);
    
    // Return unique tags
    return [...new Set(allTags)];
  } catch (error) {
    console.error('Error getting all search tags:', error);
    return [];
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