import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card } from './ui/card';
import './ProfitLossAnalysis.css';
import { analyzeProfitLoss, generatePortfolioTimeSeries, aggregatePortfolioTimeSeries } from '../services/profitLossService';

const ProfitLossAnalysis = ({ transactions, searchAddress }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState({ daily: [], monthly: [] });
  const [activeTab, setActiveTab] = useState('summary');
  const [timeRange, setTimeRange] = useState('all');
  const [currentPrice, setCurrentPrice] = useState(3500); // Default current ETH price

  const valueChartRef = useRef(null);
  const roiChartRef = useRef(null);
  const priceChartRef = useRef(null);
  const tooltipRef = useRef(null);

  // Fetch current ETH price and perform analysis
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // Initialize with empty data
      setAnalysis({
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
      });
      setTimeSeriesData({ daily: [], monthly: [] });
      
      // Validate inputs
      if (!transactions || !searchAddress) {
        console.log("Missing data for analysis:", { 
          hasTransactions: !!transactions, 
          hasAddress: !!searchAddress
        });
        setIsLoading(false);
        return;
      }
      
      try {
        // In a real app, you would fetch the current price from an API
        // const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        // const data = await response.json();
        // const ethPrice = data.ethereum.usd;
        const ethPrice = 3500; // Mock current ETH price
        setCurrentPrice(ethPrice);
        
        console.log("Analyzing transactions:", {
          transactionsType: typeof transactions,
          isArray: Array.isArray(transactions),
          hasSent: !!transactions?.sent,
          hasReceived: !!transactions?.received,
          address: searchAddress
        });
        
        // Analyze profit/loss
        const analysisResult = await analyzeProfitLoss(transactions, searchAddress, ethPrice);
        setAnalysis(analysisResult);
        
        // Generate time series data
        const timeSeries = await generatePortfolioTimeSeries(transactions, searchAddress, ethPrice);
        const aggregatedData = aggregatePortfolioTimeSeries(timeSeries);
        setTimeSeriesData(aggregatedData);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error analyzing profit/loss:", error);
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [transactions, searchAddress]);

  // Draw portfolio value chart
  useEffect(() => {
    if (isLoading || !timeSeriesData || !valueChartRef.current) return;
    
    drawPortfolioValueChart();
  }, [isLoading, timeSeriesData, timeRange, valueChartRef.current]);

  // Draw ROI chart
  useEffect(() => {
    if (isLoading || !timeSeriesData || !roiChartRef.current) return;
    
    drawROIChart();
  }, [isLoading, timeSeriesData, timeRange, roiChartRef.current]);

  // Draw price chart
  useEffect(() => {
    if (isLoading || !timeSeriesData || !priceChartRef.current) return;
    
    drawPriceChart();
  }, [isLoading, timeSeriesData, timeRange, priceChartRef.current]);

  // Filter time series data based on selected range
  const getFilteredData = () => {
    const data = timeSeriesData.daily;
    
    if (timeRange === 'all' || !data.length) {
      return data;
    }
    
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '30d':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90d':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case '1y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return data;
    }
    
    return data.filter(point => new Date(point.timestamp) >= startDate);
  };

  // Draw portfolio value chart
  const drawPortfolioValueChart = () => {
    if (!valueChartRef.current) return;
    
    const data = getFilteredData();
    const svgElement = d3.select(valueChartRef.current);
    const tooltipElement = d3.select(tooltipRef.current);
    
    // Clear any existing chart
    svgElement.selectAll("*").remove();
    
    if (!data || !data.length) {
      // Draw an empty state
      const width = valueChartRef.current.clientWidth || 800;
      const height = valueChartRef.current.clientHeight || 300;
      
      svgElement.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "14px")
        .style("fill", "#6b7280")
        .text("No portfolio data available");
        
      return;
    }
    
    const width = valueChartRef.current.clientWidth;
    const height = valueChartRef.current.clientHeight;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)))
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1]) // Add 10% padding
      .range([innerHeight, 0]);
    
    // Create group for the chart
    const g = svgElement.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add horizontal grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "3,3");
    
    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    g.append("g")
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `$${d.toLocaleString()}`));
    
    // Add y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (innerHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "#4b5563")
      .style("font-size", "12px")
      .text("Portfolio Value (USD)");
    
    // Create line generator
    const line = d3.line()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    // Draw portfolio value line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#4f46e5")
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Create area generator for gradient fill
    const area = d3.area()
      .x(d => xScale(new Date(d.timestamp)))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    // Add gradient definition
    const gradient = svgElement.append("defs")
      .append("linearGradient")
      .attr("id", "portfolio-value-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#4f46e5")
      .attr("stop-opacity", 0.3);
    
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#4f46e5")
      .attr("stop-opacity", 0);
    
    // Draw area
    g.append("path")
      .datum(data)
      .attr("fill", "url(#portfolio-value-gradient)")
      .attr("d", area);
    
    // Add data points for interaction
    g.selectAll(".data-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", d => xScale(new Date(d.timestamp)))
      .attr("cy", d => yScale(d.value))
      .attr("r", 3)
      .attr("fill", "#4f46e5")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 6);
        
        tooltipElement
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .html(`
            <div class="title">${new Date(d.timestamp).toLocaleDateString()}</div>
            <div class="row">
              <span>Portfolio Value:</span>
              <span>$${d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div class="row">
              <span>ETH Balance:</span>
              <span>${d.balance.toFixed(4)} ETH</span>
            </div>
            <div class="row">
              <span>ETH Price:</span>
              <span>$${d.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div class="row">
              <span>Profit/Loss:</span>
              <span style="color: ${d.profitLoss >= 0 ? '#059669' : '#e11d48'}">
                $${d.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          `);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 3);
        
        tooltipElement
          .style("visibility", "hidden");
      });
  };

  // Draw ROI chart
  const drawROIChart = () => {
    if (!roiChartRef.current) return;
    
    const data = getFilteredData();
    const svgElement = d3.select(roiChartRef.current);
    const tooltipElement = d3.select(tooltipRef.current);
    
    // Clear any existing chart
    svgElement.selectAll("*").remove();
    
    if (!data || !data.length) {
      // Draw an empty state
      const width = roiChartRef.current.clientWidth || 800;
      const height = roiChartRef.current.clientHeight || 300;
      
      svgElement.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "14px")
        .style("fill", "#6b7280")
        .text("No ROI data available");
        
      return;
    }
    
    const width = roiChartRef.current.clientWidth;
    const height = roiChartRef.current.clientHeight;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)))
      .range([0, innerWidth]);
    
    // Determine y domain with padding
    const maxROI = d3.max(data, d => d.roi) || 0;
    const minROI = d3.min(data, d => d.roi) || 0;
    const padding = Math.max(Math.abs(maxROI), Math.abs(minROI)) * 0.1;
    
    const yScale = d3.scaleLinear()
      .domain([Math.min(minROI - padding, 0), Math.max(maxROI + padding, 0)])
      .range([innerHeight, 0]);
    
    // Create group for the chart
    const g = svgElement.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add horizontal grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "3,3");
    
    // Add zero line if domain includes both positive and negative values
    if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 1);
    }
    
    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    g.append("g")
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `${d.toFixed(1)}%`));
    
    // Add y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (innerHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "#4b5563")
      .style("font-size", "12px")
      .text("Return on Investment (%)");
    
    // Create line generator
    const line = d3.line()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.roi))
      .curve(d3.curveMonotoneX);
    
    // Draw ROI line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add data points for interaction
    g.selectAll(".data-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", d => xScale(new Date(d.timestamp)))
      .attr("cy", d => yScale(d.roi))
      .attr("r", 3)
      .attr("fill", d => d.roi >= 0 ? "#059669" : "#e11d48")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 6);
        
        tooltipElement
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .html(`
            <div class="title">${new Date(d.timestamp).toLocaleDateString()}</div>
            <div class="row">
              <span>ROI:</span>
              <span style="color: ${d.roi >= 0 ? '#059669' : '#e11d48'}">
                ${d.roi.toFixed(2)}%
              </span>
            </div>
            <div class="row">
              <span>Portfolio Value:</span>
              <span>$${d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div class="row">
              <span>Profit/Loss:</span>
              <span style="color: ${d.profitLoss >= 0 ? '#059669' : '#e11d48'}">
                $${d.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          `);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 3);
        
        tooltipElement
          .style("visibility", "hidden");
      });
  };

  // Draw price chart
  const drawPriceChart = () => {
    if (!priceChartRef.current) return;
    
    const data = getFilteredData();
    const svgElement = d3.select(priceChartRef.current);
    const tooltipElement = d3.select(tooltipRef.current);
    
    // Clear any existing chart
    svgElement.selectAll("*").remove();
    
    if (!data || !data.length) {
      // Draw an empty state
      const width = priceChartRef.current.clientWidth || 800;
      const height = priceChartRef.current.clientHeight || 300;
      
      svgElement.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "14px")
        .style("fill", "#6b7280")
        .text("No price history data available");
        
      return;
    }
    
    const width = priceChartRef.current.clientWidth;
    const height = priceChartRef.current.clientHeight;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)))
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.price) * 1.1]) // Add 10% padding
      .range([innerHeight, 0]);
    
    // Create group for the chart
    const g = svgElement.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add horizontal grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "3,3");
    
    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    g.append("g")
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `$${d.toLocaleString()}`));
    
    // Add y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (innerHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "#4b5563")
      .style("font-size", "12px")
      .text("ETH Price (USD)");
    
    // Create line generator
    const line = d3.line()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.price))
      .curve(d3.curveMonotoneX);
    
    // Draw price line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add data points for interaction
    g.selectAll(".data-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", d => xScale(new Date(d.timestamp)))
      .attr("cy", d => yScale(d.price))
      .attr("r", 3)
      .attr("fill", "#f59e0b")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 6);
        
        tooltipElement
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .html(`
            <div class="title">${new Date(d.timestamp).toLocaleDateString()}</div>
            <div class="row">
              <span>ETH Price:</span>
              <span>$${d.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          `);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 3);
        
        tooltipElement
          .style("visibility", "hidden");
      });
  };

  // Format value with decimal places and $ sign
  const formatUSD = (value) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  // Format percentage
  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Transaction table header
  const tableHeaders = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'ethAmount', label: 'ETH Amount' },
    { key: 'historicalValue', label: 'Value at Transaction' },
    { key: 'currentValue', label: 'Current Value' },
    { key: 'profitLoss', label: 'Profit/Loss' },
    { key: 'roi', label: 'ROI' }
  ];

  // Filter and sort transactions for display
  const getTransactionsForDisplay = () => {
    if (!analysis || !analysis.transactionsWithPL) return [];
    
    return analysis.transactionsWithPL
      .filter(tx => tx.transactionType === 'incoming') // Only show incoming transactions for ROI
      .sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)); // Most recent first
  };

  const renderSummaryTab = () => (
    <div>
      <div className="profit-loss-summary">
        <div className="summary-card">
          <h3>Portfolio Balance</h3>
          <div className="value">{analysis?.netBalance.toFixed(4)} ETH</div>
          <div className="secondary">≈ {formatUSD(analysis?.currentPortfolioValue)}</div>
        </div>
        <div className="summary-card">
          <h3>Total Profit/Loss</h3>
          <div className={`value ${analysis?.totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>
            {formatUSD(analysis?.totalProfitLoss)}
          </div>
          <div className="secondary">
            {formatPercent(analysis?.overallROI)} Return
          </div>
        </div>
        <div className="summary-card">
          <h3>Total Investment</h3>
          <div className="value">{formatUSD(analysis?.totalInvestment)}</div>
        </div>
        <div className="summary-card">
          <h3>Average Annual ROI</h3>
          <div className={`value ${analysis?.averageROI >= 0 ? 'positive' : 'negative'}`}>
            {formatPercent(analysis?.averageROI)}
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Portfolio Value Over Time</h3>
        <div className="time-range-selector">
          <button
            className={timeRange === 'all' ? 'active' : ''}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </button>
          <button
            className={timeRange === '1y' ? 'active' : ''}
            onClick={() => setTimeRange('1y')}
          >
            1 Year
          </button>
          <button
            className={timeRange === '90d' ? 'active' : ''}
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </button>
          <button
            className={timeRange === '30d' ? 'active' : ''}
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </button>
        </div>
        <div className="chart-wrapper">
          <svg ref={valueChartRef} width="100%" height="100%"></svg>
        </div>
      </div>

      <div className="chart-container">
        <h3>Return on Investment Over Time</h3>
        <div className="chart-wrapper">
          <svg ref={roiChartRef} width="100%" height="100%"></svg>
        </div>
      </div>

      <div className="chart-container">
        <h3>ETH Price History</h3>
        <div className="chart-wrapper">
          <svg ref={priceChartRef} width="100%" height="100%"></svg>
        </div>
      </div>
    </div>
  );

  const renderTransactionsTab = () => (
    <div>
      <div className="transactions-table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              {tableHeaders.map(header => (
                <th key={header.key}>{header.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getTransactionsForDisplay().map((tx, index) => (
              <tr 
                key={index}
                className={
                  tx.hash === analysis?.bestTransaction?.hash
                    ? 'highlight-transaction highlight-best'
                    : tx.hash === analysis?.worstTransaction?.hash
                    ? 'highlight-transaction highlight-worst'
                    : ''
                }
              >
                <td>{formatDate(tx.timeStamp)}</td>
                <td>{tx.transactionType === 'incoming' ? 'Received' : 'Sent'}</td>
                <td>{parseFloat(tx.value).toFixed(4)} ETH</td>
                <td>{formatUSD(tx.historicalValue)}</td>
                <td>{formatUSD(tx.currentValue)}</td>
                <td className={tx.profitLoss >= 0 ? 'positive' : 'negative'}>
                  {formatUSD(tx.profitLoss)}
                </td>
                <td className={tx.profitLossPercentage >= 0 ? 'positive' : 'negative'}>
                  {formatPercent(tx.profitLossPercentage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="profit-loss-container">
        <div className="profit-loss-header">
          <h2>Profit/Loss Analysis</h2>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="profit-loss-container">
      <div className="profit-loss-header">
        <h2>Profit/Loss Analysis for {searchAddress.substring(0, 8)}...</h2>
        <div>
          Current ETH Price: <strong>{formatUSD(currentPrice)}</strong>
        </div>
      </div>
      
      <div className="tab-container">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
        </div>
        
        {activeTab === 'summary' ? renderSummaryTab() : renderTransactionsTab()}
      </div>
      
      <div className="tooltip" ref={tooltipRef} style={{ visibility: 'hidden' }}></div>
    </Card>
  );
};

export default ProfitLossAnalysis;