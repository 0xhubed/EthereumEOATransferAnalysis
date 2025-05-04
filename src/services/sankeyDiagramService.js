/**
 * Service for processing blockchain transaction data into Sankey diagram format
 */

/**
 * Processes transaction data into a format suitable for Sankey diagrams
 * @param {Object} transactions - The transaction data from Alchemy API
 * @param {Array} transactions.sent - Transactions sent by the address
 * @param {Array} transactions.received - Transactions received by the address
 * @return {Object} - Data formatted for Sankey diagrams
 */
export const processTransactionsForSankey = (transactions) => {
  if (!transactions || (!transactions.sent && !transactions.received)) {
    return { nodes: [], links: [] };
  }

  const nodes = new Map();
  const links = new Map();
  
  // Add the main address as the central node
  const centralAddress = transactions.address || 'Central Address';
  nodes.set(centralAddress, { id: centralAddress, name: shortenAddress(centralAddress), value: 0 });
  
  // Process sent transactions
  if (transactions.sent && transactions.sent.length > 0) {
    transactions.sent.forEach(tx => {
      processTransaction(tx, centralAddress, tx.to, tx.value, nodes, links);
    });
  }
  
  // Process received transactions
  if (transactions.received && transactions.received.length > 0) {
    transactions.received.forEach(tx => {
      processTransaction(tx, tx.from, centralAddress, tx.value, nodes, links);
    });
  }
  
  return {
    nodes: Array.from(nodes.values()),
    links: Array.from(links.values())
  };
};

/**
 * Process a single transaction for the Sankey diagram
 * @param {Object} tx - The transaction
 * @param {string} source - Source address
 * @param {string} target - Target address
 * @param {string} value - Transaction value
 * @param {Map} nodes - Map of nodes
 * @param {Map} links - Map of links
 */
const processTransaction = (tx, source, target, value, nodes, links) => {
  const txValue = parseFloat(value) || 0;
  
  // Add source node if it doesn't exist
  if (!nodes.has(source)) {
    nodes.set(source, { 
      id: source, 
      name: shortenAddress(source),
      value: txValue 
    });
  } else {
    const node = nodes.get(source);
    node.value += txValue;
    nodes.set(source, node);
  }
  
  // Add target node if it doesn't exist
  if (!nodes.has(target)) {
    nodes.set(target, { 
      id: target, 
      name: shortenAddress(target),
      value: txValue 
    });
  } else {
    const node = nodes.get(target);
    node.value += txValue;
    nodes.set(target, node);
  }
  
  // Create a unique key for the link
  const linkKey = `${source}-${target}`;
  
  // Add or update the link
  if (!links.has(linkKey)) {
    links.set(linkKey, {
      source,
      target,
      value: txValue,
      count: 1
    });
  } else {
    const link = links.get(linkKey);
    link.value += txValue;
    link.count += 1;
    links.set(linkKey, link);
  }
};

/**
 * Groups transactions by time period for time-based Sankey diagrams
 * @param {Object} transactions - Transaction data
 * @param {string} period - Time period ('day', 'week', 'month')
 * @return {Object} - Grouped transaction data
 */
export const groupTransactionsByTimePeriod = (transactions, period = 'day') => {
  if (!transactions || (!transactions.sent && !transactions.received)) {
    return {};
  }

  const groupedData = {};
  
  // Helper function to get the period key
  const getPeriodKey = (timestamp) => {
    const date = new Date(timestamp * 1000);
    
    switch(period) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'day':
      default:
        return date.toISOString().split('T')[0];
    }
  };
  
  // Process sent transactions
  if (transactions.sent && transactions.sent.length > 0) {
    transactions.sent.forEach(tx => {
      const periodKey = getPeriodKey(tx.timeStamp);
      
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = { sent: [], received: [], address: transactions.address };
      }
      
      groupedData[periodKey].sent.push(tx);
    });
  }
  
  // Process received transactions
  if (transactions.received && transactions.received.length > 0) {
    transactions.received.forEach(tx => {
      const periodKey = getPeriodKey(tx.timeStamp);
      
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = { sent: [], received: [], address: transactions.address };
      }
      
      groupedData[periodKey].received.push(tx);
    });
  }
  
  return groupedData;
};

/**
 * Generates timeline data for Sankey diagrams showing evolution over time
 * @param {Object} transactions - Transaction data
 * @param {string} period - Time period ('day', 'week', 'month')
 * @return {Array} - Timeline data for Sankey diagrams
 */
export const generateTimelineSankeyData = (transactions, period = 'week') => {
  const groupedTransactions = groupTransactionsByTimePeriod(transactions, period);
  const timelineData = [];
  
  Object.keys(groupedTransactions).sort().forEach(periodKey => {
    const periodTransactions = groupedTransactions[periodKey];
    const sankeyData = processTransactionsForSankey(periodTransactions);
    
    timelineData.push({
      period: periodKey,
      sankeyData
    });
  });
  
  return timelineData;
};

/**
 * Shorten an Ethereum address for display purposes
 * @param {string} address - The Ethereum address
 * @return {string} - Shortened address
 */
export const shortenAddress = (address) => {
  if (!address || typeof address !== 'string') return 'Unknown';
  if (address === 'Central Address') return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Generate sample data for testing Sankey diagrams
 * @return {Object} - Sample data
 */
export const generateSampleSankeyData = () => {
  const nodes = [
    { id: 'address1', name: 'Address 1', value: 150 },
    { id: 'address2', name: 'Address 2', value: 100 },
    { id: 'address3', name: 'Address 3', value: 80 },
    { id: 'address4', name: 'Address 4', value: 70 },
    { id: 'address5', name: 'Address 5', value: 50 },
    { id: 'address6', name: 'Address 6', value: 40 },
    { id: 'address7', name: 'Address 7', value: 30 },
    { id: 'address8', name: 'Address 8', value: 20 },
  ];
  
  const links = [
    { source: 'address1', target: 'address2', value: 40, count: 2 },
    { source: 'address1', target: 'address3', value: 30, count: 1 },
    { source: 'address2', target: 'address4', value: 20, count: 1 },
    { source: 'address2', target: 'address5', value: 30, count: 2 },
    { source: 'address3', target: 'address6', value: 15, count: 1 },
    { source: 'address3', target: 'address7', value: 25, count: 1 },
    { source: 'address4', target: 'address8', value: 10, count: 1 },
    { source: 'address5', target: 'address8', value: 15, count: 1 },
    { source: 'address6', target: 'address8', value: 5, count: 1 },
    { source: 'address7', target: 'address8', value: 10, count: 1 },
  ];
  
  return { nodes, links };
};