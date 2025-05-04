/**
 * Tree Map Service
 * 
 * This service provides functions for processing blockchain data into
 * hierarchical structures suitable for tree map visualizations.
 */

/**
 * Process transaction data into a hierarchical tree map structure
 * 
 * @param {Object[]} transactions - Array of transaction objects
 * @param {string} groupBy - How to group the data (category, time, address, value)
 * @param {Object} options - Additional options for processing
 * @returns {Object} Hierarchical tree map data
 */
export const processTransactionsForTreeMap = (transactions, groupBy = 'address', options = {}) => {
  if (!transactions || transactions.length === 0) {
    return { name: 'No Data', children: [] };
  }

  const {
    maxDepth = 3,
    minValue = 0,
    dateFormat = 'month', // day, month, year
    timeRanges = null,
    includeDetails = true,
    valueThreshold = 0.01, // Values below 1% of total get grouped as "Other"
  } = options;

  // Root node
  const root = {
    name: options.rootName || 'Transactions',
    children: []
  };

  // Calculate total value for percentage calculations
  const totalValue = transactions.reduce((sum, tx) => sum + (parseFloat(tx.value) || 0), 0);
  
  switch (groupBy) {
    case 'address': {
      // Group by addresses first
      const addressMap = new Map();
      
      transactions.forEach(tx => {
        // Skip transactions below minimum value
        if (parseFloat(tx.value) < minValue) return;
        
        const from = tx.from || 'Unknown';
        const to = tx.to || 'Unknown';
        const value = parseFloat(tx.value) || 0;
        
        // Group by sender
        if (!addressMap.has(from)) {
          addressMap.set(from, {
            name: from,
            children: [],
            totalSent: 0,
            details: 'Sending address'
          });
        }
        
        const fromNode = addressMap.get(from);
        fromNode.totalSent += value;
        
        // Add recipient as a child of sender
        let recipientExists = fromNode.children.find(child => child.name === to);
        
        if (!recipientExists) {
          recipientExists = {
            name: to,
            value: 0,
            address: to,
            details: includeDetails ? `Recipient of ${fromNode.name}` : undefined
          };
          fromNode.children.push(recipientExists);
        }
        
        recipientExists.value += value;
      });
      
      // Convert map to array and sort by total sent
      let addressArray = Array.from(addressMap.values())
        .sort((a, b) => b.totalSent - a.totalSent);
      
      // Set values for parent nodes
      addressArray.forEach(node => {
        node.value = node.totalSent;
        delete node.totalSent;
      });
      
      // Apply value threshold by grouping small values
      const thresholdValue = totalValue * valueThreshold;
      const significantAddresses = [];
      const smallAddresses = [];
      
      addressArray.forEach(address => {
        if (address.value >= thresholdValue) {
          significantAddresses.push(address);
        } else {
          smallAddresses.push(address);
        }
      });
      
      // If we have small addresses, group them
      if (smallAddresses.length > 0) {
        const otherGroup = {
          name: 'Other Addresses',
          value: smallAddresses.reduce((sum, addr) => sum + addr.value, 0),
          children: smallAddresses
        };
        significantAddresses.push(otherGroup);
      }
      
      root.children = significantAddresses;
      break;
    }
    
    case 'time': {
      // Group by time period
      const timeMap = new Map();
      
      transactions.forEach(tx => {
        if (!tx.timestamp || parseFloat(tx.value) < minValue) return;
        
        let timeKey = 'Unknown Date';
        const timestamp = new Date(tx.timestamp);
        
        if (!isNaN(timestamp.getTime())) {
          switch(dateFormat) {
            case 'day':
              timeKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
              break;
            case 'month':
              timeKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
              break;
            case 'year':
              timeKey = `${timestamp.getFullYear()}`; // YYYY
              break;
          }
        }
        
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, {
            name: timeKey,
            children: [],
            totalValue: 0
          });
        }
        
        const periodNode = timeMap.get(timeKey);
        const value = parseFloat(tx.value) || 0;
        periodNode.totalValue += value;
        
        // Add transaction to this time period
        const txNode = {
          name: tx.hash ? tx.hash.substring(0, 10) + '...' : 'Tx',
          value: value,
          details: includeDetails ? `From: ${tx.from}\nTo: ${tx.to}\nValue: ${tx.value}` : undefined
        };
        
        periodNode.children.push(txNode);
      });
      
      // Convert map to array and sort chronologically
      let timeArray = Array.from(timeMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // Set values for parent nodes
      timeArray.forEach(node => {
        node.value = node.totalValue;
        delete node.totalValue;
      });
      
      root.children = timeArray;
      break;
    }
    
    case 'value': {
      // Group by value ranges
      const ranges = [
        { name: 'Very Small (<0.01)', max: 0.01 },
        { name: 'Small (0.01-0.1)', min: 0.01, max: 0.1 },
        { name: 'Medium (0.1-1.0)', min: 0.1, max: 1.0 },
        { name: 'Large (1.0-10.0)', min: 1.0, max: 10.0 },
        { name: 'Very Large (>10.0)', min: 10.0 }
      ];
      
      // Create nodes for each range
      const rangeNodes = ranges.map(range => ({
        name: range.name,
        min: range.min,
        max: range.max,
        children: [],
        totalValue: 0
      }));
      
      // Assign transactions to value ranges
      transactions.forEach(tx => {
        const value = parseFloat(tx.value) || 0;
        if (value < minValue) return;
        
        // Find the appropriate range
        const range = rangeNodes.find(r => 
          (r.min === undefined || value >= r.min) && 
          (r.max === undefined || value < r.max)
        );
        
        if (range) {
          range.totalValue += value;
          
          // Add transaction to this range
          const txNode = {
            name: tx.hash ? tx.hash.substring(0, 10) + '...' : 'Tx',
            value: value,
            details: includeDetails ? `From: ${tx.from}\nTo: ${tx.to}` : undefined
          };
          
          range.children.push(txNode);
        }
      });
      
      // Set values for parent nodes and remove empty ranges
      const nonEmptyRanges = rangeNodes
        .filter(node => node.children.length > 0)
        .map(node => {
          node.value = node.totalValue;
          delete node.min;
          delete node.max;
          delete node.totalValue;
          return node;
        });
      
      root.children = nonEmptyRanges;
      break;
    }
    
    case 'category': {
      // Attempt to categorize transactions by their purpose
      const categories = [
        { name: 'Token Transfers', matcher: tx => tx.tokenSymbol || tx.tokenName },
        { name: 'Contract Interactions', matcher: tx => tx.input && tx.input !== '0x' },
        { name: 'ETH Transfers', matcher: tx => (!tx.input || tx.input === '0x') && !tx.tokenSymbol }
      ];
      
      // Create nodes for each category
      const categoryNodes = categories.map(cat => ({
        name: cat.name,
        matcher: cat.matcher,
        children: [],
        totalValue: 0
      }));
      
      // Categorize transactions
      transactions.forEach(tx => {
        const value = parseFloat(tx.value) || 0;
        if (value < minValue) return;
        
        // Find the appropriate category
        const category = categoryNodes.find(c => c.matcher(tx));
        
        if (category) {
          category.totalValue += value;
          
          // Add transaction to this category
          const txNode = {
            name: tx.hash ? tx.hash.substring(0, 10) + '...' : 'Tx',
            value: value,
            details: includeDetails ? `From: ${tx.from}\nTo: ${tx.to}` : undefined
          };
          
          category.children.push(txNode);
        }
      });
      
      // Set values for parent nodes and remove categories with no transactions
      const nonEmptyCategories = categoryNodes
        .filter(node => node.children.length > 0)
        .map(node => {
          node.value = node.totalValue;
          delete node.matcher;
          delete node.totalValue;
          return node;
        });
      
      root.children = nonEmptyCategories;
      break;
    }
  }
  
  // Clean up the tree to ensure it's properly formatted
  cleanupTree(root, maxDepth, 1);
  
  return root;
};

/**
 * Clean up the tree to ensure it's properly formatted for D3 treemap
 */
const cleanupTree = (node, maxDepth, currentDepth) => {
  // Base case: we've reached max depth or a leaf node
  if (currentDepth >= maxDepth || !node.children || node.children.length === 0) {
    // Ensure leaf nodes have a value
    if (!node.value && node.children) {
      node.value = node.children.reduce((sum, child) => sum + (child.value || 0), 0);
    }
    
    // Remove empty children arrays from leaf nodes
    if (node.children && node.children.length === 0) {
      delete node.children;
    }
    
    return;
  }
  
  // Process children recursively
  node.children.forEach(child => cleanupTree(child, maxDepth, currentDepth + 1));
  
  // After processing children, calculate this node's value if not already set
  if (!node.value) {
    node.value = node.children.reduce((sum, child) => sum + (child.value || 0), 0);
  }
};

/**
 * Generate sample tree map data for testing
 */
export const generateSampleTreeMapData = () => {
  return {
    name: "Blockchain Transactions",
    children: [
      {
        name: "Exchange Wallets",
        children: [
          { name: "Binance", value: 5000, address: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE" },
          { name: "Coinbase", value: 3500, address: "0x71660c4005BA85c37ccec55d0C4493E66Fe775d3" },
          { name: "Kraken", value: 2800, address: "0x2910543Af39abA0Cd09dBb2D50200b3E800A63D2" }
        ]
      },
      {
        name: "DeFi Protocols",
        children: [
          { 
            name: "Uniswap", 
            value: 4200,
            children: [
              { name: "Liquidity Pools", value: 2500 },
              { name: "Swaps", value: 1700 }
            ]
          },
          { name: "Aave", value: 3100, address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9" },
          { name: "Compound", value: 2700, address: "0xc00e94Cb662C3520282E6f5717214004A7f26888" }
        ]
      },
      {
        name: "NFT Marketplaces",
        children: [
          { name: "OpenSea", value: 3800, address: "0x7Be8076f4EA4A4AD08075C2508e481d6C946D12b" },
          { name: "Rarible", value: 2200, address: "0xB66a603f4cFe17e3D27B87a8BfCaD319856518B8" }
        ]
      },
      {
        name: "Individual Wallets",
        children: [
          { name: "Wallet 1", value: 1500, address: "0x1234567890123456789012345678901234567890" },
          { name: "Wallet 2", value: 2100, address: "0x2345678901234567890123456789012345678901" },
          { name: "Wallet 3", value: 900, address: "0x3456789012345678901234567890123456789012" },
          { name: "Wallet 4", value: 1200, address: "0x4567890123456789012345678901234567890123" },
          { name: "Wallet 5", value: 800, address: "0x5678901234567890123456789012345678901234" }
        ]
      }
    ]
  };
};

/**
 * Process contract interaction data into a tree map structure
 */
export const processContractInteractionsForTreeMap = (contractData, options = {}) => {
  if (!contractData || !contractData.interactions || contractData.interactions.length === 0) {
    return { name: 'No Data', children: [] };
  }

  const {
    maxDepth = 3,
    minInteractions = 0,
    includeDetails = true,
  } = options;

  // Root node
  const root = {
    name: options.rootName || contractData.address || 'Contract',
    children: []
  };

  // Group by methods
  const methodMap = new Map();
  
  contractData.interactions.forEach(interaction => {
    if (!interaction.method) return;
    
    const methodName = interaction.method;
    
    if (!methodMap.has(methodName)) {
      methodMap.set(methodName, {
        name: methodName,
        children: [],
        count: 0
      });
    }
    
    const methodNode = methodMap.get(methodName);
    methodNode.count += 1;
    
    // Add calling address as a child
    if (interaction.from) {
      let callerExists = methodNode.children.find(child => child.name === interaction.from);
      
      if (!callerExists) {
        callerExists = {
          name: interaction.from,
          value: 0,
          address: interaction.from,
          details: includeDetails ? `Caller of ${methodName}` : undefined
        };
        methodNode.children.push(callerExists);
      }
      
      callerExists.value += 1;
    }
  });
  
  // Convert map to array and sort by count
  let methodArray = Array.from(methodMap.values())
    .filter(method => method.count >= minInteractions)
    .sort((a, b) => b.count - a.count);
  
  // Set values for parent nodes
  methodArray.forEach(node => {
    node.value = node.count;
    delete node.count;
  });
  
  root.children = methodArray;
  
  // Clean up the tree to ensure it's properly formatted
  cleanupTree(root, maxDepth, 1);
  
  return root;
};

/**
 * Convert raw transfer data to tree map format
 */
export const processTransfersForTreeMap = (transfers, options = {}) => {
  if (!transfers || transfers.length === 0) {
    return { name: 'No Data', children: [] };
  }

  return processTransactionsForTreeMap(transfers.map(transfer => ({
    from: transfer.from,
    to: transfer.to,
    value: transfer.value || transfer.amount || 0,
    timestamp: transfer.timestamp || transfer.date,
    hash: transfer.hash || transfer.id
  })), options.groupBy || 'address', options);
};

export default {
  processTransactionsForTreeMap,
  processContractInteractionsForTreeMap,
  processTransfersForTreeMap,
  generateSampleTreeMapData
};