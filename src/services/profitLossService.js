/**
 * Profit/Loss Analysis Service
 * 
 * This service provides functions for calculating profit, loss, and ROI
 * for Ethereum wallets and transactions.
 */

// Mock API for price history fetching
// In a production app, you would replace this with a real API 
// like CoinGecko, CryptoCompare, or similar
const mockPriceHistory = {
  // Simplified daily prices for 2023-2024 (USD per ETH)
  "2023-01-01": 1200.00,
  "2023-02-01": 1600.50,
  "2023-03-01": 1750.25,
  "2023-04-01": 1820.75,
  "2023-05-01": 1910.30,
  "2023-06-01": 1850.15,
  "2023-07-01": 1920.80,
  "2023-08-01": 1780.45,
  "2023-09-01": 1650.20,
  "2023-10-01": 1580.90,
  "2023-11-01": 1930.40,
  "2023-12-01": 2080.75,
  "2024-01-01": 2250.60,
  "2024-02-01": 2340.80,
  "2024-03-01": 3100.25,
  "2024-04-01": 3400.50,
  "2024-05-01": 3600.25,
  "2024-06-01": 3750.10,
};

/**
 * Get the historical ETH price for a given date
 * 
 * @param {string|Date} date - Date to get price for
 * @returns {number} Price in USD
 */
export const getHistoricalPrice = async (date) => {
  if (!date) return null;
  
  // Format date to YYYY-MM-DD
  const dateStr = typeof date === 'string' 
    ? new Date(date).toISOString().split('T')[0]
    : date.toISOString().split('T')[0];
  
  // In a real implementation, we would fetch from an API:
  // const response = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/history?date=${dateStr}`);
  // const data = await response.json();
  // return data.market_data.current_price.usd;
  
  // For simplicity, we'll use the mockPriceHistory
  // Find the closest date in our mock data
  const dates = Object.keys(mockPriceHistory).sort();
  
  // If date is before our earliest data, use earliest price
  if (dateStr < dates[0]) {
    return mockPriceHistory[dates[0]];
  }
  
  // If date is after our latest data, use latest price
  if (dateStr > dates[dates.length - 1]) {
    return mockPriceHistory[dates[dates.length - 1]];
  }
  
  // Find exact match or closest previous date
  let closestDate = dates[0];
  for (const d of dates) {
    if (d <= dateStr) {
      closestDate = d;
    } else {
      break;
    }
  }
  
  return mockPriceHistory[closestDate];
};

/**
 * Calculate the profit/loss for a given transaction
 * 
 * @param {Object} transaction - Transaction object
 * @param {number} currentPrice - Current ETH price in USD
 * @returns {Object} Transaction with profit/loss data
 */
export const calculateTransactionProfitLoss = async (transaction, currentPrice = 3500) => {
  if (!transaction) return null;
  
  const transactionType = transaction.from === transaction.address ? 'outgoing' : 'incoming';
  const value = parseFloat(transaction.value) || 0;
  
  // Get price at transaction time
  const historicalPrice = await getHistoricalPrice(transaction.timeStamp * 1000); // Convert to milliseconds
  
  if (!historicalPrice) {
    return {
      ...transaction,
      transactionType,
      historicalPrice: null,
      currentPrice,
      currentValue: value * currentPrice,
      profitLoss: null,
      profitLossPercentage: null,
      roiDaily: null,
      roiAnnualized: null
    };
  }
  
  const historicalValue = value * historicalPrice;
  const currentValue = value * currentPrice;
  
  // Calculate profit/loss
  let profitLoss = 0;
  let profitLossPercentage = 0;
  let roiDaily = 0;
  let roiAnnualized = 0;
  
  if (transactionType === 'incoming') {
    // For received ETH, calculate how much it's worth now vs then
    profitLoss = currentValue - historicalValue;
    profitLossPercentage = (profitLoss / historicalValue) * 100;
    
    // Calculate days held
    const transactionDate = new Date(transaction.timeStamp * 1000);
    const now = new Date();
    const daysHeld = (now - transactionDate) / (1000 * 60 * 60 * 24);
    
    if (daysHeld > 0) {
      roiDaily = profitLossPercentage / daysHeld;
      roiAnnualized = roiDaily * 365;
    }
  } else {
    // For sent ETH, calculate how much it would be worth if still held
    profitLoss = historicalValue - currentValue;
    profitLossPercentage = (profitLoss / historicalValue) * 100;
    
    // Since it's sent, we don't calculate ROI
    roiDaily = null;
    roiAnnualized = null;
  }
  
  return {
    ...transaction,
    transactionType,
    historicalPrice,
    historicalValue,
    currentPrice,
    currentValue,
    profitLoss,
    profitLossPercentage,
    roiDaily,
    roiAnnualized
  };
};

/**
 * Analyze profit/loss for an address's transactions
 * 
 * @param {Object[]} transactions - Array of transactions
 * @param {string} address - The address to analyze
 * @param {number} currentPrice - Current ETH price in USD
 * @returns {Object} Analysis results
 */
export const analyzeProfitLoss = async (transactions, address, currentPrice = 3500) => {
  if (!transactions || !address) {
    return {
      totalReceived: 0,
      totalSent: 0,
      netBalance: 0,
      totalProfitLoss: 0,
      averageROI: 0,
      bestTransaction: null,
      worstTransaction: null,
      transactionsWithPL: [],
      totalInvestment: 0,
      currentPortfolioValue: 0,
      overallROI: 0
    };
  }
  
  // Filter transactions for this address
  const relevantTransactions = transactions.filter(tx => 
    tx.from === address || tx.to === address
  );
  
  if (relevantTransactions.length === 0) {
    return {
      totalReceived: 0,
      totalSent: 0,
      netBalance: 0,
      totalProfitLoss: 0,
      averageROI: 0,
      bestTransaction: null,
      worstTransaction: null,
      transactionsWithPL: [],
      totalInvestment: 0,
      currentPortfolioValue: 0,
      overallROI: 0
    };
  }
  
  // Calculate profit/loss for each transaction
  const transactionsWithPL = [];
  for (const tx of relevantTransactions) {
    const txWithPL = await calculateTransactionProfitLoss({
      ...tx,
      address
    }, currentPrice);
    
    transactionsWithPL.push(txWithPL);
  }
  
  // Calculate totals
  let totalReceived = 0;
  let totalSent = 0;
  let totalReceivedHistorical = 0;
  let totalSentHistorical = 0;
  let totalReceivedCurrent = 0;
  let totalSentCurrent = 0;
  let totalProfitLoss = 0;
  let totalROI = 0;
  let countWithROI = 0;
  
  for (const tx of transactionsWithPL) {
    const value = parseFloat(tx.value) || 0;
    
    if (tx.transactionType === 'incoming') {
      totalReceived += value;
      totalReceivedHistorical += tx.historicalValue || 0;
      totalReceivedCurrent += tx.currentValue || 0;
      totalProfitLoss += tx.profitLoss || 0;
      
      if (tx.roiAnnualized !== null) {
        totalROI += tx.roiAnnualized;
        countWithROI++;
      }
    } else {
      totalSent += value;
      totalSentHistorical += tx.historicalValue || 0;
      totalSentCurrent += tx.currentValue || 0;
    }
  }
  
  // Calculate remaining balance
  const netBalance = totalReceived - totalSent;
  
  // Find best and worst transactions
  let bestTransaction = null;
  let worstTransaction = null;
  
  if (transactionsWithPL.length > 0) {
    // Only consider incoming transactions for best/worst analysis
    const incomingTransactions = transactionsWithPL.filter(tx => tx.transactionType === 'incoming');
    
    if (incomingTransactions.length > 0) {
      bestTransaction = incomingTransactions.reduce((best, current) => {
        return (current.profitLossPercentage > (best?.profitLossPercentage || -Infinity)) ? current : best;
      }, null);
      
      worstTransaction = incomingTransactions.reduce((worst, current) => {
        return (current.profitLossPercentage < (worst?.profitLossPercentage || Infinity)) ? current : worst;
      }, null);
    }
  }
  
  // Calculate average ROI
  const averageROI = countWithROI > 0 ? totalROI / countWithROI : 0;
  
  // Calculate overall ROI
  const totalInvestment = totalReceivedHistorical;
  const currentPortfolioValue = netBalance * currentPrice;
  const overallROI = totalInvestment > 0 ? ((currentPortfolioValue - totalInvestment) / totalInvestment) * 100 : 0;
  
  return {
    totalReceived,
    totalSent,
    netBalance,
    totalProfitLoss,
    averageROI,
    bestTransaction,
    worstTransaction,
    transactionsWithPL,
    totalInvestment,
    currentPortfolioValue,
    overallROI
  };
};

/**
 * Generate time-series data for portfolio value
 * 
 * @param {Object[]} transactions - Transactions with profit/loss data
 * @param {string} address - The address to analyze
 * @param {number} currentPrice - Current ETH price in USD
 * @returns {Object[]} Time-series data points
 */
export const generatePortfolioTimeSeries = async (transactions, address, currentPrice = 3500) => {
  if (!transactions || !address) {
    return [];
  }
  
  // Filter transactions for this address and sort by timestamp
  const relevantTransactions = transactions
    .filter(tx => tx.from === address || tx.to === address)
    .sort((a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp));
  
  if (relevantTransactions.length === 0) {
    return [];
  }
  
  // Initialize data
  const timeSeriesData = [];
  let cumulativeBalance = 0;
  let cumulativeValue = 0;
  let cumulativeCost = 0;
  
  // Create a data point for each transaction
  for (const tx of relevantTransactions) {
    const value = parseFloat(tx.value) || 0;
    const timestamp = parseInt(tx.timeStamp) * 1000; // Convert to milliseconds
    const date = new Date(timestamp);
    const price = await getHistoricalPrice(date);
    
    if (tx.from === address) {
      // Outgoing transaction
      cumulativeBalance -= value;
    } else {
      // Incoming transaction
      cumulativeBalance += value;
      cumulativeCost += value * price;
    }
    
    const pointValue = cumulativeBalance * price;
    cumulativeValue = pointValue;
    
    const profitLoss = cumulativeValue - cumulativeCost;
    const roi = cumulativeCost > 0 ? (profitLoss / cumulativeCost) * 100 : 0;
    
    timeSeriesData.push({
      timestamp,
      date: date.toISOString(),
      ethBalance: cumulativeBalance,
      ethPrice: price,
      portfolioValue: pointValue,
      cumulativeCost,
      profitLoss,
      roi
    });
  }
  
  // Add current value as final data point
  if (timeSeriesData.length > 0) {
    const lastPoint = { ...timeSeriesData[timeSeriesData.length - 1] };
    const now = new Date();
    
    lastPoint.timestamp = now.getTime();
    lastPoint.date = now.toISOString();
    lastPoint.ethPrice = currentPrice;
    lastPoint.portfolioValue = lastPoint.ethBalance * currentPrice;
    lastPoint.profitLoss = lastPoint.portfolioValue - lastPoint.cumulativeCost;
    lastPoint.roi = lastPoint.cumulativeCost > 0 ? (lastPoint.profitLoss / lastPoint.cumulativeCost) * 100 : 0;
    
    timeSeriesData.push(lastPoint);
  }
  
  return timeSeriesData;
};

/**
 * Calculate daily/monthly portfolio values for charting
 * 
 * @param {Object[]} timeSeriesData - Transaction time series data
 * @returns {Object} Aggregated time-series data
 */
export const aggregatePortfolioTimeSeries = (timeSeriesData) => {
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return {
      daily: [],
      monthly: []
    };
  }
  
  const dailyData = [];
  const monthlyData = [];
  
  // Group by day
  const dailyMap = new Map();
  timeSeriesData.forEach(point => {
    const date = new Date(point.timestamp);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Keep the latest point for each day
    dailyMap.set(dayKey, point);
  });
  
  // Sort daily data
  dailyMap.forEach((point, day) => {
    dailyData.push({
      date: day,
      timestamp: point.timestamp,
      value: point.portfolioValue,
      balance: point.ethBalance,
      price: point.ethPrice,
      profitLoss: point.profitLoss,
      roi: point.roi
    });
  });
  dailyData.sort((a, b) => a.timestamp - b.timestamp);
  
  // Group by month
  const monthlyMap = new Map();
  timeSeriesData.forEach(point => {
    const date = new Date(point.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    
    // Keep the latest point for each month
    monthlyMap.set(monthKey, point);
  });
  
  // Sort monthly data
  monthlyMap.forEach((point, month) => {
    monthlyData.push({
      date: month,
      timestamp: point.timestamp,
      value: point.portfolioValue,
      balance: point.ethBalance,
      price: point.ethPrice,
      profitLoss: point.profitLoss,
      roi: point.roi
    });
  });
  monthlyData.sort((a, b) => a.timestamp - b.timestamp);
  
  return {
    daily: dailyData,
    monthly: monthlyData
  };
};

export default {
  getHistoricalPrice,
  calculateTransactionProfitLoss,
  analyzeProfitLoss,
  generatePortfolioTimeSeries,
  aggregatePortfolioTimeSeries
};