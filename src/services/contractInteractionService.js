/**
 * Contract Interaction Analysis Service
 * Analyzes how addresses interact with smart contracts on the blockchain
 */

/**
 * Analyzes interactions between an address and smart contracts
 * @param {Object} alchemy - Initialized Alchemy SDK instance
 * @param {String} address - The address to analyze
 * @param {Number} maxCount - Maximum number of transactions to analyze
 * @returns {Promise<Object>} Object containing contract interaction data
 */
export const getContractInteractions = async (alchemy, address, maxCount = 1000) => {
  if (!alchemy) {
    throw new Error('Alchemy SDK not initialized. Please provide API key first.');
  }
  
  try {
    // Get both internal and external transactions
    const params = {
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      excludeZeroValue: false, // Include zero-value transactions as they can be contract calls
      withMetadata: true,
      maxCount: maxCount,
      fromAddress: address
    };
    
    // Get transactions sent to contracts
    const outgoingData = await alchemy.core.getAssetTransfers(params);
    
    // Get transactions received from contracts
    const incomingParams = {
      ...params,
      fromAddress: undefined,
      toAddress: address
    };
    const incomingData = await alchemy.core.getAssetTransfers(incomingParams);
    
    // Filter for just contract interactions
    const contractInteractions = await filterContractInteractions(alchemy, outgoingData.transfers, incomingData.transfers);
    
    // Analyze the contract interactions
    const analysis = analyzeContractInteractions(contractInteractions);
    
    return {
      contractInteractions,
      analysis
    };
  } catch (error) {
    console.error('Error fetching contract interactions:', error);
    throw error;
  }
};

/**
 * Filters transactions to only include those involving smart contracts
 * @param {Object} alchemy - Initialized Alchemy SDK instance
 * @param {Array} outgoing - Outgoing transactions
 * @param {Array} incoming - Incoming transactions
 * @returns {Promise<Object>} Filtered contract interactions
 */
const filterContractInteractions = async (alchemy, outgoing, incoming) => {
  // Store confirmed contract addresses to reduce API calls
  const addressCache = {};
  const contractInteractions = {
    outgoing: [],
    incoming: []
  };
  
  // Helper function to check if an address is a contract
  const isContract = async (address) => {
    if (addressCache[address] !== undefined) {
      return addressCache[address];
    }
    
    try {
      const code = await alchemy.core.getCode(address);
      // If code length is greater than '0x', it's a contract
      const isContractAddress = code !== '0x';
      addressCache[address] = isContractAddress;
      return isContractAddress;
    } catch (error) {
      console.error(`Error checking if ${address} is a contract:`, error);
      return false;
    }
  };
  
  // Filter outgoing transactions to contracts
  for (const tx of outgoing) {
    if (await isContract(tx.to)) {
      contractInteractions.outgoing.push({
        ...tx,
        direction: 'outgoing',
        contractAddress: tx.to
      });
    }
  }
  
  // Filter incoming transactions from contracts
  for (const tx of incoming) {
    if (await isContract(tx.from)) {
      contractInteractions.incoming.push({
        ...tx,
        direction: 'incoming',
        contractAddress: tx.from
      });
    }
  }
  
  return contractInteractions;
};

/**
 * Categorizes contract interactions by type (token transfer, NFT, DeFi, etc.)
 * @param {Array} transactions - Contract interaction transactions
 * @returns {String} The interaction category
 */
const categorizeInteraction = (transaction) => {
  // Check the transaction category from Alchemy
  const category = transaction.category?.toLowerCase();
  
  if (category === 'erc20') {
    return 'Token Transfer';
  } else if (category === 'erc721' || category === 'erc1155') {
    return 'NFT Transfer';
  } else if (transaction.value === '0') {
    return 'Contract Call'; // Likely a state-changing function call
  } else {
    return 'ETH Transfer'; // Regular ETH transfer to contract
  }
};

/**
 * Analyzes contract interactions to identify patterns
 * @param {Object} contractInteractions - Filtered contract interactions
 * @returns {Object} Analysis results
 */
const analyzeContractInteractions = (contractInteractions) => {
  const { outgoing, incoming } = contractInteractions;
  const allInteractions = [...outgoing, ...incoming];
  
  // Skip analysis if no contract interactions
  if (allInteractions.length === 0) {
    return {
      totalInteractions: 0,
      contractsSummary: [],
      categories: {},
      mostUsedContracts: [],
      interactionFrequency: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      recentTrends: []
    };
  }
  
  // Categorize interactions by contract address
  const contractMap = {};
  
  allInteractions.forEach(tx => {
    const contractAddress = tx.contractAddress;
    if (!contractMap[contractAddress]) {
      contractMap[contractAddress] = {
        address: contractAddress,
        name: tx.asset || 'Unknown',
        interactionCount: 0,
        lastInteraction: null,
        firstInteraction: null,
        totalValueSent: 0,
        totalValueReceived: 0,
        categories: {}
      };
    }
    
    const contract = contractMap[contractAddress];
    contract.interactionCount++;
    
    // Track first and last interaction
    const timestamp = tx.metadata?.blockTimestamp 
      ? new Date(tx.metadata.blockTimestamp)
      : null;
      
    if (timestamp) {
      if (!contract.firstInteraction || timestamp < contract.firstInteraction) {
        contract.firstInteraction = timestamp;
      }
      
      if (!contract.lastInteraction || timestamp > contract.lastInteraction) {
        contract.lastInteraction = timestamp;
      }
    }
    
    // Track values
    const value = parseFloat(tx.value) || 0;
    if (tx.direction === 'outgoing') {
      contract.totalValueSent += value;
    } else {
      contract.totalValueReceived += value;
    }
    
    // Categorize interaction
    const category = categorizeInteraction(tx);
    contract.categories[category] = (contract.categories[category] || 0) + 1;
  });
  
  // Convert to array and sort by interaction count
  const contractsSummary = Object.values(contractMap)
    .sort((a, b) => b.interactionCount - a.interactionCount);
  
  // Get top 5 most used contracts
  const mostUsedContracts = contractsSummary.slice(0, 5).map(c => ({
    address: c.address,
    name: c.name,
    interactionCount: c.interactionCount
  }));
  
  // Calculate category distribution
  const categories = {};
  allInteractions.forEach(tx => {
    const category = categorizeInteraction(tx);
    categories[category] = (categories[category] || 0) + 1;
  });
  
  // Calculate interaction frequency
  const now = new Date();
  const dayAgo = new Date(now - 24*60*60*1000);
  const weekAgo = new Date(now - 7*24*60*60*1000);
  const monthAgo = new Date(now - 30*24*60*60*1000);
  
  const interactionFrequency = {
    daily: allInteractions.filter(tx => 
      tx.metadata?.blockTimestamp && new Date(tx.metadata.blockTimestamp) > dayAgo
    ).length,
    weekly: allInteractions.filter(tx => 
      tx.metadata?.blockTimestamp && new Date(tx.metadata.blockTimestamp) > weekAgo
    ).length,
    monthly: allInteractions.filter(tx => 
      tx.metadata?.blockTimestamp && new Date(tx.metadata.blockTimestamp) > monthAgo
    ).length
  };
  
  // Identify recent trends (e.g., increasing usage of specific contracts)
  const recentTrends = [];
  
  // Look for contracts with increasing activity
  contractsSummary.forEach(contract => {
    // Skip contracts with few interactions
    if (contract.interactionCount < 3) return;
    
    // Check if interactions have been recent
    const recentInteractions = allInteractions.filter(tx => 
      tx.contractAddress === contract.address && 
      tx.metadata?.blockTimestamp && 
      new Date(tx.metadata.blockTimestamp) > weekAgo
    ).length;
    
    // If more than 50% of interactions were in the last week, it's a trend
    if (recentInteractions > contract.interactionCount * 0.5) {
      recentTrends.push({
        contract: contract.address,
        name: contract.name,
        trend: "Increasing activity",
        recentInteractions,
        totalInteractions: contract.interactionCount
      });
    }
  });
  
  return {
    totalInteractions: allInteractions.length,
    uniqueContracts: contractsSummary.length,
    contractsSummary,
    categories,
    mostUsedContracts,
    interactionFrequency,
    recentTrends
  };
};

/**
 * Gets detailed information about a specific contract
 * @param {Object} alchemy - Initialized Alchemy SDK instance
 * @param {String} contractAddress - The contract's address
 * @returns {Promise<Object>} Detailed contract information
 */
export const getContractDetails = async (alchemy, contractAddress) => {
  try {
    // Get contract metadata
    const metadata = await alchemy.core.getTokenMetadata(contractAddress)
      .catch(() => ({ name: "Unknown Contract", symbol: "UNKNOWN", decimals: 18 }));
    
    // Get contract code
    const bytecode = await alchemy.core.getCode(contractAddress);
    
    // Check if verified on Etherscan (simplified check - would need Etherscan API for complete version)
    const isVerified = bytecode !== '0x' && bytecode.length > 2;
    
    return {
      address: contractAddress,
      name: metadata.name || "Unknown Contract",
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      isContract: bytecode !== '0x',
      isVerified,
      bytecodeLength: bytecode.length
    };
  } catch (error) {
    console.error('Error fetching contract details:', error);
    return {
      address: contractAddress,
      name: "Error fetching details",
      isContract: false,
      isVerified: false
    };
  }
};