/**
 * Pattern Analysis Service
 * Identifies common transaction patterns and behaviors in blockchain transaction data
 */

/**
 * Analyzes transactions to identify common patterns
 * @param {Array} transactions - List of transactions to analyze
 * @param {String} centralAddress - The address being analyzed
 * @returns {Object} Object containing identified patterns and their details
 */
export const analyzeTransactionPatterns = (transactions, centralAddress) => {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return { patterns: [] };
  }

  // Create a consolidated list of all transactions
  const allTransactions = [];
  if (transactions.sent && transactions.received) {
    // Format is { sent: [...], received: [...] }
    transactions.sent.forEach(tx => allTransactions.push({
      ...tx,
      direction: 'sent',
      counterparty: tx.to
    }));
    transactions.received.forEach(tx => allTransactions.push({
      ...tx,
      direction: 'received',
      counterparty: tx.from
    }));
  } else if (Array.isArray(transactions)) {
    // Format is already a flat array
    allTransactions.push(...transactions);
  }

  // Return empty result if no transactions
  if (allTransactions.length === 0) {
    return { patterns: [] };
  }

  // Sort transactions by timestamp if available
  const sortedTransactions = [...allTransactions].sort((a, b) => {
    const dateA = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp) : new Date(0);
    const dateB = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp) : new Date(0);
    return dateA - dateB;
  });

  // Initialize pattern detection results
  const patternResults = {
    patterns: []
  };

  // Detect regular/periodic transfers
  const periodicPattern = detectPeriodicTransfers(sortedTransactions);
  if (periodicPattern.isDetected) {
    patternResults.patterns.push(periodicPattern);
  }

  // Detect round-number transfers
  const roundNumberPattern = detectRoundNumberTransfers(sortedTransactions);
  if (roundNumberPattern.isDetected) {
    patternResults.patterns.push(roundNumberPattern);
  }

  // Detect one-to-many or many-to-one patterns
  const distribPatterns = detectDistributionPatterns(sortedTransactions, centralAddress);
  patternResults.patterns.push(...distribPatterns);

  // Detect whale transfers (extremely large compared to normal)
  const whalePattern = detectWhaleTransfers(sortedTransactions);
  if (whalePattern.isDetected) {
    patternResults.patterns.push(whalePattern);
  }

  // Detect gradual accumulation or distribution
  const accumulationPattern = detectAccumulationPattern(sortedTransactions, centralAddress);
  if (accumulationPattern.isDetected) {
    patternResults.patterns.push(accumulationPattern);
  }

  // Detect burst activity
  const burstPattern = detectBurstActivity(sortedTransactions);
  if (burstPattern.isDetected) {
    patternResults.patterns.push(burstPattern);
  }
  
  // Detect cyclical behavior (like weekly/monthly patterns)
  const cyclicalPattern = detectCyclicalBehavior(sortedTransactions);
  if (cyclicalPattern.isDetected) {
    patternResults.patterns.push(cyclicalPattern);
  }

  return patternResults;
};

/**
 * Detect transactions that occur at regular intervals
 */
const detectPeriodicTransfers = (transactions) => {
  // Skip if transactions don't have timestamps
  if (!transactions.some(tx => tx.metadata?.blockTimestamp)) {
    return { isDetected: false };
  }

  // Filter transactions with timestamps
  const txsWithTime = transactions.filter(tx => tx.metadata?.blockTimestamp);
  if (txsWithTime.length < 5) {
    return { isDetected: false }; // Need at least 5 transactions for meaningful pattern
  }

  // Calculate time intervals between consecutive transactions
  const intervals = [];
  for (let i = 1; i < txsWithTime.length; i++) {
    const prevDate = new Date(txsWithTime[i-1].metadata.blockTimestamp);
    const currDate = new Date(txsWithTime[i].metadata.blockTimestamp);
    const diffHours = (currDate - prevDate) / (1000 * 60 * 60);
    intervals.push(diffHours);
  }

  // Calculate mean and standard deviation of intervals
  const sum = intervals.reduce((acc, val) => acc + val, 0);
  const mean = sum / intervals.length;
  const variance = intervals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation (CV) - lower values indicate more regular patterns
  const cv = stdDev / mean;

  // Check if transactions occur at regular intervals (low CV indicates regularity)
  const isRegular = cv < 0.5 && intervals.length >= 4;

  // Determine the approximate period if it's regular
  let period = '';
  if (isRegular) {
    if (mean >= 22 && mean <= 26) {
      period = 'daily';
    } else if (mean >= 150 && mean <= 190) {
      period = 'weekly';
    } else if (mean >= 650 && mean <= 750) {
      period = 'monthly';
    } else {
      period = `every ${Math.round(mean)} hours`;
    }
  }

  return {
    type: 'periodic_transfers',
    isDetected: isRegular,
    confidence: isRegular ? Math.max(0, Math.min(100, Math.round(100 * (1 - cv)))) : 0,
    details: {
      period,
      averageInterval: Math.round(mean),
      intervalUnit: 'hours',
      regularityScore: Math.round(100 * (1 - cv)),
      transactionsAnalyzed: intervals.length + 1
    },
    description: isRegular 
      ? `Regular transfers occurring approximately ${period}`
      : 'No periodic transfer pattern detected',
    importance: 'medium'
  };
};

/**
 * Detect round number transfers (e.g., exactly 1.0 ETH, 0.5 ETH, etc.)
 */
const detectRoundNumberTransfers = (transactions) => {
  // Filter out transactions without value
  const txsWithValue = transactions.filter(tx => tx.value);
  if (txsWithValue.length < 3) {
    return { isDetected: false };
  }

  // Convert values to numbers
  const values = txsWithValue.map(tx => parseFloat(tx.value));
  
  // Check if values are round numbers
  const roundNumbers = values.filter(val => {
    // Check if the number has at most 1 decimal place
    const decimalPlaces = val.toString().split('.')[1]?.length || 0;
    return decimalPlaces <= 1 && (val % 0.5 === 0 || val % 0.1 === 0);
  });

  const roundPercentage = (roundNumbers.length / values.length) * 100;
  const isRoundPattern = roundPercentage > 60 && roundNumbers.length >= 3;

  return {
    type: 'round_number_transfers',
    isDetected: isRoundPattern,
    confidence: Math.round(roundPercentage),
    details: {
      roundNumberCount: roundNumbers.length,
      totalTransactions: values.length,
      percentage: Math.round(roundPercentage),
      examples: roundNumbers.slice(0, 3).map(val => val.toString())
    },
    description: isRoundPattern 
      ? `${Math.round(roundPercentage)}% of transactions use round numbers (${roundNumbers.slice(0, 2).join(', ')})`
      : 'No round number pattern detected',
    importance: 'low'
  };
};

/**
 * Detect distribution patterns (one-to-many or many-to-one)
 */
const detectDistributionPatterns = (transactions, centralAddress) => {
  const patterns = [];
  
  // Count unique addresses that received from the central address
  const receivingAddresses = new Set();
  const sentTransactions = transactions.filter(tx => 
    (tx.from === centralAddress || tx.direction === 'sent') &&
    tx.to !== centralAddress
  );
  
  sentTransactions.forEach(tx => {
    const recipient = tx.to || tx.counterparty;
    if (recipient) {
      receivingAddresses.add(recipient);
    }
  });
  
  // One-to-many pattern (distributing to multiple addresses)
  if (sentTransactions.length >= 5 && receivingAddresses.size >= 5) {
    patterns.push({
      type: 'distributor_pattern',
      isDetected: true,
      confidence: Math.min(90, Math.round((receivingAddresses.size / sentTransactions.length) * 100)),
      details: {
        uniqueRecipients: receivingAddresses.size,
        totalSentTransactions: sentTransactions.length,
        uniqueRatio: (receivingAddresses.size / sentTransactions.length).toFixed(2)
      },
      description: `Distributed funds to ${receivingAddresses.size} different addresses`,
      importance: receivingAddresses.size > 20 ? 'high' : 'medium'
    });
  }
  
  // Many-to-one pattern (receiving from multiple addresses)
  const sendingAddresses = new Set();
  const receivedTransactions = transactions.filter(tx => 
    (tx.to === centralAddress || tx.direction === 'received') &&
    tx.from !== centralAddress
  );
  
  receivedTransactions.forEach(tx => {
    const sender = tx.from || tx.counterparty;
    if (sender) {
      sendingAddresses.add(sender);
    }
  });
  
  if (receivedTransactions.length >= 5 && sendingAddresses.size >= 5) {
    patterns.push({
      type: 'collector_pattern',
      isDetected: true,
      confidence: Math.min(90, Math.round((sendingAddresses.size / receivedTransactions.length) * 100)),
      details: {
        uniqueSenders: sendingAddresses.size,
        totalReceivedTransactions: receivedTransactions.length,
        uniqueRatio: (sendingAddresses.size / receivedTransactions.length).toFixed(2)
      },
      description: `Received funds from ${sendingAddresses.size} different addresses`,
      importance: sendingAddresses.size > 20 ? 'high' : 'medium'
    });
  }
  
  // Return empty array if no patterns detected
  return patterns;
};

/**
 * Detect significantly large transfers compared to typical transactions
 */
const detectWhaleTransfers = (transactions) => {
  // Filter transactions with values
  const txsWithValue = transactions.filter(tx => tx.value);
  if (txsWithValue.length < 5) {
    return { isDetected: false };
  }

  // Convert values to numbers
  const values = txsWithValue.map(tx => parseFloat(tx.value));
  
  // Calculate mean and standard deviation
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Identify "whale" transactions (significantly larger than typical)
  const threshold = mean + (3 * stdDev); // 3 standard deviations above mean
  const whaleTransactions = txsWithValue.filter(tx => parseFloat(tx.value) > threshold);
  
  return {
    type: 'whale_transfers',
    isDetected: whaleTransactions.length > 0,
    confidence: whaleTransactions.length > 0 ? 85 : 0,
    details: {
      whaleTransactionCount: whaleTransactions.length,
      totalTransactions: txsWithValue.length,
      typicalTransactionValue: mean.toFixed(4),
      whaleThreshold: threshold.toFixed(4),
      largestTransaction: whaleTransactions.length > 0 
        ? Math.max(...whaleTransactions.map(tx => parseFloat(tx.value))).toFixed(4)
        : 0
    },
    description: whaleTransactions.length > 0
      ? `Found ${whaleTransactions.length} abnormally large transactions (>${threshold.toFixed(2)} ETH)`
      : 'No abnormally large transactions detected',
    importance: 'high'
  };
};

/**
 * Detect gradual accumulation or distribution of funds over time
 */
const detectAccumulationPattern = (transactions, centralAddress) => {
  // Skip if transactions don't have timestamps
  if (!transactions.some(tx => tx.metadata?.blockTimestamp)) {
    return { isDetected: false };
  }

  // Filter transactions with timestamps and values
  const txsWithTimeAndValue = transactions.filter(tx => 
    tx.metadata?.blockTimestamp && tx.value
  );
  
  if (txsWithTimeAndValue.length < 10) {
    return { isDetected: false }; // Need sufficient data
  }

  // Calculate cumulative balance over time
  let cumulativeBalance = 0;
  const balancePoints = txsWithTimeAndValue.map(tx => {
    const value = parseFloat(tx.value);
    if (tx.direction === 'received' || tx.to === centralAddress) {
      cumulativeBalance += value;
    } else {
      cumulativeBalance -= value;
    }
    return {
      timestamp: new Date(tx.metadata.blockTimestamp),
      balance: cumulativeBalance
    };
  });

  // Check if there's a consistent trend (accumulation or distribution)
  // by calculating a simple linear regression
  const n = balancePoints.length;
  const xValues = balancePoints.map((p, i) => i); // Using indices as x values
  const yValues = balancePoints.map(p => p.balance);
  
  // Calculate slope of the regression line
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
  const sumXX = xValues.reduce((a, b) => a + b * b, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared to determine how well the line fits the data
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((a, b) => a + Math.pow(b - yMean, 2), 0);
  const ssResidual = yValues.reduce((a, b, i) => {
    const prediction = slope * xValues[i] + intercept;
    return a + Math.pow(b - prediction, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);
  
  // Determine if there's a clear trend
  const isTrending = Math.abs(rSquared) > 0.5;
  const pattern = slope > 0 ? 'accumulation' : 'distribution';
  
  return {
    type: `${pattern}_pattern`,
    isDetected: isTrending,
    confidence: Math.round(rSquared * 100),
    details: {
      pattern,
      startBalance: balancePoints[0].balance.toFixed(4),
      endBalance: balancePoints[balancePoints.length - 1].balance.toFixed(4),
      netChange: (balancePoints[balancePoints.length - 1].balance - balancePoints[0].balance).toFixed(4),
      trendStrength: rSquared.toFixed(2),
      duration: `${Math.round((balancePoints[balancePoints.length - 1].timestamp - balancePoints[0].timestamp) / (1000 * 60 * 60 * 24))} days`
    },
    description: isTrending 
      ? `Gradual ${pattern} of funds over time (${Math.round(rSquared * 100)}% confidence)`
      : 'No clear accumulation or distribution pattern',
    importance: 'medium'
  };
};

/**
 * Detect periods of burst activity followed by inactivity
 */
const detectBurstActivity = (transactions) => {
  // Skip if transactions don't have timestamps
  if (!transactions.some(tx => tx.metadata?.blockTimestamp)) {
    return { isDetected: false };
  }

  // Filter transactions with timestamps
  const txsWithTime = transactions.filter(tx => tx.metadata?.blockTimestamp);
  if (txsWithTime.length < 5) {
    return { isDetected: false };
  }

  // Sort by timestamp
  const sortedTxs = [...txsWithTime].sort((a, b) => 
    new Date(a.metadata.blockTimestamp) - new Date(b.metadata.blockTimestamp)
  );

  // Calculate time gaps between consecutive transactions
  const timeGaps = [];
  const totalDuration = new Date(sortedTxs[sortedTxs.length - 1].metadata.blockTimestamp) - 
                        new Date(sortedTxs[0].metadata.blockTimestamp);
  const avgGapExpected = totalDuration / (sortedTxs.length - 1);
  
  let burstPeriods = [];
  let currentBurst = [sortedTxs[0]];
  
  for (let i = 1; i < sortedTxs.length; i++) {
    const prevDate = new Date(sortedTxs[i-1].metadata.blockTimestamp);
    const currDate = new Date(sortedTxs[i].metadata.blockTimestamp);
    const gap = currDate - prevDate;
    timeGaps.push(gap);
    
    // If gap is significantly smaller than average, they're part of same burst
    if (gap < avgGapExpected * 0.3) {
      currentBurst.push(sortedTxs[i]);
    } else {
      // End of burst, if burst contains multiple transactions
      if (currentBurst.length >= 3) {
        burstPeriods.push({
          startTime: new Date(currentBurst[0].metadata.blockTimestamp),
          endTime: new Date(currentBurst[currentBurst.length - 1].metadata.blockTimestamp),
          transactions: currentBurst.length
        });
      }
      currentBurst = [sortedTxs[i]];
    }
  }
  
  // Check if last burst is valid
  if (currentBurst.length >= 3) {
    burstPeriods.push({
      startTime: new Date(currentBurst[0].metadata.blockTimestamp),
      endTime: new Date(currentBurst[currentBurst.length - 1].metadata.blockTimestamp),
      transactions: currentBurst.length
    });
  }
  
  return {
    type: 'burst_activity',
    isDetected: burstPeriods.length > 0,
    confidence: burstPeriods.length > 0 ? 75 : 0,
    details: {
      burstPeriods: burstPeriods.length,
      largestBurst: burstPeriods.length > 0 
        ? Math.max(...burstPeriods.map(b => b.transactions))
        : 0,
      burstDetails: burstPeriods.map(b => ({
        date: b.startTime.toISOString().split('T')[0],
        transactions: b.transactions,
        duration: `${Math.round((b.endTime - b.startTime) / (1000 * 60))} minutes`
      })).slice(0, 3) // Include details of up to 3 bursts
    },
    description: burstPeriods.length > 0
      ? `${burstPeriods.length} periods of burst activity detected`
      : 'No burst activity patterns detected',
    importance: 'medium'
  };
};

/**
 * Detect cyclical behavior (e.g., weekly patterns, monthly patterns)
 */
const detectCyclicalBehavior = (transactions) => {
  // Skip if transactions don't have timestamps
  if (!transactions.some(tx => tx.metadata?.blockTimestamp)) {
    return { isDetected: false };
  }

  // Filter transactions with timestamps
  const txsWithTime = transactions.filter(tx => tx.metadata?.blockTimestamp);
  if (txsWithTime.length < 10) {
    return { isDetected: false }; // Need sufficient data
  }

  // Group transactions by day of week to check for weekly patterns
  const dayOfWeekCounts = Array(7).fill(0);
  
  txsWithTime.forEach(tx => {
    const date = new Date(tx.metadata.blockTimestamp);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    dayOfWeekCounts[dayOfWeek]++;
  });
  
  // Calculate coefficient of variation to check for weekly pattern
  const weekdaySum = dayOfWeekCounts.reduce((a, b) => a + b, 0);
  const weekdayMean = weekdaySum / 7;
  const weekdayVariance = dayOfWeekCounts.reduce((a, b) => a + Math.pow(b - weekdayMean, 2), 0) / 7;
  const weekdayStdDev = Math.sqrt(weekdayVariance);
  const weekdayCv = weekdayStdDev / weekdayMean;
  
  // High CV indicates certain days have significantly more activity
  const hasWeeklyPattern = weekdayCv > 0.5;
  
  // Group by day of month to check for monthly patterns
  const dayOfMonthCounts = Array(31).fill(0);
  
  txsWithTime.forEach(tx => {
    const date = new Date(tx.metadata.blockTimestamp);
    const dayOfMonth = date.getDate() - 1; // 0-30
    dayOfMonthCounts[dayOfMonth]++;
  });
  
  // Get the most active days
  let weekdayMax = Math.max(...dayOfWeekCounts);
  let popularWeekdays = [];
  dayOfWeekCounts.forEach((count, day) => {
    if (count === weekdayMax) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      popularWeekdays.push(dayNames[day]);
    }
  });
  
  return {
    type: 'cyclical_behavior',
    isDetected: hasWeeklyPattern,
    confidence: hasWeeklyPattern ? Math.min(85, Math.round(weekdayCv * 100)) : 0,
    details: {
      hasWeeklyPattern,
      popularWeekdays,
      weekdayData: [
        { day: 'Sunday', transactions: dayOfWeekCounts[0] },
        { day: 'Monday', transactions: dayOfWeekCounts[1] },
        { day: 'Tuesday', transactions: dayOfWeekCounts[2] },
        { day: 'Wednesday', transactions: dayOfWeekCounts[3] },
        { day: 'Thursday', transactions: dayOfWeekCounts[4] },
        { day: 'Friday', transactions: dayOfWeekCounts[5] },
        { day: 'Saturday', transactions: dayOfWeekCounts[6] }
      ],
      cyclicalityScore: Math.round(weekdayCv * 100)
    },
    description: hasWeeklyPattern
      ? `Cyclical pattern detected with most activity on ${popularWeekdays.join(', ')}`
      : 'No significant cyclical patterns detected',
    importance: 'medium'
  };
};

/**
 * Categorize wallet behavior based on transaction patterns
 * @param {Object} patterns - The patterns detected by analyzeTransactionPatterns
 * @returns {Object} Wallet type and behavior characteristics
 */
export const categorizeWalletBehavior = (patterns) => {
  if (!patterns || !patterns.patterns || patterns.patterns.length === 0) {
    return {
      type: 'Unknown',
      confidence: 0,
      behaviors: []
    };
  }

  // Extract pattern types
  const patternTypes = patterns.patterns.map(p => p.type);
  
  const behaviors = [];
  let walletType = 'General User';
  let confidence = 50;
  
  // Check for trader characteristics
  if (patternTypes.includes('burst_activity') || patternTypes.includes('whale_transfers')) {
    behaviors.push('Trader');
    confidence += 15;
  }
  
  // Check for distributor characteristics
  if (patternTypes.includes('distributor_pattern')) {
    behaviors.push('Distributor');
    confidence += 15;
  }
  
  // Check for collector characteristics
  if (patternTypes.includes('collector_pattern')) {
    behaviors.push('Collector');
    confidence += 15;
  }
  
  // Check for regular/periodic characteristics
  if (patternTypes.includes('periodic_transfers') || patternTypes.includes('cyclical_behavior')) {
    behaviors.push('Regular User');
    confidence += 10;
  }
  
  // Check for hodler characteristics
  if (patternTypes.includes('accumulation_pattern')) {
    behaviors.push('Hodler');
    confidence += 20;
  }
  
  // Determine primary wallet type
  if (behaviors.includes('Trader') && behaviors.includes('Distributor')) {
    walletType = 'Market Maker';
    confidence += 10;
  } else if (behaviors.includes('Trader')) {
    walletType = 'Trader';
  } else if (behaviors.includes('Distributor') && patternTypes.includes('periodic_transfers')) {
    walletType = 'Payment Processor';
    confidence += 5;
  } else if (behaviors.includes('Hodler') && !patternTypes.includes('distributor_pattern')) {
    walletType = 'Long-term Investor';
    confidence += 5;
  } else if (behaviors.includes('Regular User') && patternTypes.includes('round_number_transfers')) {
    walletType = 'Salary/Regular Payment Account';
    confidence += 5;
  }
  
  return {
    type: walletType,
    confidence: Math.min(95, confidence),
    behaviors
  };
};

/**
 * Calculate risk score for an address based on transaction patterns
 * @param {Object} patterns - The patterns detected by analyzeTransactionPatterns
 * @returns {Object} Risk score and factors
 */
export const calculateRiskScore = (patterns) => {
  if (!patterns || !patterns.patterns || patterns.patterns.length === 0) {
    return {
      score: 0,
      level: 'Unknown',
      factors: []
    };
  }

  let baseScore = 50; // Start at neutral
  const riskFactors = [];
  const protectiveFactors = [];
  
  // Evaluate each pattern for risk indicators
  patterns.patterns.forEach(pattern => {
    switch (pattern.type) {
      case 'whale_transfers':
        baseScore += 15;
        riskFactors.push('Unusually large transactions detected');
        break;
      
      case 'burst_activity':
        baseScore += 10;
        riskFactors.push('Burst transaction pattern suggests potential automated behavior');
        break;
      
      case 'distributor_pattern':
        if (pattern.details.uniqueRecipients > 20) {
          baseScore += 8;
          riskFactors.push(`High distribution to ${pattern.details.uniqueRecipients} different addresses`);
        }
        break;
        
      case 'round_number_transfers':
        baseScore -= 5;
        protectiveFactors.push('Round number transactions suggest human-initiated transfers');
        break;
        
      case 'periodic_transfers':
        baseScore -= 15;
        protectiveFactors.push('Regular periodic transactions suggest legitimate scheduled activity');
        break;
        
      case 'cyclical_behavior':
        baseScore -= 10;
        protectiveFactors.push('Consistent cyclical behavior indicates normal usage patterns');
        break;
    }
  });
  
  // Cap the score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, baseScore));
  
  // Determine risk level
  let riskLevel;
  if (finalScore >= 80) {
    riskLevel = 'High';
  } else if (finalScore >= 60) {
    riskLevel = 'Medium';
  } else if (finalScore >= 40) {
    riskLevel = 'Low';
  } else if (finalScore >= 20) {
    riskLevel = 'Very Low';
  } else {
    riskLevel = 'Minimal';
  }
  
  return {
    score: finalScore,
    level: riskLevel,
    factors: [...riskFactors, ...protectiveFactors]
  };
};