/**
 * Gas Analysis Service
 * Analyzes gas spending patterns and efficiency for blockchain transactions
 */

/**
 * Retrieves detailed gas usage information for a list of transactions
 * @param {Object} alchemy - Initialized Alchemy SDK instance
 * @param {Array} transactionList - List of transaction hashes to analyze
 * @returns {Promise<Array>} Array of transactions with detailed gas information
 */
export const getGasDetails = async (alchemy, transactionList) => {
  if (!alchemy) {
    throw new Error('Alchemy SDK not initialized. Please provide API key first.');
  }
  
  try {
    // Filter out transactions without hash information
    const validTransactions = transactionList.filter(tx => tx.hash);
    
    // Get detailed transaction information including gas data
    const detailedTransactions = await Promise.all(
      validTransactions.map(async (tx) => {
        try {
          const txDetail = await alchemy.core.getTransactionReceipt(tx.hash);
          
          // If transaction receipt exists, add gas information
          if (txDetail) {
            return {
              ...tx,
              gasUsed: txDetail.gasUsed ? parseInt(txDetail.gasUsed.toString()) : null,
              effectiveGasPrice: txDetail.effectiveGasPrice ? parseInt(txDetail.effectiveGasPrice.toString()) : null,
              gasLimit: txDetail.gasLimit ? parseInt(txDetail.gasLimit) : null,
              cumulativeGasUsed: txDetail.cumulativeGasUsed ? parseInt(txDetail.cumulativeGasUsed.toString()) : null,
              gasFee: txDetail.gasUsed && txDetail.effectiveGasPrice ? 
                (parseInt(txDetail.gasUsed.toString()) * parseInt(txDetail.effectiveGasPrice.toString())) / 1e18 : null,
              status: txDetail.status,
              blockNumber: txDetail.blockNumber ? parseInt(txDetail.blockNumber.toString()) : null,
              timestamp: tx.metadata?.blockTimestamp || null
            };
          }
          return tx;
        } catch (error) {
          console.warn(`Error fetching details for transaction ${tx.hash}:`, error);
          return tx;
        }
      })
    );
    
    return detailedTransactions.filter(tx => tx.gasUsed !== undefined && tx.gasUsed !== null);
  } catch (error) {
    console.error('Error retrieving gas details:', error);
    throw error;
  }
};

/**
 * Analyzes gas usage trends for a set of transactions
 * @param {Array} transactions - Transactions with gas data
 * @returns {Object} Analysis of gas usage patterns
 */
export const analyzeGasUsage = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      totalTransactions: 0,
      totalGasUsed: 0,
      totalGasFee: 0,
      averageGasPerTransaction: 0,
      averageGasPrice: 0,
      medianGasPerTransaction: 0,
      gasEfficiency: 0,
      timeSeries: [],
      highestGasTx: null,
      lowestGasTx: null,
      gasDistribution: {
        veryLow: 0,
        low: 0,
        medium: 0,
        high: 0,
        veryHigh: 0
      },
      wastageAnalysis: {
        totalWastedGas: 0,
        percentageWasted: 0,
        potentialSavings: 0
      }
    };
  }
  
  // Filter transactions with valid gas data
  const txsWithGasData = transactions.filter(tx => 
    tx.gasUsed !== undefined && 
    tx.gasUsed !== null && 
    tx.effectiveGasPrice !== undefined && 
    tx.effectiveGasPrice !== null
  );
  
  if (txsWithGasData.length === 0) {
    return {
      totalTransactions: 0,
      totalGasUsed: 0,
      totalGasFee: 0,
      averageGasPerTransaction: 0,
      averageGasPrice: 0,
      medianGasPerTransaction: 0,
      gasEfficiency: 0,
      timeSeries: [],
      highestGasTx: null,
      lowestGasTx: null,
      gasDistribution: {
        veryLow: 0,
        low: 0,
        medium: 0,
        high: 0,
        veryHigh: 0
      },
      wastageAnalysis: {
        totalWastedGas: 0,
        percentageWasted: 0,
        potentialSavings: 0
      }
    };
  }
  
  // Basic statistics
  const totalGasUsed = txsWithGasData.reduce((sum, tx) => sum + tx.gasUsed, 0);
  const totalGasFee = txsWithGasData.reduce((sum, tx) => sum + (tx.gasFee || 0), 0);
  const averageGasPerTransaction = totalGasUsed / txsWithGasData.length;
  
  // Calculate average gas price in Gwei
  const totalGasPrice = txsWithGasData.reduce((sum, tx) => sum + tx.effectiveGasPrice, 0);
  const averageGasPrice = (totalGasPrice / txsWithGasData.length) / 1e9; // Convert to Gwei
  
  // Calculate median gas used
  const gasUsedValues = [...txsWithGasData.map(tx => tx.gasUsed)].sort((a, b) => a - b);
  const midIndex = Math.floor(gasUsedValues.length / 2);
  const medianGasPerTransaction = gasUsedValues.length % 2 === 0
    ? (gasUsedValues[midIndex - 1] + gasUsedValues[midIndex]) / 2
    : gasUsedValues[midIndex];
  
  // Find highest and lowest gas transactions
  let highestGasTx = txsWithGasData.reduce((highest, tx) => 
    !highest || tx.gasUsed > highest.gasUsed ? tx : highest, null);
  
  let lowestGasTx = txsWithGasData.reduce((lowest, tx) => 
    !lowest || tx.gasUsed < lowest.gasUsed ? tx : lowest, null);
  
  // Create time series data if timestamps are available
  const txsWithTimestamps = txsWithGasData.filter(tx => tx.timestamp);
  let timeSeries = [];
  
  if (txsWithTimestamps.length > 0) {
    // Sort by timestamp
    const sortedTxs = [...txsWithTimestamps].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Generate time series data
    timeSeries = sortedTxs.map(tx => ({
      timestamp: tx.timestamp,
      gasUsed: tx.gasUsed,
      gasPrice: tx.effectiveGasPrice / 1e9, // Convert to Gwei
      gasFee: tx.gasFee
    }));
  }
  
  // Analyze gas distribution
  // Find distribution ranges
  const maxGas = Math.max(...gasUsedValues);
  const minGas = Math.min(...gasUsedValues);
  const gasRange = maxGas - minGas;
  const segmentSize = gasRange / 5;
  
  const veryLowThreshold = minGas + segmentSize;
  const lowThreshold = minGas + (2 * segmentSize);
  const mediumThreshold = minGas + (3 * segmentSize);
  const highThreshold = minGas + (4 * segmentSize);
  
  // Count transactions in each segment
  const gasDistribution = {
    veryLow: txsWithGasData.filter(tx => tx.gasUsed <= veryLowThreshold).length,
    low: txsWithGasData.filter(tx => tx.gasUsed > veryLowThreshold && tx.gasUsed <= lowThreshold).length,
    medium: txsWithGasData.filter(tx => tx.gasUsed > lowThreshold && tx.gasUsed <= mediumThreshold).length,
    high: txsWithGasData.filter(tx => tx.gasUsed > mediumThreshold && tx.gasUsed <= highThreshold).length,
    veryHigh: txsWithGasData.filter(tx => tx.gasUsed > highThreshold).length
  };
  
  // Calculate gas efficiency (actual usage vs limits)
  const txsWithLimits = txsWithGasData.filter(tx => tx.gasLimit);
  let gasEfficiency = 0;
  let totalWastedGas = 0;
  
  if (txsWithLimits.length > 0) {
    const totalUsed = txsWithLimits.reduce((sum, tx) => sum + tx.gasUsed, 0);
    const totalLimit = txsWithLimits.reduce((sum, tx) => sum + tx.gasLimit, 0);
    gasEfficiency = totalUsed / totalLimit * 100;
    totalWastedGas = totalLimit - totalUsed;
  }
  
  // Calculate potential savings (in ETH)
  const potentialSavings = txsWithLimits.reduce((sum, tx) => {
    const wasted = tx.gasLimit - tx.gasUsed;
    const wasteCost = wasted * tx.effectiveGasPrice / 1e18;
    return sum + wasteCost;
  }, 0);
  
  return {
    totalTransactions: txsWithGasData.length,
    totalGasUsed,
    totalGasFee,
    averageGasPerTransaction,
    averageGasPrice,
    medianGasPerTransaction,
    gasEfficiency: gasEfficiency || 0,
    timeSeries,
    highestGasTx,
    lowestGasTx,
    gasDistribution,
    wastageAnalysis: {
      totalWastedGas,
      percentageWasted: 100 - gasEfficiency,
      potentialSavings
    }
  };
};

/**
 * Calculates optimization recommendations based on gas usage patterns
 * @param {Object} gasAnalysis - Results from analyzeGasUsage function
 * @returns {Object} Optimization recommendations
 */
export const getGasOptimizationTips = (gasAnalysis) => {
  const tips = [];
  
  // No data available
  if (!gasAnalysis || gasAnalysis.totalTransactions === 0) {
    return {
      tips: [
        "No gas usage data available for analysis. Try with transactions that have detailed gas information."
      ],
      hasPotentialSavings: false,
      potentialSavingPercentage: 0
    };
  }
  
  // Check for gas limit wastage
  if (gasAnalysis.wastageAnalysis.percentageWasted > 20) {
    tips.push({
      title: "Reduce Gas Limits",
      description: `Your transactions use only ${gasAnalysis.gasEfficiency.toFixed(1)}% of allocated gas limits. Consider using lower gas limits to reduce potential costs.`,
      savingsPotential: "High",
      implementation: "Set more accurate gas limits by estimating based on contract interactions or using historical data."
    });
  }
  
  // Check for consistent high gas usage
  if (gasAnalysis.gasDistribution.veryHigh > gasAnalysis.totalTransactions * 0.3) {
    tips.push({
      title: "Optimize Contract Interactions",
      description: "A significant number of your transactions use very high gas. Consider optimizing complex contract interactions.",
      savingsPotential: "Medium",
      implementation: "Batch operations when possible, reduce storage operations, and optimize contract code."
    });
  }
  
  // Check for timing (if time series data is available)
  if (gasAnalysis.timeSeries.length > 5) {
    // Find average gas price during different time periods
    const timeData = gasAnalysis.timeSeries.map(point => ({
      hour: new Date(point.timestamp).getUTCHours(),
      gasPrice: point.gasPrice
    }));
    
    // Group by hour and find average gas prices
    const hourlyAverages = {};
    timeData.forEach(point => {
      if (!hourlyAverages[point.hour]) {
        hourlyAverages[point.hour] = { total: 0, count: 0 };
      }
      hourlyAverages[point.hour].total += point.gasPrice;
      hourlyAverages[point.hour].count += 1;
    });
    
    // Calculate averages
    const hourlyPrices = {};
    Object.keys(hourlyAverages).forEach(hour => {
      hourlyPrices[hour] = hourlyAverages[hour].total / hourlyAverages[hour].count;
    });
    
    // Find hour with lowest average gas price
    let lowestHour = Object.keys(hourlyPrices)[0];
    let lowestPrice = hourlyPrices[lowestHour];
    
    Object.keys(hourlyPrices).forEach(hour => {
      if (hourlyPrices[hour] < lowestPrice) {
        lowestHour = hour;
        lowestPrice = hourlyPrices[hour];
      }
    });
    
    // Find hour with highest average gas price
    let highestHour = Object.keys(hourlyPrices)[0];
    let highestPrice = hourlyPrices[highestHour];
    
    Object.keys(hourlyPrices).forEach(hour => {
      if (hourlyPrices[hour] > highestPrice) {
        highestHour = hour;
        highestPrice = hourlyPrices[hour];
      }
    });
    
    // If there's a significant difference between high and low
    if (highestPrice > lowestPrice * 1.3) {
      tips.push({
        title: "Time Your Transactions",
        description: `Gas prices are typically ${(highestPrice / lowestPrice).toFixed(1)}x lower at around ${lowestHour}:00 UTC compared to ${highestHour}:00 UTC.`,
        savingsPotential: "Medium",
        implementation: `For non-urgent transactions, schedule them around ${lowestHour}:00 UTC to save on gas costs.`
      });
    }
  }
  
  // General tips based on transaction volume
  if (gasAnalysis.totalTransactions > 10) {
    tips.push({
      title: "Use EIP-1559 Transactions",
      description: "EIP-1559 transactions can help save on gas costs by setting a max fee and allowing the network to determine the actual price.",
      savingsPotential: "Low to Medium",
      implementation: "Configure your wallet to use EIP-1559 transaction types when submitting transactions."
    });
  }
  
  // If few tips were generated, add some general ones
  if (tips.length < 2) {
    tips.push({
      title: "Batch Transactions When Possible",
      description: "Multiple small operations can be combined into a single transaction to save on base gas costs.",
      savingsPotential: "Medium",
      implementation: "Use multi-call contracts or batch functions when available in contracts you interact with."
    });
    
    tips.push({
      title: "Monitor Network Congestion",
      description: "Ethereum gas prices vary significantly with network congestion. Non-urgent transactions can wait for lower gas periods.",
      savingsPotential: "Medium",
      implementation: "Use gas price tracking tools to monitor network congestion and time your transactions accordingly."
    });
  }
  
  return {
    tips,
    hasPotentialSavings: gasAnalysis.wastageAnalysis.potentialSavings > 0,
    potentialSavingPercentage: gasAnalysis.wastageAnalysis.percentageWasted
  };
};