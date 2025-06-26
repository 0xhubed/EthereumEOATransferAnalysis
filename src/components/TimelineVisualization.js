import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './TimelineVisualization.css';

const TimelineVisualization = ({ transferPartners, searchAddress }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [timelineData, setTimelineData] = useState(null);
  const [view, setView] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'all'
  
  // Process transaction data for timeline visualization
  useEffect(() => {
    if (!transferPartners || transferPartners.length === 0) return;
    
    // Flatten all transactions into a single array with partner info
    const allTransactions = [];
    transferPartners.forEach(partner => {
      partner.transactions.forEach(tx => {
        if (tx.timestamp) {
          allTransactions.push({
            ...tx,
            partnerAddress: partner.address,
            date: new Date(tx.timestamp),
            valueNum: parseFloat(tx.value)
          });
        }
      });
    });
    
    // Sort by timestamp
    allTransactions.sort((a, b) => a.date - b.date);
    
    setTimelineData(allTransactions);
  }, [transferPartners]);

  // Create timeline visualization
  useEffect(() => {
    if (!timelineData || timelineData.length === 0) return;
    
    // Safety check: make sure the SVG ref is available
    if (!svgRef.current) {
      console.warn("SVG reference not available for timeline visualization");
      return;
    }
    
    try {
      // Clear previous visualization
      d3.select(svgRef.current).selectAll("*").remove();
    
    // Set dimensions
    const margin = { top: 50, right: 50, bottom: 50, left: 70 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Define time range
    const timeExtent = d3.extent(timelineData, d => d.date);
    
    // Handle different time period views
    let timeScale;
    let timeData = [...timelineData];

    // Apply time filters based on view
    const now = new Date();
    if (view === 'daily') {
      // Last 7 days
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      timeData = timelineData.filter(d => d.date >= cutoff);
      timeScale = d3.scaleTime()
        .domain([cutoff, now])
        .range([0, width]);
    } else if (view === 'weekly') {
      // Last 4 weeks
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 28);
      timeData = timelineData.filter(d => d.date >= cutoff);
      timeScale = d3.scaleTime()
        .domain([cutoff, now])
        .range([0, width]);
    } else if (view === 'monthly') {
      // Last 6 months
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 6);
      timeData = timelineData.filter(d => d.date >= cutoff);
      timeScale = d3.scaleTime()
        .domain([cutoff, now])
        .range([0, width]);
    } else {
      // All time
      timeScale = d3.scaleTime()
        .domain(timeExtent)
        .range([0, width]);
    }
    
    // If no data in the chosen time period, show message
    if (timeData.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("class", "no-data-message")
        .text("No transactions in this time period");
      return;
    }
    
    // Value range for transaction amounts
    const valueExtent = d3.extent(timeData, d => d.valueNum);
    const radiusScale = d3.scaleLog()
      .domain([Math.max(0.001, valueExtent[0]), valueExtent[1]])
      .range([4, 15]);
    
    // Create y-axis for transaction value
    const yScale = d3.scaleLinear()
      .domain(valueExtent)
      .range([height, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(timeScale)
      .ticks(width > 500 ? 10 : 5);
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${d.toFixed(4)} ETH`);
    
    // Add axes to the chart
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    
    svg.append("g")
      .attr("class", "y-axis")
      .call(yAxis);
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    // Add transaction points
    svg.selectAll(".transaction-point")
      .data(timeData)
      .enter()
      .append("circle")
      .attr("class", d => `transaction-point ${d.direction}`)
      .attr("cx", d => timeScale(d.date))
      .attr("cy", d => yScale(d.valueNum))
      .attr("r", d => radiusScale(Math.max(0.001, d.valueNum)))
      .attr("fill", d => d.direction === 'sent' ? '#ff9999' : '#99ff99')
      .attr("stroke", "#444")
      .attr("stroke-width", 1)
      .attr("opacity", 0.7)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("opacity", 1);
        
        const dateFormatted = d.date.toLocaleString();
        const txValue = parseFloat(d.value).toFixed(4);
        const shortPartnerAddress = `${d.partnerAddress.substring(0, 6)}...${d.partnerAddress.substring(d.partnerAddress.length - 4)}`;
        
        tooltip
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 15}px`)
          .style("opacity", 1)
          .html(`
            <div class="tooltip-date">${dateFormatted}</div>
            <div class="tooltip-partner">${shortPartnerAddress}</div>
            <div class="tooltip-value">${txValue} ETH ${d.direction === 'sent' ? 'sent' : 'received'}</div>
            <div class="tooltip-hash">${d.hash.substring(0, 14)}...</div>
          `);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke-width", 1)
          .attr("opacity", 0.7);
        
        tooltip
          .style("opacity", 0);
      });
    
    // Add connections between related transactions (optional)
    if (timeData.length > 1) {
      // Group by partner address
      const partnerGroups = {};
      timeData.forEach(tx => {
        if (!partnerGroups[tx.partnerAddress]) {
          partnerGroups[tx.partnerAddress] = [];
        }
        partnerGroups[tx.partnerAddress].push(tx);
      });
      
      // Draw connecting lines for each partner
      Object.values(partnerGroups).forEach(transactions => {
        if (transactions.length > 1) {
          const lineGenerator = d3.line()
            .x(d => timeScale(d.date))
            .y(d => yScale(d.valueNum))
            .curve(d3.curveMonotoneX);
          
          svg.append("path")
            .datum(transactions.sort((a, b) => a.date - b.date))
            .attr("class", "transaction-line")
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3")
            .attr("d", lineGenerator);
        }
      });
    }
    
    // Add axis labels
    svg.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .text("Date/Time");
    
    svg.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text("Transaction Value (ETH)");
    
    // Add title
    svg.append("text")
      .attr("class", "chart-title")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .text("Transaction Timeline");
    
    } catch (error) {
      console.error("Error creating timeline visualization:", error);
      
      // Show error message on the SVG
      const svg = d3.select(svgRef.current)
        .attr("width", svgRef.current.clientWidth)
        .attr("height", 400);
        
      svg.append("text")
        .attr("x", svgRef.current.clientWidth / 2)
        .attr("y", 200)
        .attr("text-anchor", "middle")
        .attr("class", "error-message")
        .text("Error rendering timeline. Please try again later.");
    }
      
  }, [timelineData, view]);
  
  // Function to handle view change
  const handleViewChange = (newView) => {
    setView(newView);
  };
  
  return (
    <div className="timeline-visualization">
      <div className="timeline-header">
        <h3>Time-Based Transaction Analysis</h3>
        <div className="timeline-controls">
          <div className="time-filter-buttons">
            <button 
              className={view === 'daily' ? 'active' : ''} 
              onClick={() => handleViewChange('daily')}
            >
              Last 7 Days
            </button>
            <button 
              className={view === 'weekly' ? 'active' : ''} 
              onClick={() => handleViewChange('weekly')}
            >
              Last 4 Weeks
            </button>
            <button 
              className={view === 'monthly' ? 'active' : ''} 
              onClick={() => handleViewChange('monthly')}
            >
              Last 6 Months
            </button>
            <button 
              className={view === 'all' ? 'active' : ''} 
              onClick={() => handleViewChange('all')}
            >
              All Time
            </button>
          </div>
        </div>
      </div>
      
      <div className="timeline-chart-container">
        <svg ref={svgRef} className="timeline-chart"></svg>
        <div ref={tooltipRef} className="timeline-tooltip"></div>
      </div>
      
      <div className="timeline-legend">
        <div className="legend-item">
          <span className="dot sent"></span>
          <span>ETH Sent</span>
        </div>
        <div className="legend-item">
          <span className="dot received"></span>
          <span>ETH Received</span>
        </div>
        <div className="legend-note">
          <p>* Bubble size represents transaction amount</p>
          <p>* Dotted lines connect transactions with the same partner</p>
        </div>
      </div>
    </div>
  );
};

export default TimelineVisualization;