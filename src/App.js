import React, { useState, useEffect } from 'react';
import './App.css';
import { 
  initializeAlchemy, 
  getAddressTransactions, 
  processTransferPartners,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch
} from './services/alchemyService';
import TransferDetails from './components/TransferDetails';
import TransferGraphD3 from './components/TransferGraphD3';
import TimelineVisualization from './components/TimelineVisualization';
import PatternAnalysis from './components/PatternAnalysis';
import GasUsageAnalysis from './components/GasUsageAnalysis';
import TransactionVolumeHeatmap from './components/TransactionVolumeHeatmap';
import TreeMapVisualization from './components/TreeMapVisualization';
import ProfitLossAnalysis from './components/ProfitLossAnalysis';
import SavedSearches from './components/SavedSearches';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import InfoButton from './components/ui/InfoButton';
import { generateSampleTreeMapData, processTransfersForTreeMap } from './services/treeMapService';

function App() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Alchemy settings
  const [isAlchemyInitialized, setIsAlchemyInitialized] = useState(false);
  
  // Transfer data
  const [searchAddress, setSearchAddress] = useState('');
  const [transferPartners, setTransferPartners] = useState([]);
  const [transactions, setTransactions] = useState(null);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  
  // Selected partner for details view
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  // Visualization options
  const [visualizationMode, setVisualizationMode] = useState('standard'); // 'standard', 'timeline', 'heatmap', 'treemap'
  
  // Analysis options
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showGasAnalysis, setShowGasAnalysis] = useState(false);
  const [showProfitLossAnalysis, setShowProfitLossAnalysis] = useState(false);
  
  // Time filter options
  const [timeFilter, setTimeFilter] = useState({
    enabled: false,
    startBlock: '',
    endBlock: ''
  });
  
  // Helper function to validate block numbers
  const validateBlockNumber = (value) => {
    // Empty value is valid (will not be applied as filter)
    if (!value.trim()) return true;
    // Should be a number
    return !isNaN(value) && parseInt(value) > 0;
  };
  
  // Saved searches
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [searchNameInput, setSearchNameInput] = useState('');
  const [showSavedSearchManager, setShowSavedSearchManager] = useState(false);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'totalValue',
    direction: 'descending'
  });
  
  // Anomaly filter
  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(false);

  useEffect(() => {
    // Auto-initialize Alchemy if API key exists in environment
    if (process.env.REACT_APP_ALCHEMY_API_KEY) {
      try {
        initializeAlchemy();
        setIsAlchemyInitialized(true);
        console.log("Alchemy SDK initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Alchemy SDK:", error);
        setError("Failed to initialize Alchemy SDK. Check console for details.");
      }
    } else {
      console.warn("No Alchemy API key found in environment variables");
    }
    
    // Load saved searches
    setSavedSearches(getSavedSearches());
  }, []);
  
  // Handle time filter changes
  const handleTimeFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setTimeFilter({
        ...timeFilter,
        enabled: checked
      });
    } else {
      setTimeFilter({
        ...timeFilter,
        [name]: value
      });
    }
  };
  
  const handleAddressChange = (e) => {
    setSearchAddress(e.target.value);
  };
  
  const validateAddress = (address) => {
    // Simple Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  const handleSaveSearch = () => {
    if (searchAddress && validateAddress(searchAddress)) {
      // Save search with extended information
      saveSearch(searchAddress, searchNameInput, {
        timeFilter: timeFilter.enabled ? {
          startBlock: timeFilter.startBlock,
          endBlock: timeFilter.endBlock
        } : null,
        visualizationMode: visualizationMode,
        lastResults: {
          partnerCount: transferPartners.length,
          timestamp: new Date().toISOString()
        }
      });
      
      setSavedSearches(getSavedSearches());
      setSearchNameInput('');
    }
  };
  
  const handleDeleteSearch = (searchId) => {
    deleteSavedSearch(searchId);
    setSavedSearches(getSavedSearches());
  };
  
  const handleLoadSearch = (address) => {
    setSearchAddress(address);
    setShowSavedSearches(false);
  };
  
  const handleSelectSavedSearch = (search) => {
    setSearchAddress(search.address);
    
    // Restore time filters if available
    if (search.timeFilter) {
      setTimeFilter({
        enabled: true,
        startBlock: search.timeFilter.startBlock || '',
        endBlock: search.timeFilter.endBlock || ''
      });
    } else {
      setTimeFilter({
        enabled: false,
        startBlock: '',
        endBlock: ''
      });
    }
    
    // Set visualization mode if available
    if (search.visualizationMode) {
      setVisualizationMode(search.visualizationMode);
    }
    
    // Close the saved search manager
    setShowSavedSearchManager(false);
    
    // Fetch transfer history with the loaded search parameters
    fetchTransferHistory();
  };
  
  const fetchTransferHistory = async () => {
    if (!isAlchemyInitialized) {
      setError('Please initialize Alchemy SDK with your API key first.');
      return;
    }
    
    if (!validateAddress(searchAddress)) {
      setError('Please enter a valid Ethereum address.');
      return;
    }
    
    // Validate time filter inputs if enabled
    if (timeFilter.enabled) {
      if (timeFilter.startBlock && !validateBlockNumber(timeFilter.startBlock)) {
        setError('Please enter a valid start block number.');
        return;
      }
      
      if (timeFilter.endBlock && !validateBlockNumber(timeFilter.endBlock)) {
        setError('Please enter a valid end block number.');
        return;
      }
      
      // Validate start < end if both are provided
      if (timeFilter.startBlock && timeFilter.endBlock) {
        const start = parseInt(timeFilter.startBlock);
        const end = parseInt(timeFilter.endBlock);
        
        if (start >= end) {
          setError('Start block must be less than end block.');
          return;
        }
      }
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Determine if time filters should be applied
      let startTime = null;
      let endTime = null;
      
      if (timeFilter.enabled) {
        if (timeFilter.startBlock) {
          startTime = timeFilter.startBlock.trim();
        }
        if (timeFilter.endBlock) {
          endTime = timeFilter.endBlock.trim();
        }
      }
      
      // Fetch transactions using Alchemy SDK with optional time filters
      const transactions = await getAddressTransactions(searchAddress, startTime, endTime);
      
      // Process transactions to find unique EOAs and transfer amounts
      const partners = processTransferPartners(transactions);
      
      if (partners.length === 0) {
        setError('No transfer history found for this address in the specified range.');
      }
      
      // Store the raw transactions for pattern analysis
      setTransactions(transactions);
      setTransferPartners(partners);
      setShowTransferHistory(true);
      setLoading(false);
      
      // Reset analysis state when loading new data
      setShowAnalysis(false);
      setShowGasAnalysis(false);
      setShowProfitLossAnalysis(false);
      
      // Auto-save this search with extended information
      saveSearch(searchAddress, '', {
        timeFilter: timeFilter.enabled ? {
          startBlock: timeFilter.startBlock,
          endBlock: timeFilter.endBlock
        } : null,
        visualizationMode: visualizationMode,
        lastResults: {
          partnerCount: partners.length,
          timestamp: new Date().toISOString()
        }
      });
      setSavedSearches(getSavedSearches());
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      const errorMessage = error.message || 'Failed to fetch transfer history. Please try again.';
      setError(`Error: ${errorMessage}`);
      setLoading(false);
    }
  };
  
  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const formatEther = (value, asset = 'ETH') => {
    if (asset === 'ETH') {
      return parseFloat(value).toFixed(4) + ' ETH';
    }
    return parseFloat(value).toFixed(4) + ' ' + asset;
  };
  
  const openTransferDetails = (partner) => {
    setSelectedPartner(partner);
  };
  
  const closeTransferDetails = () => {
    setSelectedPartner(null);
  };
  
  // Sort and filter function for the transfer partners
  const sortedPartners = React.useMemo(() => {
    // First filter by anomalies if the filter is active
    let filteredPartners = [...transferPartners];
    
    if (showOnlyAnomalies) {
      filteredPartners = filteredPartners.filter(
        partner => partner.anomalies && partner.anomalies.hasAnomalies
      );
    }
    
    // Then sort
    if (sortConfig.key) {
      filteredPartners.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'address') {
          aValue = a.address;
          bValue = b.address;
        } else if (sortConfig.key === 'totalSent') {
          aValue = a.totalSent;
          bValue = b.totalSent;
        } else if (sortConfig.key === 'totalReceived') {
          aValue = a.totalReceived;
          bValue = b.totalReceived;
        } else if (sortConfig.key === 'totalValue') {
          aValue = a.totalSent + a.totalReceived;
          bValue = b.totalSent + b.totalReceived;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return filteredPartners;
  }, [transferPartners, sortConfig, showOnlyAnomalies]);
  
  // Handle column header click for sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="app min-h-screen bg-white p-4">
      <header className="app-header">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">EtherFlow</h1>
        <p className="text-lg text-gray-300 mb-2">Ethereum Transaction Analysis Made Simple</p>
        {error && <p className="text-red-500 bg-red-50 p-2 rounded-md">{error}</p>}
      </header>

      <main className="app-main">
        <Card className="w-full max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle>
              EtherFlow Dashboard
              <InfoButton title="About EtherFlow">
                <h3>EtherFlow - Ethereum Analysis Tool</h3>
                <p>Analyze Ethereum address transaction patterns and relationships with other addresses.</p>
                
                <h4>Key Features:</h4>
                <div className="feature-list">
                  <div className="feature-item">
                    <strong>Address Analysis:</strong> View all EOA accounts that have transferred ETH with your target address
                  </div>
                  <div className="feature-item">
                    <strong>Transaction Visualization:</strong> Multiple chart types to understand transfer patterns
                  </div>
                  <div className="feature-item">
                    <strong>Anomaly Detection:</strong> Identify unusual transaction patterns automatically
                  </div>
                  <div className="feature-item">
                    <strong>Time Filtering:</strong> Analyze specific time periods using block numbers
                  </div>
                </div>
                
                <div className="tip">
                  <strong>Tip:</strong> Use the time-based filtering to focus on specific periods of activity.
                </div>
              </InfoButton>
            </CardTitle>
            <CardDescription>
              Enter an Ethereum address to see all EOA accounts it has transferred ETH with,
              along with the amounts transferred.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {!isAlchemyInitialized && (
              <div className="bg-red-50 p-4 mb-4 rounded-md border border-red-200">
                <p className="text-red-600">Alchemy API key not found in environment variables. Please check your .env file.</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  Search Address
                  <InfoButton title="How to Search Addresses">
                    <h3>Ethereum Address Search</h3>
                    <p>Enter any valid Ethereum address to analyze its transaction history.</p>
                    
                    <h4>Address Format:</h4>
                    <ul>
                      <li>Must start with <code>0x</code></li>
                      <li>Followed by 40 hexadecimal characters</li>
                      <li>Example: <code>0x742d35cc6634c0532925a3b8d0949d2c</code></li>
                    </ul>
                    
                    <h4>What You'll See:</h4>
                    <ul>
                      <li><strong>Transfer Partners:</strong> All addresses that sent/received ETH</li>
                      <li><strong>Transaction Amounts:</strong> Total sent and received values</li>
                      <li><strong>Anomaly Indicators:</strong> Unusual patterns highlighted</li>
                      <li><strong>Visual Networks:</strong> Interactive relationship graphs</li>
                    </ul>
                    
                    <div className="warning">
                      <strong>Note:</strong> Only EOA (Externally Owned Account) transfers are shown, not contract interactions.
                    </div>
                  </InfoButton>
                </h3>
                
                {/* Saved Searches Button */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => setShowSavedSearches(!showSavedSearches)} 
                    variant="outline"
                    size="sm"
                  >
                    {showSavedSearches ? 'Hide Saved Searches' : 'Quick Search History'}
                  </Button>
                  <Button 
                    onClick={() => setShowSavedSearchManager(true)} 
                    variant="secondary"
                    size="sm"
                  >
                    Manage Saved Searches
                  </Button>
                </div>
              </div>
              
              {/* Saved Searches Dropdown */}
              {showSavedSearches && (
                <div className="saved-searches-panel p-3 bg-gray-50 border rounded-md mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Saved Searches</h4>
                  </div>
                  
                  {savedSearches.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved searches yet</p>
                  ) : (
                    <div className="saved-searches-list max-h-60 overflow-y-auto">
                      {savedSearches.map((search) => (
                        <div key={search.id} className="saved-search-item flex justify-between items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <div onClick={() => handleLoadSearch(search.address)}>
                            <div className="font-medium">{search.name}</div>
                            <div className="text-sm text-gray-500">{search.address}</div>
                            <div className="text-xs text-gray-400">{new Date(search.date).toLocaleString()}</div>
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSearch(search.id);
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Save Current Search */}
                  <div className="save-search-form mt-3 pt-3 border-t">
                    <div className="flex space-x-2">
                      <Input 
                        type="text" 
                        placeholder="Search name (optional)" 
                        value={searchNameInput}
                        onChange={(e) => setSearchNameInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSaveSearch} 
                        disabled={!validateAddress(searchAddress)}
                        variant="secondary"
                        size="sm"
                      >
                        Save Current
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Search Input */}
              <div className="flex space-x-2">
                <Input 
                  type="text" 
                  placeholder="Enter Ethereum address (0x...)" 
                  value={searchAddress}
                  onChange={handleAddressChange}
                  className="flex-1"
                />
                <Button 
                  onClick={fetchTransferHistory} 
                  disabled={!isAlchemyInitialized || loading}
                  variant="default"
                >
                  {loading ? 'Loading...' : 'Search'}
                </Button>
              </div>
              
              {/* Time-based filters */}
              <div className="time-filters mt-4">
                <div className="flex items-center mb-2">
                  <input 
                    type="checkbox" 
                    id="enable-time-filter" 
                    checked={timeFilter.enabled}
                    onChange={handleTimeFilterChange}
                    className="mr-2"
                  />
                  <label htmlFor="enable-time-filter" className="text-sm font-medium">
                    Enable Time-Based Filtering
                    <InfoButton title="Time-Based Filtering">
                      <h3>Time-Based Filtering</h3>
                      <p>Filter transactions by specific time periods using Ethereum block numbers.</p>
                      
                      <h4>How It Works:</h4>
                      <ul>
                        <li><strong>Block Numbers:</strong> Each transaction occurs in a specific block</li>
                        <li><strong>Time Range:</strong> Set start and end blocks to focus analysis</li>
                        <li><strong>Precision:</strong> More accurate than timestamps for blockchain data</li>
                      </ul>
                      
                      <h4>Use Cases:</h4>
                      <ul>
                        <li>Analyze activity during specific events</li>
                        <li>Focus on recent transactions only</li>
                        <li>Compare different time periods</li>
                        <li>Investigate suspicious activity windows</li>
                      </ul>
                      
                      <div className="tip">
                        <strong>Tip:</strong> Use <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer">Etherscan</a> to find block numbers for specific dates.
                      </div>
                    </InfoButton>
                  </label>
                </div>
                
                {timeFilter.enabled && (
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="flex-1">
                      <label htmlFor="start-block" className="text-xs text-gray-500 block mb-1">
                        Start Block (or timestamp)
                      </label>
                      <Input 
                        id="start-block"
                        name="startBlock"
                        type="text" 
                        placeholder="e.g., 15000000" 
                        value={timeFilter.startBlock}
                        onChange={handleTimeFilterChange}
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="end-block" className="text-xs text-gray-500 block mb-1">
                        End Block (or timestamp)
                      </label>
                      <Input 
                        id="end-block"
                        name="endBlock"
                        type="text" 
                        placeholder="e.g., 16000000" 
                        value={timeFilter.endBlock}
                        onChange={handleTimeFilterChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          {showTransferHistory && (
            <>
              {/* Visualization Controls */}
              {transferPartners.length > 0 && (
                <div className="visualization-controls">
                  <div className="visualization-header">
                    <h3>Visualization Options</h3>
                    <InfoButton title="About Visualizations">
                      <h3>Transaction Visualizations</h3>
                      <p>Different ways to view and analyze transaction patterns:</p>
                      
                      <h4>Available Visualizations:</h4>
                      <div className="feature-list">
                        <div className="feature-item">
                          <strong>Standard Network:</strong> Interactive node-link graph showing address relationships
                        </div>
                        <div className="feature-item">
                          <strong>Timeline View:</strong> Chronological visualization of transactions over time
                        </div>
                        <div className="feature-item">
                          <strong>Volume Heatmap:</strong> Time-based transaction patterns and volume analysis
                        </div>
                        <div className="feature-item">
                          <strong>Tree Map:</strong> Hierarchical view of transaction volumes
                        </div>
                      </div>
                      
                      <div className="tip">
                        <strong>Tip:</strong> Each visualization reveals different aspects of the transaction patterns. Try switching between them for comprehensive analysis.
                      </div>
                    </InfoButton>
                  </div>
                  <div className="visualization-buttons">
                    <button
                      className={visualizationMode === 'standard' ? 'active' : ''}
                      onClick={() => setVisualizationMode('standard')}
                    >
                      Standard Network
                    </button>
                    <button
                      className={visualizationMode === 'timeline' ? 'active' : ''}
                      onClick={() => setVisualizationMode('timeline')}
                    >
                      Timeline View
                    </button>
                    <button
                      className={visualizationMode === 'heatmap' ? 'active' : ''}
                      onClick={() => setVisualizationMode('heatmap')}
                    >
                      Volume Heatmap
                    </button>
                    <button
                      className={visualizationMode === 'treemap' ? 'active' : ''}
                      onClick={() => setVisualizationMode('treemap')}
                    >
                      Tree Map
                    </button>
                  </div>
                </div>
              )}
              
              {/* Selected Visualization */}
              {transferPartners.length > 0 && visualizationMode === 'standard' && (
                <TransferGraphD3 
                  transferPartners={transferPartners} 
                  searchAddress={searchAddress}
                />
              )}
              
              {transferPartners.length > 0 && visualizationMode === 'timeline' && (
                <TimelineVisualization
                  transferPartners={transferPartners}
                  searchAddress={searchAddress}
                />
              )}
              
              
              {transferPartners.length > 0 && visualizationMode === 'heatmap' && (
                <TransactionVolumeHeatmap
                  transferPartners={transferPartners}
                  searchAddress={searchAddress}
                />
              )}
              
              {transferPartners.length > 0 && visualizationMode === 'treemap' && (
                <TreeMapVisualization
                  data={(() => {
                    // First try to process the actual data
                    const processedData = processTransfersForTreeMap(transferPartners, {
                      rootName: `${formatAddress(searchAddress)} Transfers`,
                      groupBy: 'address'
                    });
                    
                    // If the processed data is invalid or empty, use sample data
                    if (!processedData || !processedData.children || processedData.children.length === 0) {
                      console.log("Using sample tree map data instead");
                      return generateSampleTreeMapData();
                    }
                    
                    return processedData;
                  })()}
                  title={`Transaction Tree Map for ${formatAddress(searchAddress)}`}
                  colorScheme="viridis"
                />
              )}
              
              {/* Advanced Analytics */}
              {transferPartners.length > 0 && (
                <div className="analytics-section">
                  <div className="analytics-header">
                    <h3>Advanced Analytics</h3>
                    <InfoButton title="About Advanced Analytics">
                      <h3>Advanced Analytics Tools</h3>
                      <p>Powerful analysis features to detect patterns and anomalies in transaction data:</p>
                      
                      <h4>Available Analytics:</h4>
                      <div className="feature-list">
                        <div className="feature-item">
                          <strong>Pattern Analysis:</strong> Detect unusual transaction patterns, timing anomalies, and suspicious behavior
                        </div>
                        <div className="feature-item">
                          <strong>Gas Analysis:</strong> Analyze gas usage patterns to understand transaction complexity and costs
                        </div>
                        <div className="feature-item">
                          <strong>Profit/Loss Analysis:</strong> Calculate net gains/losses and track value flow over time
                        </div>
                      </div>
                      
                      <h4>Use Cases:</h4>
                      <ul>
                        <li>Fraud detection and suspicious activity identification</li>
                        <li>Portfolio performance tracking</li>
                        <li>Transaction cost optimization</li>
                        <li>Behavioral pattern recognition</li>
                      </ul>
                      
                      <div className="warning">
                        <strong>Note:</strong> Analytics are based on on-chain data only and should be used as investigative tools, not definitive proof.
                      </div>
                    </InfoButton>
                  </div>
                  <div className="analytics-buttons">
                    <button 
                      className={`analysis-toggle ${showAnalysis ? 'active' : ''}`} 
                      onClick={() => {
                        setShowAnalysis(!showAnalysis);
                        if (!showAnalysis) {
                          setShowGasAnalysis(false);
                          setShowProfitLossAnalysis(false);
                        }
                      }}
                    >
                      {showAnalysis ? 'Hide Pattern Analysis' : 'Show Pattern Analysis'}
                    </button>
                    <button 
                      className={`analysis-toggle ${showGasAnalysis ? 'active' : ''}`} 
                      onClick={() => {
                        setShowGasAnalysis(!showGasAnalysis);
                        if (!showGasAnalysis) {
                          setShowAnalysis(false);
                          setShowProfitLossAnalysis(false);
                        }
                      }}
                    >
                      {showGasAnalysis ? 'Hide Gas Analysis' : 'Show Gas Analysis'}
                    </button>
                    <button 
                      className={`analysis-toggle ${showProfitLossAnalysis ? 'active' : ''}`} 
                      onClick={() => {
                        setShowProfitLossAnalysis(!showProfitLossAnalysis);
                        if (!showProfitLossAnalysis) {
                          setShowAnalysis(false);
                          setShowGasAnalysis(false);
                        }
                      }}
                    >
                      {showProfitLossAnalysis ? 'Hide Profit/Loss Analysis' : 'Show Profit/Loss Analysis'}
                    </button>
                  </div>
                  
                  {showAnalysis && (
                    <PatternAnalysis 
                      transferPartners={transferPartners}
                      transactions={transactions}
                      searchAddress={searchAddress}
                    />
                  )}
                  
                  {showGasAnalysis && (
                    <GasUsageAnalysis
                      transactions={transactions}
                      searchAddress={searchAddress}
                    />
                  )}
                  
                  {showProfitLossAnalysis && (
                    <ProfitLossAnalysis
                      transactions={transactions}
                      searchAddress={searchAddress}
                    />
                  )}
                </div>
              )}
              
              {/* Transfer Partners List */}
              <div className="results-section">
                <div className="results-header">
                  <h3>
                    Transfer Partners
                    <InfoButton title="About Transfer Partners">
                      <h3>Transfer Partners Analysis</h3>
                      <p>Complete list of all addresses that have sent or received ETH with your target address.</p>
                      
                      <h4>Key Information:</h4>
                      <div className="feature-list">
                        <div className="feature-item">
                          <strong>Address:</strong> The partner's Ethereum address
                        </div>
                        <div className="feature-item">
                          <strong>Sent:</strong> Total ETH sent from target to partner
                        </div>
                        <div className="feature-item">
                          <strong>Received:</strong> Total ETH received from partner
                        </div>
                        <div className="feature-item">
                          <strong>Total Volume:</strong> Combined sent + received amounts
                        </div>
                      </div>
                      
                      <h4>Features:</h4>
                      <ul>
                        <li><strong>Sorting:</strong> Click column headers to sort by different criteria</li>
                        <li><strong>Anomaly Detection:</strong> Addresses with unusual patterns are highlighted</li>
                        <li><strong>Detailed View:</strong> Click any row for transaction details</li>
                        <li><strong>Export:</strong> Download data as JSON for further analysis</li>
                      </ul>
                      
                      <div className="tip">
                        <strong>Tip:</strong> Look for addresses with high volume or anomaly indicators for potentially interesting relationships.
                      </div>
                    </InfoButton>
                  </h3>
                  
                  {/* Anomaly filter toggle */}
                  <div className="filter-controls">
                    <label className="anomaly-filter">
                      <input 
                        type="checkbox" 
                        checked={showOnlyAnomalies} 
                        onChange={(e) => setShowOnlyAnomalies(e.target.checked)}
                      />
                      <span>
                        Show only anomalies
                        <InfoButton title="About Anomalies">
                          <h3>Anomaly Detection</h3>
                          <p>Automatically identified unusual transaction patterns that may indicate:</p>
                          
                          <h4>Types of Anomalies:</h4>
                          <ul>
                            <li><strong>Large Transfers:</strong> Transactions significantly above average amounts</li>
                            <li><strong>Unusual Timing:</strong> Rapid-fire transactions or irregular patterns</li>
                            <li><strong>Irregular Patterns:</strong> Behavior that deviates from normal transaction flows</li>
                          </ul>
                          
                          <h4>Use Cases:</h4>
                          <ul>
                            <li>Identify potential fraud or manipulation</li>
                            <li>Spot automated trading behaviors</li>
                            <li>Find addresses worth deeper investigation</li>
                            <li>Detect unusual market activities</li>
                          </ul>
                          
                          <div className="warning">
                            <strong>Important:</strong> Anomalies are statistical indicators, not proof of wrongdoing. Always investigate further before drawing conclusions.
                          </div>
                        </InfoButton>
                      </span>
                    </label>
                  </div>
                </div>
                
                {transferPartners.length === 0 ? (
                  <p>No transfer history found for this address.</p>
                ) : (
                  <div className="transfer-list">
                    <div className="transfer-item header">
                      <div 
                        className={`address sortable ${sortConfig.key === 'address' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('address')}
                      >
                        <span>Address</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div 
                        className={`amount sortable ${sortConfig.key === 'totalSent' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('totalSent')}
                      >
                        <span>Sent</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div 
                        className={`amount sortable ${sortConfig.key === 'totalReceived' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('totalReceived')}
                      >
                        <span>Received</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div 
                        className={`amount sortable ${sortConfig.key === 'totalValue' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('totalValue')}
                      >
                        <span>Total Volume</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div className="annotation">Annotation</div>
                      <div className="actions">Actions</div>
                    </div>
                    {sortedPartners.map((partner, index) => (
                      <div 
                        key={index} 
                        className={`transfer-item ${partner.anomalies?.hasAnomalies ? 'anomaly' : ''}`}
                        onClick={() => openTransferDetails(partner)}
                        style={{cursor: 'pointer'}}
                      >
                        <div className="address" title={partner.address}>
                          {partner.anomalies?.hasAnomalies && <span className="anomaly-indicator">⚠️</span>}
                          {partner.address}
                        </div>
                        <div className="amount sent">
                          {formatEther(partner.totalSent)}
                        </div>
                        <div className="amount received">
                          {formatEther(partner.totalReceived)}
                        </div>
                        <div className="amount total">
                          {formatEther(partner.totalSent + partner.totalReceived)}
                        </div>
                        <div className="annotation" title={partner.annotation || "Add annotation"}>
                          {partner.annotation ? 
                            (partner.annotation.length > 20 ? 
                              partner.annotation.substring(0, 20) + '...' : 
                              partner.annotation
                            ) : 
                            <span className="text-gray-400 text-sm">No annotation</span>
                          }
                          {partner.anomalies?.hasAnomalies && (
                            <div className="anomaly-tag" title={`Anomalies: ${partner.anomalies?.largeTransfers?.length ? `${partner.anomalies.largeTransfers.length} large transfers` : ''} ${partner.anomalies?.unusualFrequency ? 'Unusual timing' : ''} ${partner.anomalies?.irregularPattern ? 'Irregular pattern' : ''}`}>
                              Anomaly detected
                            </div>
                          )}
                        </div>
                        <div className="actions">
                          <Button variant="outline" size="sm" className="details-button">Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {showTransferHistory && transferPartners.length > 0 && (
            <CardFooter className="flex justify-between pt-6">
              <Button
                onClick={() => {
                  // Export data as JSON file
                  const dataStr = JSON.stringify(transferPartners, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  
                  const exportFileDefaultName = `${searchAddress.substring(0, 8)}_transfers.json`;
                  
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                variant="outline"
                size="sm"
              >
                Export JSON
              </Button>
              <p className="text-sm text-gray-500">
                Found {transferPartners.length} transfer partner(s)
              </p>
            </CardFooter>
          )}
        </Card>
      </main>

      <footer className="app-footer mt-8 py-4 border-t border-gray-200">
        <p className="text-center text-gray-500 text-sm">EtherFlow &copy; 2025 - Ethereum Transaction Analysis</p>
      </footer>
      
      {selectedPartner && (
        <TransferDetails 
          partner={selectedPartner} 
          onClose={closeTransferDetails} 
        />
      )}
      
      {showSavedSearchManager && (
        <SavedSearches 
          onSelectSearch={handleSelectSavedSearch}
          onClose={() => setShowSavedSearchManager(false)}
        />
      )}
    </div>
  );
}

export default App;