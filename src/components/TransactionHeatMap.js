import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './TransactionHeatMap.css';

const TransactionHeatMap = ({ transferPartners, searchAddress }) => {
  const svgRef = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [mapType, setMapType] = useState('transaction-volume'); // 'transaction-volume', 'transaction-count', 'anomaly-density'
  const [loadingMap, setLoadingMap] = useState(true);
  const [error, setError] = useState(null);
  const [worldMapData, setWorldMapData] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const tooltipRef = useRef(null);

  // Load world map data
  useEffect(() => {
    const loadWorldMap = async () => {
      try {
        // Use a simplified world map for visualization - this would normally be loaded from a file
        // For this example, we'll simulate different regions with abstract coordinates
        const simulatedMapData = {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', id: 'na', properties: { name: 'North America' }, geometry: { type: 'Polygon', coordinates: [[[0.1, 0.6], [0.3, 0.6], [0.3, 0.8], [0.1, 0.8], [0.1, 0.6]]] } },
            { type: 'Feature', id: 'sa', properties: { name: 'South America' }, geometry: { type: 'Polygon', coordinates: [[[0.15, 0.2], [0.3, 0.2], [0.3, 0.5], [0.15, 0.5], [0.15, 0.2]]] } },
            { type: 'Feature', id: 'eu', properties: { name: 'Europe' }, geometry: { type: 'Polygon', coordinates: [[[0.4, 0.65], [0.5, 0.65], [0.5, 0.8], [0.4, 0.8], [0.4, 0.65]]] } },
            { type: 'Feature', id: 'af', properties: { name: 'Africa' }, geometry: { type: 'Polygon', coordinates: [[[0.4, 0.3], [0.55, 0.3], [0.55, 0.6], [0.4, 0.6], [0.4, 0.3]]] } },
            { type: 'Feature', id: 'as', properties: { name: 'Asia' }, geometry: { type: 'Polygon', coordinates: [[[0.6, 0.4], [0.9, 0.4], [0.9, 0.8], [0.6, 0.8], [0.6, 0.4]]] } },
            { type: 'Feature', id: 'oc', properties: { name: 'Oceania' }, geometry: { type: 'Polygon', coordinates: [[[0.75, 0.15], [0.9, 0.15], [0.9, 0.3], [0.75, 0.3], [0.75, 0.15]]] } },
          ]
        };
        
        setWorldMapData(simulatedMapData);
      } catch (err) {
        console.error('Error loading map data:', err);
        setError('Failed to load map data. Please try again later.');
      }
    };

    loadWorldMap();
  }, []);

  // Process data for heatmap (simulated geographic data)
  useEffect(() => {
    if (!transferPartners || transferPartners.length === 0 || !worldMapData) {
      setLoadingMap(false);
      return;
    }

    setLoadingMap(true);

    try {
      // In a real application, you would use a service to geolocate addresses
      // For this example, we'll simulate geographic distribution by assigning partners to regions
      
      // Deterministically assign partners to regions based on address hash
      const regionCounts = {
        'na': { count: 0, volume: 0, anomalies: 0 },
        'sa': { count: 0, volume: 0, anomalies: 0 },
        'eu': { count: 0, volume: 0, anomalies: 0 },
        'af': { count: 0, volume: 0, anomalies: 0 },
        'as': { count: 0, volume: 0, anomalies: 0 },
        'oc': { count: 0, volume: 0, anomalies: 0 },
      };
      
      // Distribute partners to regions based on their address
      transferPartners.forEach(partner => {
        // Use the first few characters of the address as a simple hash
        const addressHash = parseInt(partner.address.substring(2, 10), 16);
        // Distribute based on hash mod 6 to assign to one of 6 regions
        const regionIndex = addressHash % 6;
        const regionIds = Object.keys(regionCounts);
        const regionId = regionIds[regionIndex];
        
        // Increment region stats
        regionCounts[regionId].count += 1;
        regionCounts[regionId].volume += (partner.totalSent + partner.totalReceived);
        
        // Check for anomalies
        if (partner.anomalies && partner.anomalies.hasAnomalies) {
          regionCounts[regionId].anomalies += 1;
        }
      });
      
      // Prepare data for the map
      const processedMapData = worldMapData.features.map(feature => {
        const regionId = feature.id;
        const stats = regionCounts[regionId] || { count: 0, volume: 0, anomalies: 0 };
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            transactionCount: stats.count,
            transactionVolume: stats.volume,
            anomalyCount: stats.anomalies,
            // Calculate densities
            transactionDensity: stats.count / transferPartners.length,
            volumeDensity: stats.volume / transferPartners.reduce((sum, p) => sum + p.totalSent + p.totalReceived, 0),
            anomalyDensity: stats.anomalies / transferPartners.filter(p => p.anomalies && p.anomalies.hasAnomalies).length || 0
          }
        };
      });
      
      setMapData(processedMapData);
      setLoadingMap(false);
    } catch (err) {
      console.error('Error processing map data:', err);
      setError('Failed to process transaction data for the heatmap.');
      setLoadingMap(false);
    }
  }, [transferPartners, worldMapData]);

  // Render the map
  useEffect(() => {
    if (!mapData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = 500;
    
    // Clear previous content
    svg.selectAll("*").remove();
    
    // Set SVG dimensions
    svg.attr("width", width)
       .attr("height", height);
       
    // Add background
    svg.append("rect")
       .attr("width", width)
       .attr("height", height)
       .attr("fill", "#f0f9ff");
       
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    // Set up a simple projection for our simulated data
    // In a real application, you would use proper geographic projections
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([50, width - 50]);
      
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - 50, 50]);
      
    // Get color scale based on selected map type
    const colorScale = getColorScale(mapType, mapData);
    
    // Create the map
    const map = svg.append("g")
      .selectAll("path")
      .data(mapData)
      .enter()
      .append("path")
      .attr("d", feature => {
        // Convert simulated coordinates to screen coordinates
        const pathGenerator = d3.line()
          .x(d => xScale(d[0]))
          .y(d => yScale(d[1]));
        
        return pathGenerator(feature.geometry.coordinates[0]);
      })
      .attr("fill", d => getRegionColor(d, mapType, colorScale))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("class", "region")
      .on("mouseover", (event, d) => {
        // Highlight region
        d3.select(event.currentTarget)
          .attr("stroke", "#333")
          .attr("stroke-width", 2);
        
        // Show tooltip with region data
        tooltip
          .style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px")
          .html(getTooltipContent(d, mapType));
      })
      .on("mouseout", (event) => {
        // Remove highlight
        d3.select(event.currentTarget)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => {
        setSelectedRegion(d);
      });
    
    // Add labels
    svg.append("g")
      .selectAll("text")
      .data(mapData)
      .enter()
      .append("text")
      .attr("x", d => {
        // Calculate centroid of the region
        const coords = d.geometry.coordinates[0];
        const xSum = coords.reduce((sum, coord) => sum + coord[0], 0);
        return xScale(xSum / coords.length);
      })
      .attr("y", d => {
        // Calculate centroid of the region
        const coords = d.geometry.coordinates[0];
        const ySum = coords.reduce((sum, coord) => sum + coord[1], 0);
        return yScale(ySum / coords.length);
      })
      .text(d => d.properties.name)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .attr("pointer-events", "none");
    
    // Add legend
    createLegend(svg, width, height, colorScale, mapType);
    
  }, [mapData, mapType]);
  
  // Helper to get color scale based on map type
  const getColorScale = (type, data) => {
    let domain, range;
    
    switch (type) {
      case 'transaction-volume':
        domain = [0, d3.max(data, d => d.properties.volumeDensity) || 1];
        range = ["#e5f5e0", "#31a354"];
        break;
      case 'transaction-count':
        domain = [0, d3.max(data, d => d.properties.transactionDensity) || 1];
        range = ["#eff3ff", "#3182bd"];
        break;
      case 'anomaly-density':
        domain = [0, d3.max(data, d => d.properties.anomalyDensity) || 1];
        range = ["#fee5d9", "#de2d26"];
        break;
      default:
        domain = [0, 1];
        range = ["#f7f7f7", "#252525"];
    }
    
    // Use a simpler linear scale with a range of colors
    return d3.scaleLinear()
      .domain(domain)
      .range(range);
  };
  
  // Helper to get color for a region
  const getRegionColor = (feature, type, colorScale) => {
    switch (type) {
      case 'transaction-volume':
        return colorScale(feature.properties.volumeDensity);
      case 'transaction-count':
        return colorScale(feature.properties.transactionDensity);
      case 'anomaly-density':
        return colorScale(feature.properties.anomalyDensity);
      default:
        return "#ccc";
    }
  };
  
  // Helper to create legend
  const createLegend = (svg, width, height, colorScale, type) => {
    const legendWidth = 200;
    const legendHeight = 20;
    const xPosition = width - legendWidth - 20;
    const yPosition = 20;
    
    // Create gradient for legend
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");
      
    // Get domain for interpolation
    const domain = colorScale.domain();
    
    // Set gradient stops based on color scale
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(domain[0]));
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(domain[1]));
      
    // Draw legend rectangle
    svg.append("rect")
      .attr("x", xPosition)
      .attr("y", yPosition)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");
      
    // Add legend title
    let legendTitle;
    switch (type) {
      case 'transaction-volume':
        legendTitle = "Transaction Volume Density";
        break;
      case 'transaction-count':
        legendTitle = "Transaction Count Density";
        break;
      case 'anomaly-density':
        legendTitle = "Anomaly Density";
        break;
      default:
        legendTitle = "Density";
    }
    
    svg.append("text")
      .attr("x", xPosition + legendWidth / 2)
      .attr("y", yPosition - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(legendTitle);
      
    // Add min/max labels
    svg.append("text")
      .attr("x", xPosition)
      .attr("y", yPosition + legendHeight + 15)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .text("Low");
      
    svg.append("text")
      .attr("x", xPosition + legendWidth)
      .attr("y", yPosition + legendHeight + 15)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .text("High");
  };
  
  // Helper to format tooltip content
  const getTooltipContent = (feature, type) => {
    const { name } = feature.properties;
    const count = feature.properties.transactionCount;
    const volume = feature.properties.transactionVolume.toFixed(4);
    const anomalies = feature.properties.anomalyCount;
    
    let highlightedMetric;
    switch (type) {
      case 'transaction-volume':
        highlightedMetric = `<strong>Volume: ${volume} ETH</strong>`;
        break;
      case 'transaction-count':
        highlightedMetric = `<strong>Transactions: ${count}</strong>`;
        break;
      case 'anomaly-density':
        highlightedMetric = `<strong>Anomalies: ${anomalies}</strong>`;
        break;
      default:
        highlightedMetric = '';
    }
    
    return `
      <div class="tooltip-title">${name}</div>
      ${highlightedMetric}
      <div>Addresses: ${count}</div>
      <div>Volume: ${volume} ETH</div>
      <div>Anomalies: ${anomalies}</div>
    `;
  };
  
  // Render selected region's details
  const renderRegionDetails = () => {
    if (!selectedRegion) return null;
    
    const { name } = selectedRegion.properties;
    const count = selectedRegion.properties.transactionCount;
    const volume = selectedRegion.properties.transactionVolume.toFixed(4);
    const anomalies = selectedRegion.properties.anomalyCount;
    
    // Get addresses in this region
    const regionAddresses = getAddressesInRegion(selectedRegion.id);
    
    return (
      <div className="region-details">
        <div className="region-details-header">
          <h4>{name} Details</h4>
          <button 
            className="close-button"
            onClick={() => setSelectedRegion(null)}
          >
            ×
          </button>
        </div>
        
        <div className="region-stats">
          <div className="stat-item">
            <span className="stat-label">Addresses:</span>
            <span className="stat-value">{count}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Volume:</span>
            <span className="stat-value">{volume} ETH</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Anomalies:</span>
            <span className="stat-value">{anomalies}</span>
          </div>
        </div>
        
        {regionAddresses.length > 0 && (
          <div className="region-addresses">
            <h5>Addresses in this Region</h5>
            <div className="address-list">
              {regionAddresses.map((partner, index) => (
                <div key={index} className="address-item">
                  <div className="address-text">{partner.address}</div>
                  <div className="address-volume">
                    {(partner.totalSent + partner.totalReceived).toFixed(4)} ETH
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Helper to simulate getting addresses in a region
  const getAddressesInRegion = (regionId) => {
    if (!transferPartners) return [];
    
    // In a real application, you would have actual geographic data
    // For this example, we'll distribute addresses based on a hash of their address
    return transferPartners.filter(partner => {
      const addressHash = parseInt(partner.address.substring(2, 10), 16);
      const regionIndex = addressHash % 6;
      const regionIds = ['na', 'sa', 'eu', 'af', 'as', 'oc'];
      return regionIds[regionIndex] === regionId;
    });
  };
  
  // Handle map type change
  const handleMapTypeChange = (e) => {
    setMapType(e.target.value);
  };

  return (
    <div className="transaction-heatmap-container">
      <h3>Transaction Distribution Heatmap</h3>
      
      <div className="heatmap-controls">
        <div className="visualization-note">
          <p><strong>Note:</strong> This map visualizes transaction patterns across regions. 
          Actual wallet locations are not available on-chain, so this visualization uses simulated 
          geographic distribution for demonstration purposes.</p>
        </div>
        
        <div className="map-type-selector">
          <label htmlFor="map-type">Heatmap Type:</label>
          <select 
            id="map-type" 
            value={mapType} 
            onChange={handleMapTypeChange}
          >
            <option value="transaction-volume">Transaction Volume</option>
            <option value="transaction-count">Transaction Count</option>
            <option value="anomaly-density">Anomaly Density</option>
          </select>
        </div>
      </div>
      
      <div className="heatmap-container">
        {loadingMap ? (
          <div className="loading-map">Loading transaction heatmap...</div>
        ) : error ? (
          <div className="map-error">{error}</div>
        ) : (
          <div className="map-wrapper">
            <svg ref={svgRef} className="heatmap-svg"></svg>
            <div ref={tooltipRef} className="map-tooltip"></div>
          </div>
        )}
      </div>
      
      {selectedRegion && renderRegionDetails()}
      
      <div className="heatmap-instructions">
        <p>Click on a region to view details about transaction partners in that area.</p>
        <p>Change the heatmap type to visualize different aspects of transactions.</p>
      </div>
    </div>
  );
};

export default TransactionHeatMap;