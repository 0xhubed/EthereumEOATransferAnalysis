import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './NetworkEvolution.css';

const NetworkEvolution = ({ transferPartners, searchAddress }) => {
  const svgRef = useRef(null);
  const [evolutionData, setEvolutionData] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // milliseconds
  const animationRef = useRef(null);
  
  // Process the data for the evolution animation
  useEffect(() => {
    if (!transferPartners || transferPartners.length === 0) return;
    
    // Get all transactions with timestamps
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
    
    // If no transactions with timestamps, can't show evolution
    if (allTransactions.length === 0) {
      console.warn("No transactions with timestamps found for evolution visualization");
      return;
    }
    
    // Group transactions into time periods for animation steps
    const startDate = allTransactions[0].date;
    const endDate = allTransactions[allTransactions.length - 1].date;
    const totalDuration = endDate - startDate;
    
    // Determine how many steps to use based on data volume
    const stepCount = Math.min(Math.max(5, Math.ceil(allTransactions.length / 5)), 15); 
    const stepsArray = [];
    
    // For each step, calculate the network state at that point in time
    for (let step = 0; step <= stepCount; step++) {
      const cutoffDate = new Date(startDate.getTime() + (totalDuration * (step / stepCount)));
      
      // Include all transactions up to this cutoff date
      const txUpToStep = allTransactions.filter(tx => tx.date <= cutoffDate);
      
      // Process into graph data
      const networkState = processNetworkState(txUpToStep, searchAddress);
      
      // Add timeline info
      stepsArray.push({
        step: step,
        date: cutoffDate,
        network: networkState,
        transactionCount: txUpToStep.length
      });
    }
    
    setEvolutionData(stepsArray);
    setCurrentStep(0);
  }, [transferPartners, searchAddress]);
  
  // Process transactions into network state at a point in time
  const processNetworkState = (transactions, centralAddress) => {
    const nodes = [
      {
        id: centralAddress,
        symbolType: 'diamond',
        color: '#ff6347',
        size: 700,
        isCentral: true
      }
    ];
    
    const links = [];
    const partners = {};
    
    // Aggregate transaction data by partner
    transactions.forEach(tx => {
      const partnerAddress = tx.partnerAddress;
      
      // Initialize or update partner data
      if (!partners[partnerAddress]) {
        partners[partnerAddress] = {
          address: partnerAddress,
          totalSent: 0,
          totalReceived: 0,
          transactions: []
        };
      }
      
      // Add transaction to the aggregation
      if (tx.direction === 'sent') {
        partners[partnerAddress].totalSent += tx.valueNum;
      } else {
        partners[partnerAddress].totalReceived += tx.valueNum;
      }
      
      partners[partnerAddress].transactions.push(tx);
    });
    
    // Add partner nodes and links
    Object.values(partners).forEach((partner, index) => {
      const totalValue = partner.totalSent + partner.totalReceived;
      
      // Only add partners with non-zero transactions
      if (totalValue > 0) {
        // Calculate node size based on transaction volume
        const nodeSize = 300 + Math.log(totalValue + 1) * 60;
        
        // Add partner node
        nodes.push({
          id: partner.address,
          symbolType: 'circle',
          color: '#1f77b4',
          size: nodeSize,
          totalValue: totalValue,
          totalSent: partner.totalSent,
          totalReceived: partner.totalReceived
        });
        
        // Add links for sent and received transactions
        if (partner.totalSent > 0) {
          links.push({
            source: centralAddress,
            target: partner.address,
            value: partner.totalSent,
            direction: 'sent'
          });
        }
        
        if (partner.totalReceived > 0) {
          links.push({
            source: partner.address,
            target: centralAddress,
            value: partner.totalReceived,
            direction: 'received'
          });
        }
      }
    });
    
    return { nodes, links };
  };
  
  // Render the evolution graph
  useEffect(() => {
    if (!svgRef.current || evolutionData.length === 0 || currentStep >= evolutionData.length) return;
    
    const currentData = evolutionData[currentStep];
    const width = svgRef.current.clientWidth;
    const height = 500;
    
    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    
    // Add a background for better visibility
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#f5f7f9");
    
    // Create a force simulation
    const simulation = d3.forceSimulation(currentData.network.nodes)
      .force("link", d3.forceLink(currentData.network.links)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(d => Math.sqrt(d.size) / 2));
    
    // Draw the links
    const link = svg.append("g")
      .selectAll("line")
      .data(currentData.network.links)
      .enter()
      .append("line")
      .attr("stroke-width", d => Math.max(1, Math.min(5, Math.log(d.value + 1))))
      .attr("stroke", d => d.direction === 'sent' ? '#ff9999' : '#99ff99')
      .attr("opacity", 0.7)
      .attr("marker-end", d => d.direction === 'sent' ? "url(#arrowSent)" : "url(#arrowReceived)");
    
    // Add arrow markers for directed links
    svg.append("defs").selectAll("marker")
      .data(["sent", "received"])
      .enter().append("marker")
      .attr("id", d => `arrow${d === 'sent' ? 'Sent' : 'Received'}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", d => d === 'sent' ? '#ff9999' : '#99ff99')
      .attr("d", "M0,-5L10,0L0,5");
    
    // Draw the nodes
    const node = svg.append("g")
      .selectAll(".node")
      .data(currentData.network.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add circles for nodes
    node.append("circle")
      .attr("r", d => Math.sqrt(d.size) / 2)
      .attr("fill", d => d.color)
      .attr("stroke", d => d.isCentral ? "#ffffff" : "none")
      .attr("stroke-width", d => d.isCentral ? 2 : 0);
    
    // Add labels to nodes
    node.append("text")
      .attr("dy", -12)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .text(d => d.id.substring(0, 6) + "..." + d.id.substring(d.id.length - 4));
    
    // Update positions on each tick of the simulation
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Add timeline info
    const timeInfo = svg.append("text")
      .attr("class", "time-info")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .text(`Network at ${currentData.date.toLocaleDateString()} (${currentData.transactionCount} transactions)`);
    
    // Add step info
    const stepInfo = svg.append("text")
      .attr("class", "step-info")
      .attr("x", 20)
      .attr("y", height - 20)
      .attr("font-size", 12)
      .text(`Step ${currentStep + 1} of ${evolutionData.length}`);
      
  }, [evolutionData, currentStep]);
  
  // Handle animation playback
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setTimeout(() => {
        if (currentStep < evolutionData.length - 1) {
          setCurrentStep(prevStep => prevStep + 1);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, currentStep, evolutionData.length, playbackSpeed]);
  
  // Playback controls
  const handlePlay = () => {
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };
  
  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentStep(prev => Math.max(0, prev - 1));
  };
  
  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStep(prev => Math.min(evolutionData.length - 1, prev + 1));
  };
  
  const handleSpeedChange = (e) => {
    setPlaybackSpeed(parseInt(e.target.value));
  };
  
  return (
    <div className="network-evolution">
      <h3 className="title">Network Evolution Over Time</h3>
      
      <div className="evolution-container">
        {evolutionData.length === 0 ? (
          <div className="no-data">
            <p>Insufficient timestamp data to show network evolution.</p>
            <p>Try searching for an address with more timestamped transactions.</p>
          </div>
        ) : (
          <>
            <div className="evolution-controls">
              <button
                onClick={handleReset}
                disabled={currentStep === 0}
                className="control-button"
              >
                ⏮️ Reset
              </button>
              <button
                onClick={handleStepBack}
                disabled={currentStep === 0}
                className="control-button"
              >
                ⏪ Back
              </button>
              {isPlaying ? (
                <button onClick={handlePause} className="control-button">
                  ⏸️ Pause
                </button>
              ) : (
                <button 
                  onClick={handlePlay} 
                  disabled={currentStep === evolutionData.length - 1}
                  className="control-button"
                >
                  ▶️ Play
                </button>
              )}
              <button
                onClick={handleStepForward}
                disabled={currentStep === evolutionData.length - 1}
                className="control-button"
              >
                ⏩ Forward
              </button>
              <div className="speed-control">
                <label htmlFor="speed">Speed: </label>
                <select
                  id="speed"
                  value={playbackSpeed}
                  onChange={handleSpeedChange}
                  className="speed-select"
                >
                  <option value="2000">Slow</option>
                  <option value="1000">Normal</option>
                  <option value="500">Fast</option>
                  <option value="200">Very Fast</option>
                </select>
              </div>
            </div>
            
            <div className="evolution-timeline">
              {evolutionData.map((step, index) => (
                <div
                  key={index}
                  className={`timeline-point ${index === currentStep ? 'active' : ''}`}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep(index);
                  }}
                  title={`${step.date.toLocaleDateString()} - ${step.transactionCount} transactions`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
            
            <div className="evolution-graph">
              <svg ref={svgRef} className="network-svg"></svg>
            </div>
            
            <div className="evolution-info">
              {currentStep < evolutionData.length && (
                <div className="current-state-info">
                  <p className="info-date">
                    <strong>Date:</strong> {evolutionData[currentStep].date.toLocaleDateString()}
                  </p>
                  <p className="info-transactions">
                    <strong>Transactions:</strong> {evolutionData[currentStep].transactionCount}
                  </p>
                  <p className="info-partners">
                    <strong>Partners:</strong> {evolutionData[currentStep].network.nodes.length - 1}
                  </p>
                  <p className="info-volume">
                    <strong>Total Volume:</strong> {
                      evolutionData[currentStep].network.links
                        .reduce((sum, link) => sum + link.value, 0)
                        .toFixed(4)
                    } ETH
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <div className="legend">
        <div className="legend-item">
          <span className="node-dot search-address"></span>
          <span>Central Address</span>
        </div>
        <div className="legend-item">
          <span className="node-dot partner-address"></span>
          <span>Partner Address</span>
        </div>
        <div className="legend-item">
          <span className="link-line sent"></span>
          <span>ETH Sent</span>
        </div>
        <div className="legend-item">
          <span className="link-line received"></span>
          <span>ETH Received</span>
        </div>
        <div className="legend-note">
          <p>* Use the timeline to see how the network evolved over time</p>
          <p>* Node size represents accumulated transaction volume</p>
          <p>* Line thickness represents transaction amounts</p>
        </div>
      </div>
    </div>
  );
};

export default NetworkEvolution;