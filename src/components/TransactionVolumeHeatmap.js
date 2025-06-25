import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import InfoButton from './ui/InfoButton';
import './TransactionHeatMap.css';

const TransactionVolumeHeatmap = ({ transferPartners, searchAddress }) => {
  const svgRef = useRef(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapType, setHeatmapType] = useState('volume'); // 'volume', 'frequency', 'gas-cost', 'anomalies'
  const [timeResolution, setTimeResolution] = useState('hour'); // 'hour', 'day', 'week', 'month'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const tooltipRef = useRef(null);

  // Process transaction data into time-based heatmap
  useEffect(() => {
    if (!transferPartners || transferPartners.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Extract all transactions with timestamps
      const allTransactions = [];
      transferPartners.forEach(partner => {
        if (partner.transactions && partner.transactions.length > 0) {
          partner.transactions.forEach(tx => {
            if (tx.timestamp) {
              allTransactions.push({
                ...tx,
                partnerAddress: partner.address,
                date: new Date(tx.timestamp),
                value: parseFloat(tx.value) || 0,
                gasUsed: tx.gasUsed || 0,
                gasPrice: tx.gasPrice || 0,
                hasAnomaly: partner.anomalies?.hasAnomalies || false
              });
            }
          });
        }
      });

      if (allTransactions.length === 0) {
        setError('No transactions with timestamps found for heatmap visualization');
        setLoading(false);
        return;
      }

      // Sort transactions by timestamp
      allTransactions.sort((a, b) => a.date - b.date);

      // Create time-based grid data
      const gridData = createTimeGrid(allTransactions, timeResolution);
      setHeatmapData(gridData);
      setLoading(false);

    } catch (err) {
      console.error('Error processing heatmap data:', err);
      setError('Failed to process transaction data for heatmap');
      setLoading(false);
    }
  }, [transferPartners, timeResolution]);

  // Create time-based grid data
  const createTimeGrid = (transactions, resolution) => {
    if (transactions.length === 0) return [];

    const startDate = transactions[0].date;
    const endDate = transactions[transactions.length - 1].date;
    
    // Create time buckets based on resolution
    const timeBuckets = createTimeBuckets(startDate, endDate, resolution);
    
    // Create day-of-week or hour buckets for the other axis
    const periodBuckets = resolution === 'hour' ? 
      ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', 
       '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'] :
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize grid
    const grid = [];
    timeBuckets.forEach((timeBucket, timeIndex) => {
      periodBuckets.forEach((periodBucket, periodIndex) => {
        grid.push({
          timeIndex,
          periodIndex,
          timeBucket,
          periodBucket,
          transactions: [],
          volume: 0,
          count: 0,
          gasUsed: 0,
          gasCost: 0,
          anomalies: 0
        });
      });
    });

    // Populate grid with transaction data
    transactions.forEach(tx => {
      const timeIndex = getTimeBucketIndex(tx.date, startDate, resolution, timeBuckets.length);
      const periodIndex = resolution === 'hour' ? 
        tx.date.getHours() : 
        tx.date.getDay();

      const cell = grid.find(cell => 
        cell.timeIndex === timeIndex && cell.periodIndex === periodIndex
      );

      if (cell) {
        cell.transactions.push(tx);
        cell.volume += tx.value;
        cell.count += 1;
        cell.gasUsed += tx.gasUsed;
        cell.gasCost += (tx.gasUsed * tx.gasPrice);
        if (tx.hasAnomaly) {
          cell.anomalies += 1;
        }
      }
    });

    return {
      grid,
      timeBuckets,
      periodBuckets,
      maxVolume: Math.max(...grid.map(cell => cell.volume)),
      maxCount: Math.max(...grid.map(cell => cell.count)),
      maxGasCost: Math.max(...grid.map(cell => cell.gasCost)),
      maxAnomalies: Math.max(...grid.map(cell => cell.anomalies))
    };
  };

  // Create time buckets based on resolution
  const createTimeBuckets = (startDate, endDate, resolution) => {
    const buckets = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const bucketLabel = formatTimeBucket(current, resolution);
      buckets.push(bucketLabel);
      
      // Advance to next bucket
      switch (resolution) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          current.setDate(current.getDate() + 1);
      }
    }
    
    return buckets.slice(0, 50); // Limit to prevent overcrowding
  };

  // Format time bucket label
  const formatTimeBucket = (date, resolution) => {
    switch (resolution) {
      case 'hour':
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit' 
        });
      case 'day':
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case 'week':
        return `Week of ${date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })}`;
      case 'month':
        return date.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
      default:
        return date.toLocaleDateString();
    }
  };

  // Get time bucket index for a date
  const getTimeBucketIndex = (date, startDate, resolution, maxBuckets) => {
    let diffMs;
    let bucketMs;
    
    switch (resolution) {
      case 'hour':
        diffMs = date - startDate;
        bucketMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'day':
        diffMs = date - startDate;
        bucketMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'week':
        diffMs = date - startDate;
        bucketMs = 7 * 24 * 60 * 60 * 1000; // 1 week
        break;
      case 'month':
        diffMs = date - startDate;
        bucketMs = 30 * 24 * 60 * 60 * 1000; // ~1 month
        break;
      default:
        diffMs = date - startDate;
        bucketMs = 24 * 60 * 60 * 1000; // 1 day
    }
    
    return Math.min(Math.floor(diffMs / bucketMs), maxBuckets - 1);
  };

  // Render the heatmap
  useEffect(() => {
    if (!heatmapData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const containerWidth = svgRef.current.clientWidth;
    const width = Math.max(800, containerWidth);
    const height = 400;
    
    const margin = { top: 50, right: 100, bottom: 60, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll('*').remove();
    
    // Set SVG dimensions
    svg.attr('width', width).attr('height', height);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(heatmapData.timeBuckets)
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(heatmapData.periodBuckets)
      .range([0, innerHeight])
      .padding(0.1);

    // Create color scale based on heatmap type
    const colorScale = getColorScale(heatmapType, heatmapData);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Draw heatmap cells
    g.selectAll('.heatmap-cell')
      .data(heatmapData.grid)
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => xScale(d.timeBucket))
      .attr('y', d => yScale(d.periodBucket))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => getCellColor(d, heatmapType, colorScale))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseover', (event, d) => {
        // Highlight cell
        d3.select(event.currentTarget)
          .attr('stroke', '#333')
          .attr('stroke-width', 2);

        // Show tooltip
        tooltip
          .style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(getTooltipContent(d, heatmapType, timeResolution));
      })
      .on('mouseout', (event) => {
        // Remove highlight
        d3.select(event.currentTarget)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);

        // Hide tooltip
        tooltip.style('opacity', 0);
      })
      .on('click', (event, d) => {
        setSelectedCell(d);
      });

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '10px');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px');

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(timeResolution === 'hour' ? 'Hour of Day' : 'Day of Week');

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Time Period');

    // Add legend
    createHeatmapLegend(svg, width, height, colorScale, heatmapType);

  }, [heatmapData, heatmapType]);

  // Get color scale based on heatmap type
  const getColorScale = (type, data) => {
    let domain, colors;
    
    switch (type) {
      case 'volume':
        domain = [0, data.maxVolume];
        colors = ['#f7fbff', '#08519c'];
        break;
      case 'frequency':
        domain = [0, data.maxCount];
        colors = ['#fff5f0', '#67000d'];
        break;
      case 'gas-cost':
        domain = [0, data.maxGasCost];
        colors = ['#f7fcf5', '#00441b'];
        break;
      case 'anomalies':
        domain = [0, data.maxAnomalies];
        colors = ['#fff5f0', '#cb181d'];
        break;
      default:
        domain = [0, 1];
        colors = ['#f7f7f7', '#252525'];
    }
    
    return d3.scaleLinear()
      .domain(domain)
      .range(colors)
      .clamp(true);
  };

  // Get color for a cell
  const getCellColor = (cell, type, colorScale) => {
    switch (type) {
      case 'volume':
        return colorScale(cell.volume);
      case 'frequency':
        return colorScale(cell.count);
      case 'gas-cost':
        return colorScale(cell.gasCost);
      case 'anomalies':
        return colorScale(cell.anomalies);
      default:
        return '#ccc';
    }
  };

  // Create legend for the heatmap
  const createHeatmapLegend = (svg, width, height, colorScale, type) => {
    const legendWidth = 20;
    const legendHeight = 150;
    const xPosition = width - 80;
    const yPosition = 50;

    // Create gradient
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '0%')
      .attr('y2', '100%');

    // Add gradient stops
    const domain = colorScale.domain();
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colorScale(domain[1]));
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colorScale(domain[0]));

    // Draw legend rectangle
    svg.append('rect')
      .attr('x', xPosition)
      .attr('y', yPosition)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-legend-gradient)')
      .style('stroke', '#ccc');

    // Add legend title
    const titles = {
      'volume': 'Volume (ETH)',
      'frequency': 'Transactions',
      'gas-cost': 'Gas Cost',
      'anomalies': 'Anomalies'
    };
    
    svg.append('text')
      .attr('x', xPosition + legendWidth + 10)
      .attr('y', yPosition + 15)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(titles[type] || 'Value');

    // Add min/max labels
    svg.append('text')
      .attr('x', xPosition + legendWidth + 5)
      .attr('y', yPosition + 10)
      .style('font-size', '10px')
      .text(domain[1].toFixed(2));

    svg.append('text')
      .attr('x', xPosition + legendWidth + 5)
      .attr('y', yPosition + legendHeight + 5)
      .style('font-size', '10px')
      .text(domain[0].toFixed(2));
  };

  // Generate tooltip content
  const getTooltipContent = (cell, type, resolution) => {
    const period = resolution === 'hour' ? `${cell.periodBucket}:00` : cell.periodBucket;
    const time = cell.timeBucket;
    
    return `
      <div class="tooltip-title">${time} - ${period}</div>
      <div><strong>Transactions:</strong> ${cell.count}</div>
      <div><strong>Volume:</strong> ${cell.volume.toFixed(4)} ETH</div>
      <div><strong>Gas Used:</strong> ${cell.gasUsed.toLocaleString()}</div>
      <div><strong>Anomalies:</strong> ${cell.anomalies}</div>
    `;
  };

  // Handle control changes
  const handleHeatmapTypeChange = (e) => {
    setHeatmapType(e.target.value);
  };

  const handleTimeResolutionChange = (e) => {
    setTimeResolution(e.target.value);
  };

  // Render selected cell details
  const renderCellDetails = () => {
    if (!selectedCell) return null;

    return (
      <div className="cell-details">
        <div className="cell-details-header">
          <h4>Transaction Details</h4>
          <button 
            className="close-button"
            onClick={() => setSelectedCell(null)}
          >
            ×
          </button>
        </div>
        
        <div className="cell-info">
          <div><strong>Time:</strong> {selectedCell.timeBucket}</div>
          <div><strong>Period:</strong> {selectedCell.periodBucket}</div>
          <div><strong>Transactions:</strong> {selectedCell.count}</div>
          <div><strong>Total Volume:</strong> {selectedCell.volume.toFixed(4)} ETH</div>
          <div><strong>Gas Used:</strong> {selectedCell.gasUsed.toLocaleString()}</div>
          <div><strong>Anomalies:</strong> {selectedCell.anomalies}</div>
        </div>

        {selectedCell.transactions.length > 0 && (
          <div className="cell-transactions">
            <h5>Individual Transactions</h5>
            <div className="transaction-list">
              {selectedCell.transactions.slice(0, 5).map((tx, index) => (
                <div key={index} className="transaction-item">
                  <div className="tx-partner">{tx.partnerAddress.substring(0, 10)}...</div>
                  <div className="tx-value">{parseFloat(tx.value).toFixed(4)} ETH</div>
                  <div className="tx-direction">{tx.direction}</div>
                </div>
              ))}
              {selectedCell.transactions.length > 5 && (
                <div className="more-transactions">
                  +{selectedCell.transactions.length - 5} more transactions
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="transaction-heatmap-container">
      <div className="heatmap-header">
        <h3>
          Transaction Volume Heatmap
          <InfoButton title="About Transaction Volume Heatmap">
            <h3>Transaction Volume Heatmap</h3>
            <p>Visualizes actual transaction patterns over time using real blockchain data.</p>
            
            <h4>What This Shows:</h4>
            <div className="feature-list">
              <div className="feature-item">
                <strong>Time Patterns:</strong> When transactions occur most frequently
              </div>
              <div className="feature-item">
                <strong>Volume Distribution:</strong> ETH amounts transferred over time
              </div>
              <div className="feature-item">
                <strong>Gas Analysis:</strong> Transaction costs and complexity patterns
              </div>
              <div className="feature-item">
                <strong>Anomaly Timing:</strong> When unusual activity occurs
              </div>
            </div>
            
            <h4>How to Use:</h4>
            <ul>
              <li><strong>Heatmap Type:</strong> Switch between volume, frequency, gas costs, and anomalies</li>
              <li><strong>Time Resolution:</strong> Adjust granularity from hours to months</li>
              <li><strong>Color Intensity:</strong> Darker colors indicate higher values</li>
              <li><strong>Click Cells:</strong> View detailed transaction information</li>
            </ul>
            
            <div className="tip">
              <strong>Analysis Tips:</strong> Look for patterns like regular trading hours, weekend activity differences, or sudden spikes that might indicate automated trading or unusual events.
            </div>
            
            <div className="highlight">
              <strong>Real Data:</strong> Unlike geographical maps, this heatmap uses actual blockchain timestamps and transaction values from the Ethereum network.
            </div>
          </InfoButton>
        </h3>
      </div>
      
      <div className="heatmap-controls">
        <div className="control-group">
          <label htmlFor="heatmap-type">Visualization Type:</label>
          <select 
            id="heatmap-type" 
            value={heatmapType} 
            onChange={handleHeatmapTypeChange}
          >
            <option value="volume">Transaction Volume (ETH)</option>
            <option value="frequency">Transaction Frequency</option>
            <option value="gas-cost">Gas Costs</option>
            <option value="anomalies">Anomaly Distribution</option>
          </select>
        </div>
        
        <div className="control-group">
          <label htmlFor="time-resolution">Time Resolution:</label>
          <select 
            id="time-resolution" 
            value={timeResolution} 
            onChange={handleTimeResolutionChange}
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>
      
      <div className="heatmap-container">
        {loading ? (
          <div className="loading-heatmap">Processing transaction data...</div>
        ) : error ? (
          <div className="heatmap-error">{error}</div>
        ) : (
          <div className="heatmap-wrapper">
            <svg ref={svgRef} className="heatmap-svg"></svg>
            <div ref={tooltipRef} className="heatmap-tooltip"></div>
          </div>
        )}
      </div>
      
      {selectedCell && renderCellDetails()}
      
      <div className="heatmap-instructions">
        <p><strong>How to Read:</strong> Darker colors indicate higher values. Hover over cells for details, click for transaction breakdown.</p>
        <p><strong>Insights:</strong> Identify peak trading hours, weekend patterns, and correlation between time and transaction behavior.</p>
      </div>
    </div>
  );
};

export default TransactionVolumeHeatmap;