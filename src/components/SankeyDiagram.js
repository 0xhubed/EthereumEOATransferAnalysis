import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { 
  processTransactionsForSankey, 
  generateTimelineSankeyData, 
  generateSampleSankeyData 
} from '../services/sankeyDiagramService';
import './SankeyDiagram.css';

const SankeyDiagram = ({ transactions, isLoading }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  
  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] });
  const [viewMode, setViewMode] = useState('standard'); // 'standard', 'timeline'
  const [timePeriod, setTimePeriod] = useState('week'); // 'day', 'week', 'month'
  const [timelineData, setTimelineData] = useState([]);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [error, setError] = useState(null);
  
  // Process transactions into Sankey diagram data
  useEffect(() => {
    if (isLoading) return;
    
    try {
      if (!transactions || (!transactions.sent && !transactions.received)) {
        setSankeyData({ nodes: [], links: [] });
        setTimelineData([]);
        return;
      }
      
      // Process data for standard view
      const processedData = processTransactionsForSankey(transactions);
      setSankeyData(processedData);
      
      // Process data for timeline view
      const timeline = generateTimelineSankeyData(transactions, timePeriod);
      setTimelineData(timeline);
      
      // Reset current time index to the most recent period if the timeline changes
      if (timeline.length > 0) {
        setCurrentTimeIndex(timeline.length - 1);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error processing Sankey diagram data:', err);
      setError('Error processing transaction data for the Sankey diagram.');
    }
  }, [transactions, isLoading, timePeriod]);
  
  // Update diagram when data or dimensions change
  useEffect(() => {
    if (isLoading || error) return;
    
    const currentData = viewMode === 'standard' 
      ? sankeyData 
      : (timelineData.length > 0 && timelineData[currentTimeIndex]?.sankeyData) || { nodes: [], links: [] };
    
    if (currentData.nodes.length === 0) return;
    
    renderSankeyDiagram(currentData);
  }, [sankeyData, viewMode, currentTimeIndex, timelineData, isLoading, error]);
  
  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (viewMode === 'standard') {
        renderSankeyDiagram(sankeyData);
      } else if (timelineData.length > 0) {
        renderSankeyDiagram(timelineData[currentTimeIndex]?.sankeyData);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sankeyData, viewMode, currentTimeIndex, timelineData]);
  
  // Render the Sankey diagram using D3
  const renderSankeyDiagram = (data) => {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear existing content
    
    const container = containerRef.current;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Set up the Sankey generator
    const sankeyGenerator = sankey()
      .nodeWidth(20)
      .nodePadding(10)
      .extent([[50, 10], [width - 50, height - 30]]);
    
    // Format the data to match D3 Sankey requirements
    const formattedData = {
      nodes: data.nodes.map((node, i) => ({ ...node, index: i })),
      links: data.links.map(link => ({
        ...link,
        source: data.nodes.findIndex(n => n.id === link.source),
        target: data.nodes.findIndex(n => n.id === link.target)
      }))
    };
    
    // Generate the Sankey layout
    const sankeyData = sankeyGenerator(formattedData);
    
    // Create a color scale for nodes
    const colorScale = d3.scaleOrdinal()
      .domain(data.nodes.map(d => d.id))
      .range(d3.schemeCategory10);
    
    // Draw the links
    const link = svg.append('g')
      .selectAll('.sankey-link')
      .data(sankeyData.links)
      .enter()
      .append('path')
      .attr('class', 'sankey-link')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', d => d3.color(colorScale(d.source.id)).darker(0.5))
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('stroke-opacity', 0.5)
      .attr('fill', 'none')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-opacity', 0.8);
        
        showTooltip(event, {
          source: d.source.name,
          target: d.target.name,
          value: d.value.toFixed(4),
          count: d.count
        });
      })
      .on('mousemove', function(event) {
        moveTooltip(event);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-opacity', 0.5);
        
        hideTooltip();
      });
    
    // Draw the nodes
    const node = svg.append('g')
      .selectAll('.sankey-node')
      .data(sankeyData.nodes)
      .enter()
      .append('rect')
      .attr('class', 'sankey-node')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => colorScale(d.id))
      .attr('stroke', d => d3.color(colorScale(d.id)).darker(0.5))
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 2);
        
        showTooltip(event, {
          name: d.name,
          value: d.value.toFixed(4)
        });
      })
      .on('mousemove', function(event) {
        moveTooltip(event);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 1);
        
        hideTooltip();
      });
    
    // Add labels to the nodes
    svg.append('g')
      .selectAll('text')
      .data(sankeyData.nodes)
      .enter()
      .append('text')
      .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
      .attr('font-size', '10px')
      .text(d => d.name)
      .attr('pointer-events', 'none');
  };
  
  // Tooltip functions
  const showTooltip = (event, data) => {
    const tooltip = d3.select(tooltipRef.current);
    
    let tooltipContent = '';
    
    if (data.source && data.target) {
      tooltipContent = `
        <div><strong>From:</strong> ${data.source}</div>
        <div><strong>To:</strong> ${data.target}</div>
        <div><strong>Value:</strong> ${data.value} ETH</div>
        <div><strong>Transactions:</strong> ${data.count}</div>
      `;
    } else {
      tooltipContent = `
        <div><strong>Address:</strong> ${data.name}</div>
        <div><strong>Total Value:</strong> ${data.value} ETH</div>
      `;
    }
    
    tooltip
      .html(tooltipContent)
      .style('display', 'block');
    
    moveTooltip(event);
  };
  
  const moveTooltip = (event) => {
    const tooltip = d3.select(tooltipRef.current);
    const tooltipNode = tooltipRef.current;
    
    if (!tooltipNode) return;
    
    const x = event.pageX;
    const y = event.pageY;
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    const windowWidth = window.innerWidth;
    
    // Position tooltip to avoid going off screen
    let leftPos = x + 10;
    
    if (leftPos + tooltipWidth > windowWidth) {
      leftPos = x - tooltipWidth - 10;
    }
    
    tooltip
      .style('left', `${leftPos}px`)
      .style('top', `${y - tooltipHeight - 10}px`);
  };
  
  const hideTooltip = () => {
    d3.select(tooltipRef.current)
      .style('display', 'none');
  };
  
  // Handle time period change
  const handlePeriodChange = (e) => {
    setTimePeriod(e.target.value);
  };
  
  // Navigate through time periods
  const navigateTime = (direction) => {
    if (direction === 'prev' && currentTimeIndex > 0) {
      setCurrentTimeIndex(currentTimeIndex - 1);
    } else if (direction === 'next' && currentTimeIndex < timelineData.length - 1) {
      setCurrentTimeIndex(currentTimeIndex + 1);
    }
  };
  
  // Handle view mode change
  const changeViewMode = (mode) => {
    setViewMode(mode);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="sankey-container">
        <div className="sankey-header">
          <h2 className="sankey-title">Fund Flow Analysis (Sankey Diagram)</h2>
        </div>
        <div className="sankey-content">
          <div className="sankey-loading">
            <div className="sankey-loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="sankey-container">
        <div className="sankey-header">
          <h2 className="sankey-title">Fund Flow Analysis (Sankey Diagram)</h2>
        </div>
        <div className="sankey-content">
          <div className="sankey-error">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Empty state
  const isEmptyData = (
    viewMode === 'standard' && (!sankeyData || sankeyData.nodes.length === 0) ||
    viewMode === 'timeline' && (!timelineData || timelineData.length === 0)
  );
  
  if (isEmptyData) {
    return (
      <div className="sankey-container">
        <div className="sankey-header">
          <h2 className="sankey-title">Fund Flow Analysis (Sankey Diagram)</h2>
          <div className="sankey-controls">
            <div
              className={`sankey-view-option ${viewMode === 'standard' ? 'active' : ''}`}
              onClick={() => changeViewMode('standard')}
            >
              Standard View
            </div>
            <div
              className={`sankey-view-option ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => changeViewMode('timeline')}
            >
              Timeline View
            </div>
          </div>
        </div>
        <div className="sankey-content">
          <div className="sankey-empty">
            <p>No transaction data available for Sankey diagram visualization.</p>
            <p>Please search for an address with transaction history.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Current time period label (for timeline view)
  const currentPeriodLabel = timelineData.length > 0 && currentTimeIndex >= 0 && currentTimeIndex < timelineData.length
    ? timelineData[currentTimeIndex].period
    : '';
  
  return (
    <div className="sankey-container">
      <div className="sankey-header">
        <h2 className="sankey-title">Fund Flow Analysis (Sankey Diagram)</h2>
        <div className="sankey-controls">
          <div
            className={`sankey-view-option ${viewMode === 'standard' ? 'active' : ''}`}
            onClick={() => changeViewMode('standard')}
          >
            Standard View
          </div>
          <div
            className={`sankey-view-option ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => changeViewMode('timeline')}
          >
            Timeline View
          </div>
        </div>
      </div>
      
      {viewMode === 'timeline' && (
        <div className="sankey-time-controls">
          <div className="sankey-time-selector">
            <label>Period:</label>
            <select 
              className="sankey-period-selector"
              value={timePeriod}
              onChange={handlePeriodChange}
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          
          <div className="sankey-time-navigation">
            <button 
              className="sankey-nav-button"
              onClick={() => navigateTime('prev')}
              disabled={currentTimeIndex <= 0}
            >
              &lt;
            </button>
            <span>{currentPeriodLabel}</span>
            <button 
              className="sankey-nav-button"
              onClick={() => navigateTime('next')}
              disabled={currentTimeIndex >= timelineData.length - 1}
            >
              &gt;
            </button>
          </div>
        </div>
      )}
      
      <div className="sankey-content" ref={containerRef}>
        <div className="sankey-svg-container">
          <svg ref={svgRef} width="100%" height="100%"></svg>
        </div>
        <div className="sankey-tooltip" ref={tooltipRef} style={{ display: 'none' }}></div>
      </div>
    </div>
  );
};

export default SankeyDiagram;