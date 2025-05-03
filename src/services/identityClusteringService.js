/**
 * Identity Clustering Service
 * Groups blockchain addresses that likely belong to the same entity
 */

/**
 * Analyzes transaction patterns to identify addresses that likely belong to the same entity
 * @param {Array} transferPartners - List of address partners from processTransferPartners
 * @param {Object} transactions - All transactions for the address
 * @returns {Array} Clustered addresses with confidence scores
 */
export const identifyRelatedAddresses = (transferPartners, transactions) => {
  if (!transferPartners || !Array.isArray(transferPartners) || transferPartners.length === 0) {
    return { clusters: [] };
  }

  // Initialize clusters with a default cluster for addresses that don't fit elsewhere
  const clusters = [{
    id: 'unclustered',
    name: 'Unclustered Addresses',
    addresses: [],
    confidence: 0,
    reasons: []
  }];

  // Create a graph representation of the transaction network
  const graph = createAddressGraph(transferPartners, transactions);
  
  // Apply different clustering techniques
  const clusterResults = [
    // Temporal pattern-based clustering
    identifyTemporalClusters(transferPartners, transactions),
    
    // Co-spending pattern-based clustering
    identifyCoSpendingClusters(graph, transferPartners),
    
    // Behavioral similarity-based clustering
    identifyBehavioralClusters(transferPartners),
    
    // Heuristic-based clustering
    identifyHeuristicClusters(graph, transferPartners)
  ];
  
  // Merge cluster results, prioritizing high-confidence clusters
  const mergedClusters = mergeClusters(clusterResults);
  
  // Add any addresses not in clusters to the unclustered group
  const clusteredAddresses = new Set(
    mergedClusters.flatMap(cluster => cluster.addresses.map(a => a.address))
  );
  
  transferPartners.forEach(partner => {
    if (!clusteredAddresses.has(partner.address)) {
      clusters[0].addresses.push({
        address: partner.address,
        confidence: 0
      });
    }
  });
  
  // Remove the unclustered group if it's empty
  if (clusters[0].addresses.length === 0) {
    clusters.shift();
  }
  
  // Add merged clusters to the result
  clusters.push(...mergedClusters);
  
  return { clusters };
};

/**
 * Creates a graph representation of addresses and their relationships
 * @param {Array} transferPartners - List of address partners
 * @param {Object} transactions - All transactions
 * @returns {Object} Graph representation
 */
const createAddressGraph = (transferPartners, transactions) => {
  const graph = {
    nodes: {},
    edges: {}
  };
  
  // Add all nodes (addresses)
  transferPartners.forEach(partner => {
    graph.nodes[partner.address] = {
      address: partner.address,
      transactionCount: partner.transactions.length,
      totalSent: partner.totalSent,
      totalReceived: partner.totalReceived,
      anomalies: partner.anomalies
    };
    
    // Initialize edges array for this node
    graph.edges[partner.address] = [];
  });
  
  // Find connections between addresses (other than the central address)
  // We're looking for partners that interact with each other
  if (transactions && transactions.sent && transactions.received) {
    const allAddresses = new Set(transferPartners.map(p => p.address));
    
    // Process sent transactions to find connections
    transactions.sent.forEach(tx => {
      if (allAddresses.has(tx.to)) {
        const fromAddresses = new Set();
        
        // Look for received transactions from the same block or within a small time window
        // that could indicate co-spending or related addresses
        transactions.received.forEach(rtx => {
          if (
            rtx.blockNum === tx.blockNum || 
            (rtx.metadata?.blockTimestamp && tx.metadata?.blockTimestamp && 
             Math.abs(new Date(rtx.metadata.blockTimestamp) - new Date(tx.metadata.blockTimestamp)) < 300000) // 5 minutes
          ) {
            fromAddresses.add(rtx.from);
          }
        });
        
        // Add edges for these potential relationships
        fromAddresses.forEach(from => {
          if (allAddresses.has(from) && from !== tx.to) {
            // Add bidirectional edges
            if (!graph.edges[from].some(edge => edge.target === tx.to)) {
              graph.edges[from].push({
                target: tx.to,
                weight: 1,
                type: 'co-spending'
              });
            } else {
              // Increment weight if edge already exists
              const existingEdge = graph.edges[from].find(edge => edge.target === tx.to);
              if (existingEdge) existingEdge.weight++;
            }
            
            if (!graph.edges[tx.to].some(edge => edge.target === from)) {
              graph.edges[tx.to].push({
                target: from,
                weight: 1,
                type: 'co-spending'
              });
            } else {
              const existingEdge = graph.edges[tx.to].find(edge => edge.target === from);
              if (existingEdge) existingEdge.weight++;
            }
          }
        });
      }
    });
  }
  
  return graph;
};

/**
 * Identifies clusters based on temporal transaction patterns
 * @param {Array} transferPartners - List of address partners
 * @param {Object} transactions - All transactions
 * @returns {Array} Temporal clusters
 */
const identifyTemporalClusters = (transferPartners, transactions) => {
  const clusters = [];
  const addressMap = {};
  
  // Create a map of addresses to their temporal patterns
  transferPartners.forEach(partner => {
    const txTimestamps = partner.transactions
      .filter(tx => tx.timestamp)
      .map(tx => new Date(tx.timestamp).getTime());
    
    // Skip if insufficient timestamp data
    if (txTimestamps.length < 3) return;
    
    // Sort timestamps
    txTimestamps.sort((a, b) => a - b);
    
    // Calculate time intervals between consecutive transactions
    const intervals = [];
    for (let i = 1; i < txTimestamps.length; i++) {
      intervals.push(txTimestamps[i] - txTimestamps[i - 1]);
    }
    
    // Calculate temporal signature (using mean and std dev of intervals)
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    addressMap[partner.address] = {
      address: partner.address,
      meanInterval: mean,
      stdDevInterval: stdDev,
      activeHours: calculateActiveHours(txTimestamps),
      activeDays: calculateActiveDays(txTimestamps)
    };
  });
  
  // Group addresses with similar temporal patterns
  const addresses = Object.values(addressMap);
  
  // Skip if not enough addresses with temporal data
  if (addresses.length < 2) return clusters;
  
  // Find addresses with similar activity patterns
  for (let i = 0; i < addresses.length; i++) {
    const addr1 = addresses[i];
    
    const similarAddresses = [{ address: addr1.address, confidence: 100 }];
    
    for (let j = 0; j < addresses.length; j++) {
      if (i === j) continue;
      const addr2 = addresses[j];
      
      // Calculate similarity score based on temporal patterns
      let similarity = 0;
      
      // Check similarity of active hours
      const hourSimilarity = calculateSetSimilarity(addr1.activeHours, addr2.activeHours);
      
      // Check similarity of active days
      const daySimilarity = calculateSetSimilarity(addr1.activeDays, addr2.activeDays);
      
      // Check similarity of transaction interval patterns
      const intervalSimilarity = 1 - Math.min(1, 
        Math.abs(addr1.meanInterval - addr2.meanInterval) / 
        (Math.max(addr1.meanInterval, addr2.meanInterval) || 1)
      );
      
      // Weighted similarity score
      similarity = (hourSimilarity * 0.4) + (daySimilarity * 0.3) + (intervalSimilarity * 0.3);
      
      // If similarity is above threshold, they might be the same entity
      if (similarity > 0.8) {
        similarAddresses.push({
          address: addr2.address,
          confidence: Math.round(similarity * 100)
        });
      }
    }
    
    // Create a cluster if we found similar addresses
    if (similarAddresses.length > 1) {
      // Check if this cluster might be a subset of an existing cluster
      let isSubset = false;
      for (const cluster of clusters) {
        const clusterAddrs = new Set(cluster.addresses.map(a => a.address));
        const newAddrs = new Set(similarAddresses.map(a => a.address));
        
        // Calculate intersection size
        const intersection = new Set([...clusterAddrs].filter(x => newAddrs.has(x)));
        
        // If most addresses are already in a cluster, skip this one
        if (intersection.size >= similarAddresses.length * 0.7) {
          isSubset = true;
          break;
        }
      }
      
      if (!isSubset) {
        clusters.push({
          id: `temporal-${clusters.length + 1}`,
          name: `Temporal Group ${clusters.length + 1}`,
          type: 'temporal',
          addresses: similarAddresses,
          confidence: Math.round(
            similarAddresses.reduce((sum, addr) => sum + addr.confidence, 0) / similarAddresses.length
          ),
          reasons: ["Similar transaction timing patterns", "Activity during the same hours/days"]
        });
      }
    }
  }
  
  return clusters;
};

/**
 * Calculate which hours of the day an address is active
 * @param {Array} timestamps - Array of transaction timestamps
 * @returns {Set} Set of active hours (0-23)
 */
const calculateActiveHours = (timestamps) => {
  const hours = new Set();
  
  timestamps.forEach(timestamp => {
    const hour = new Date(timestamp).getUTCHours();
    hours.add(hour);
  });
  
  return hours;
};

/**
 * Calculate which days of the week an address is active
 * @param {Array} timestamps - Array of transaction timestamps
 * @returns {Set} Set of active days (0-6, where 0 is Sunday)
 */
const calculateActiveDays = (timestamps) => {
  const days = new Set();
  
  timestamps.forEach(timestamp => {
    const day = new Date(timestamp).getUTCDay();
    days.add(day);
  });
  
  return days;
};

/**
 * Calculate similarity between two sets
 * @param {Set} set1 - First set
 * @param {Set} set2 - Second set
 * @returns {Number} Jaccard similarity coefficient (0-1)
 */
const calculateSetSimilarity = (set1, set2) => {
  if (!set1 || !set2 || set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

/**
 * Identifies clusters based on co-spending patterns
 * @param {Object} graph - Graph representation of addresses
 * @param {Array} transferPartners - List of address partners
 * @returns {Array} Co-spending clusters
 */
const identifyCoSpendingClusters = (graph, transferPartners) => {
  const clusters = [];
  const visited = new Set();
  
  // Find connected components in the graph (groups of addresses that interact)
  Object.keys(graph.nodes).forEach(address => {
    if (visited.has(address)) return;
    
    // Start a new cluster
    const cluster = [];
    const queue = [address];
    visited.add(address);
    
    // BFS to find all connected addresses
    while (queue.length > 0) {
      const current = queue.shift();
      cluster.push(current);
      
      // Add neighbors to the queue
      graph.edges[current].forEach(edge => {
        if (!visited.has(edge.target) && edge.weight >= 2) { // Only consider strong connections
          visited.add(edge.target);
          queue.push(edge.target);
        }
      });
    }
    
    // Only create a cluster if it has multiple addresses
    if (cluster.length > 1) {
      // Calculate confidence based on the strength of connections
      const confidenceScores = cluster.map(addr => {
        const connections = graph.edges[addr].filter(edge => cluster.includes(edge.target));
        const avgWeight = connections.reduce((sum, edge) => sum + edge.weight, 0) / 
                          (connections.length || 1);
        return Math.min(95, Math.round(avgWeight * 15)); // Scale weight to confidence
      });
      
      const avgConfidence = Math.round(
        confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      );
      
      clusters.push({
        id: `co-spending-${clusters.length + 1}`,
        name: `Co-spending Group ${clusters.length + 1}`,
        type: 'co-spending',
        addresses: cluster.map((addr, i) => ({ 
          address: addr, 
          confidence: confidenceScores[i] 
        })),
        confidence: avgConfidence,
        reasons: ["Frequent co-spending patterns", "Transactions in the same blocks"]
      });
    }
  });
  
  return clusters;
};

/**
 * Identifies clusters based on behavioral similarities
 * @param {Array} transferPartners - List of address partners
 * @returns {Array} Behavioral clusters
 */
const identifyBehavioralClusters = (transferPartners) => {
  const clusters = [];
  
  // Extract behavioral features
  const addressBehaviors = {};
  
  transferPartners.forEach(partner => {
    // Skip if insufficient transaction data
    if (partner.transactions.length < 3) return;
    
    // Calculate behavioral features
    const sentFrequency = partner.totalSent / partner.transactions.filter(tx => tx.direction === 'sent').length || 0;
    const receivedFrequency = partner.totalReceived / partner.transactions.filter(tx => tx.direction === 'received').length || 0;
    
    // Extract transaction values
    const txValues = partner.transactions.map(tx => parseFloat(tx.value));
    
    // Calculate value statistics
    const avgValue = txValues.reduce((sum, val) => sum + val, 0) / txValues.length;
    const maxValue = Math.max(...txValues);
    const minValue = Math.min(...txValues);
    const valueRange = maxValue - minValue;
    
    // Check for round number pattern
    const roundNumbers = txValues.filter(val => {
      const decimalPlaces = val.toString().split('.')[1]?.length || 0;
      return decimalPlaces <= 1 && (val % 0.5 === 0 || val % 0.1 === 0);
    });
    const roundNumberRatio = roundNumbers.length / txValues.length;
    
    // Store behavioral profile
    addressBehaviors[partner.address] = {
      address: partner.address,
      sentFrequency,
      receivedFrequency,
      avgValue,
      valueRange,
      roundNumberRatio,
      transactionCount: partner.transactions.length,
      // Add anomaly info if available
      hasAnomalies: partner.anomalies?.hasAnomalies || false,
      anomalyTypes: [
        partner.anomalies?.largeTransfers?.length ? 'large_transfers' : null,
        partner.anomalies?.unusualFrequency ? 'unusual_frequency' : null,
        partner.anomalies?.irregularPattern ? 'irregular_pattern' : null
      ].filter(Boolean)
    };
  });
  
  // Group addresses with similar behaviors
  const addresses = Object.values(addressBehaviors);
  
  // Skip if not enough addresses with behavior data
  if (addresses.length < 2) return clusters;
  
  // Compare every address with every other
  for (let i = 0; i < addresses.length; i++) {
    const addr1 = addresses[i];
    
    const similarAddresses = [{ address: addr1.address, confidence: 100 }];
    
    for (let j = 0; j < addresses.length; j++) {
      if (i === j) continue;
      const addr2 = addresses[j];
      
      // Calculate behavioral similarity score
      let similarity = 0;
      
      // Compare transaction frequency patterns
      const freqSimilarity = 1 - Math.min(1,
        (Math.abs(addr1.sentFrequency - addr2.sentFrequency) / (Math.max(addr1.sentFrequency, addr2.sentFrequency) || 1) * 0.5) +
        (Math.abs(addr1.receivedFrequency - addr2.receivedFrequency) / (Math.max(addr1.receivedFrequency, addr2.receivedFrequency) || 1) * 0.5)
      );
      
      // Compare transaction value patterns
      const valueSimilarity = 1 - Math.min(1,
        Math.abs(addr1.avgValue - addr2.avgValue) / (Math.max(addr1.avgValue, addr2.avgValue) || 1)
      );
      
      // Compare round number preferences
      const roundSimilarity = 1 - Math.abs(addr1.roundNumberRatio - addr2.roundNumberRatio);
      
      // Compare anomaly patterns
      let anomalySimilarity = 0;
      if (addr1.anomalyTypes.length === 0 && addr2.anomalyTypes.length === 0) {
        anomalySimilarity = 1; // Both have no anomalies
      } else if (addr1.anomalyTypes.length > 0 && addr2.anomalyTypes.length > 0) {
        // Calculate set similarity for anomaly types
        const set1 = new Set(addr1.anomalyTypes);
        const set2 = new Set(addr2.anomalyTypes);
        anomalySimilarity = calculateSetSimilarity(set1, set2);
      }
      
      // Weighted total similarity
      similarity = (freqSimilarity * 0.35) + (valueSimilarity * 0.25) + 
                   (roundSimilarity * 0.2) + (anomalySimilarity * 0.2);
      
      // If similarity is above threshold, they might be the same entity
      if (similarity > 0.85) {
        similarAddresses.push({
          address: addr2.address,
          confidence: Math.round(similarity * 100)
        });
      }
    }
    
    // Create a cluster if we found similar addresses
    if (similarAddresses.length > 1) {
      // Avoid duplicate clusters (check if this would mostly be a subset of an existing cluster)
      let isSubset = false;
      for (const cluster of clusters) {
        const clusterAddrs = new Set(cluster.addresses.map(a => a.address));
        const newAddrs = new Set(similarAddresses.map(a => a.address));
        
        const intersection = new Set([...clusterAddrs].filter(x => newAddrs.has(x)));
        
        if (intersection.size >= similarAddresses.length * 0.7) {
          isSubset = true;
          break;
        }
      }
      
      if (!isSubset) {
        clusters.push({
          id: `behavioral-${clusters.length + 1}`,
          name: `Behavioral Group ${clusters.length + 1}`,
          type: 'behavioral',
          addresses: similarAddresses,
          confidence: Math.round(
            similarAddresses.reduce((sum, addr) => sum + addr.confidence, 0) / similarAddresses.length
          ),
          reasons: ["Similar transaction value patterns", "Similar anomaly profiles"]
        });
      }
    }
  }
  
  return clusters;
};

/**
 * Identifies clusters based on advanced heuristics
 * @param {Object} graph - Graph representation of addresses
 * @param {Array} transferPartners - List of address partners
 * @returns {Array} Heuristic-based clusters
 */
const identifyHeuristicClusters = (graph, transferPartners) => {
  const clusters = [];
  
  // Address change heuristic (sequential transfers between addresses)
  const changeHeuristic = detectAddressChanges(transferPartners);
  if (changeHeuristic.length > 0) {
    clusters.push({
      id: `change-heuristic-1`,
      name: `Sequential Transfer Group`,
      type: 'heuristic',
      addresses: changeHeuristic.map(addr => ({ 
        address: addr, 
        confidence: 90
      })),
      confidence: 90,
      reasons: ["Sequential transfers suggesting address change", "Fund migration pattern"]
    });
  }
  
  // Round-number transfers heuristic
  const roundNumberClusters = detectRoundNumberPatterns(transferPartners);
  clusters.push(...roundNumberClusters);
  
  return clusters;
};

/**
 * Detects potential address changes (sequential transfers of entire balance)
 * @param {Array} transferPartners - List of address partners
 * @returns {Array} List of addresses that might be the same entity
 */
const detectAddressChanges = (transferPartners) => {
  const addressChanges = [];
  
  // Look for large transfers (>90% of balance) between addresses
  for (const partner of transferPartners) {
    if (partner.transactions.length === 0) continue;
    
    // Find large outgoing transactions
    const largeOutgoing = partner.transactions.filter(tx => {
      return tx.direction === 'sent' && parseFloat(tx.value) > partner.totalReceived * 0.9;
    });
    
    if (largeOutgoing.length > 0) {
      // Get recipient addresses of these large transfers
      const recipients = largeOutgoing.map(tx => {
        // Find the recipient partner
        const recipient = transferPartners.find(p => p.address === tx.partnerAddress);
        return recipient;
      }).filter(Boolean);
      
      // If we found recipients and they have similar behavior
      if (recipients.length > 0) {
        addressChanges.push(partner.address);
        recipients.forEach(recipient => {
          if (!addressChanges.includes(recipient.address)) {
            addressChanges.push(recipient.address);
          }
        });
      }
    }
  }
  
  return addressChanges;
};

/**
 * Detects addresses with similar round-number transaction patterns
 * @param {Array} transferPartners - List of address partners
 * @returns {Array} Clusters of addresses with similar round-number patterns
 */
const detectRoundNumberPatterns = (transferPartners) => {
  const clusters = [];
  const roundNumberPreferences = {};
  
  // Calculate round number preferences for each address
  for (const partner of transferPartners) {
    if (partner.transactions.length < 5) continue;
    
    const txValues = partner.transactions.map(tx => parseFloat(tx.value));
    
    // Check for different types of round numbers
    const countsByType = {
      wholeNumbers: txValues.filter(val => Number.isInteger(val)).length,
      halfNumbers: txValues.filter(val => !Number.isInteger(val) && val % 0.5 === 0).length,
      tenthNumbers: txValues.filter(val => !Number.isInteger(val) && val % 0.1 === 0 && val % 0.5 !== 0).length,
      otherNumbers: txValues.filter(val => 
        !Number.isInteger(val) && val % 0.1 !== 0
      ).length
    };
    
    // Calculate proportion of each type
    const total = Object.values(countsByType).reduce((sum, count) => sum + count, 0);
    const preferences = {};
    for (const [type, count] of Object.entries(countsByType)) {
      preferences[type] = count / total;
    }
    
    roundNumberPreferences[partner.address] = {
      address: partner.address,
      preferences,
      totalTransactions: partner.transactions.length
    };
  }
  
  // Group addresses with similar round number preferences
  const addresses = Object.values(roundNumberPreferences);
  
  if (addresses.length < 2) return clusters;
  
  for (let i = 0; i < addresses.length; i++) {
    const addr1 = addresses[i];
    
    const similarAddresses = [{ address: addr1.address, confidence: 100 }];
    
    for (let j = 0; j < addresses.length; j++) {
      if (i === j) continue;
      const addr2 = addresses[j];
      
      // Calculate similarity of round number preferences
      let similarity = 1 - (
        Math.abs(addr1.preferences.wholeNumbers - addr2.preferences.wholeNumbers) +
        Math.abs(addr1.preferences.halfNumbers - addr2.preferences.halfNumbers) +
        Math.abs(addr1.preferences.tenthNumbers - addr2.preferences.tenthNumbers) +
        Math.abs(addr1.preferences.otherNumbers - addr2.preferences.otherNumbers)
      ) / 4;
      
      if (similarity > 0.9) {
        similarAddresses.push({
          address: addr2.address,
          confidence: Math.round(similarity * 100)
        });
      }
    }
    
    if (similarAddresses.length > 1) {
      let isSubset = false;
      for (const cluster of clusters) {
        const clusterAddrs = new Set(cluster.addresses.map(a => a.address));
        const newAddrs = new Set(similarAddresses.map(a => a.address));
        
        const intersection = new Set([...clusterAddrs].filter(x => newAddrs.has(x)));
        
        if (intersection.size >= similarAddresses.length * 0.7) {
          isSubset = true;
          break;
        }
      }
      
      if (!isSubset) {
        clusters.push({
          id: `round-number-${clusters.length + 1}`,
          name: `Round Number Group ${clusters.length + 1}`,
          type: 'heuristic',
          addresses: similarAddresses,
          confidence: Math.round(
            similarAddresses.reduce((sum, addr) => sum + addr.confidence, 0) / similarAddresses.length
          ),
          reasons: ["Similar round number preferences", "Consistent value pattern across addresses"]
        });
      }
    }
  }
  
  return clusters;
};

/**
 * Merges clusters from different techniques, resolving conflicts
 * @param {Array} clusterResults - Results from different clustering techniques
 * @returns {Array} Merged clusters
 */
const mergeClusters = (clusterResults) => {
  // Flatten all clusters
  const allClusters = clusterResults.flat();
  
  if (allClusters.length === 0) return [];
  
  // Track which addresses are assigned to which clusters
  const addressToCluster = new Map();
  
  // Sort clusters by confidence (highest first)
  allClusters.sort((a, b) => b.confidence - a.confidence);
  
  const mergedClusters = [];
  
  // Process clusters in order of confidence
  for (const cluster of allClusters) {
    const clusterAddresses = cluster.addresses.map(a => a.address);
    
    // Check how many addresses are already assigned to other clusters
    const alreadyAssigned = clusterAddresses.filter(addr => addressToCluster.has(addr));
    
    // If more than half are already assigned, skip this cluster
    if (alreadyAssigned.length > clusterAddresses.length / 2) continue;
    
    // Create a new merged cluster
    const newCluster = {
      id: `merged-${mergedClusters.length + 1}`,
      name: `Identity Cluster ${mergedClusters.length + 1}`,
      type: cluster.type,
      addresses: cluster.addresses,
      confidence: cluster.confidence,
      reasons: cluster.reasons
    };
    
    mergedClusters.push(newCluster);
    
    // Mark all addresses in this cluster as assigned
    clusterAddresses.forEach(addr => {
      addressToCluster.set(addr, newCluster.id);
    });
  }
  
  return mergedClusters;
};

/**
 * Calculate the risk of a cluster based on its transaction patterns
 * @param {Object} cluster - The cluster to analyze
 * @param {Array} transferPartners - List of address partners
 * @returns {Object} Risk assessment
 */
export const assessClusterRisk = (cluster, transferPartners) => {
  if (!cluster || !cluster.addresses || cluster.addresses.length === 0) {
    return {
      score: 0,
      level: 'Unknown',
      factors: []
    };
  }
  
  let baseScore = 50; // Start at neutral
  const riskFactors = [];
  const protectiveFactors = [];
  
  // Get all partners in this cluster
  const clusterAddresses = cluster.addresses.map(a => a.address);
  const partners = transferPartners.filter(p => clusterAddresses.includes(p.address));
  
  // Check for risk factors
  
  // 1. Analyze anomalies in the cluster
  const anomalyCounts = {
    largeTransfers: 0,
    unusualFrequency: 0,
    irregularPattern: 0
  };
  
  partners.forEach(partner => {
    if (partner.anomalies?.largeTransfers?.length) {
      anomalyCounts.largeTransfers += partner.anomalies.largeTransfers.length;
    }
    if (partner.anomalies?.unusualFrequency) {
      anomalyCounts.unusualFrequency++;
    }
    if (partner.anomalies?.irregularPattern) {
      anomalyCounts.irregularPattern++;
    }
  });
  
  if (anomalyCounts.largeTransfers > 0) {
    baseScore += 15;
    riskFactors.push(`${anomalyCounts.largeTransfers} unusually large transactions detected across the cluster`);
  }
  
  if (anomalyCounts.unusualFrequency > 0) {
    baseScore += 10;
    riskFactors.push(`${anomalyCounts.unusualFrequency} addresses show unusual transaction timing`);
  }
  
  if (anomalyCounts.irregularPattern > 0) {
    baseScore += 10;
    riskFactors.push(`${anomalyCounts.irregularPattern} addresses show irregular transaction patterns`);
  }
  
  // 2. Analyze distribution patterns
  const maxDistribution = Math.max(...partners.map(p => {
    const distributionPartners = new Set(p.transactions
      .filter(tx => tx.direction === 'sent')
      .map(tx => tx.partnerAddress));
    return distributionPartners.size;
  }));
  
  if (maxDistribution > 20) {
    baseScore += 15;
    riskFactors.push(`High distribution to ${maxDistribution} different addresses from a single address`);
  }
  
  // 3. Analyze total transfer volume
  const totalVolume = partners.reduce((sum, p) => sum + p.totalSent + p.totalReceived, 0);
  if (totalVolume > 100) {
    baseScore += 10;
    riskFactors.push(`High total transfer volume (${totalVolume.toFixed(2)} ETH)`);
  }
  
  // 4. Check for protective factors
  const hasRegularTransactions = partners.some(p => {
    // Check for regular intervals between transactions
    const txTimestamps = p.transactions
      .filter(tx => tx.timestamp)
      .map(tx => new Date(tx.timestamp).getTime())
      .sort((a, b) => a - b);
    
    if (txTimestamps.length < 5) return false;
    
    const intervals = [];
    for (let i = 1; i < txTimestamps.length; i++) {
      intervals.push(txTimestamps[i] - txTimestamps[i - 1]);
    }
    
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    
    return cv < 0.5; // Low coefficient of variation indicates regularity
  });
  
  if (hasRegularTransactions) {
    baseScore -= 20;
    protectiveFactors.push('Regular periodic transactions suggest legitimate scheduled activity');
  }
  
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