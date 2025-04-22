import { Alchemy, Network } from 'alchemy-sdk';

// Configuration will be set from environment variable
let alchemy = null;

// Initialize Alchemy SDK with API key
export const initializeAlchemy = (apiKey = process.env.REACT_APP_ALCHEMY_API_KEY, network = Network.ETH_MAINNET) => {
  const settings = {
    apiKey: apiKey,
    network: network,
  };
  
  alchemy = new Alchemy(settings);
  return alchemy;
};

// Get transactions for a specific address
export const getAddressTransactions = async (address) => {
  if (!alchemy) {
    throw new Error('Alchemy SDK not initialized. Please provide API key first.');
  }
  
  try {
    // Get all transactions for the address
    const data = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ["external"],
      excludeZeroValue: true,
    });
    
    // Also get incoming transactions
    const receivedData = await alchemy.core.getAssetTransfers({
      toAddress: address,
      category: ["external"],
      excludeZeroValue: true,
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

// Process transactions to find unique EOAs that interacted with the address
export const processTransferPartners = (transactions) => {
  const { sent, received } = transactions;
  const transferPartners = {};
  
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
        transactions: []
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
        transactions: []
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
  
  // Convert to array and sort by total value (sent + received)
  return Object.values(transferPartners)
    .sort((a, b) => (b.totalSent + b.totalReceived) - (a.totalSent + a.totalReceived));
};