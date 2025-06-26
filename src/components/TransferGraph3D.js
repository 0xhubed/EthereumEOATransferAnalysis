import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import './TransferGraph3D.css';

// Node component for 3D graph
const Node = ({ position, size, color, address, selected, onClick, totalValue, totalSent, totalReceived, isCenter }) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  
  // Format ETH values for display
  const formatEth = (value) => {
    if (value >= 100) return value.toFixed(2);
    if (value >= 10) return value.toFixed(3);
    if (value >= 1) return value.toFixed(4);
    if (value >= 0.001) return value.toFixed(5);
    return value.toExponential(2);
  };
  
  return (
    <group position={position}>
      {/* Sphere for the node */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(address);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial 
          color={selected ? "#ff8800" : color} 
          emissive={hovered ? "#555555" : "#000000"} 
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      
      {/* Label for the node */}
      <Text
        position={[0, size + 0.3, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {address.substring(0, 6) + "..." + address.substring(address.length - 4)}
      </Text>
      
      {/* Tooltip with details when hovered */}
      {hovered && (
        <Html position={[0, -size - 0.5, 0]} className="node-label" center>
          <div className="tooltip3d">
            <div className="tooltip3d-address">{address.substring(0, 10)}...</div>
            <div className="tooltip3d-value">Total: {formatEth(totalValue)} ETH</div>
            <div className="tooltip3d-sent">Sent: {formatEth(totalSent)} ETH</div>
            <div className="tooltip3d-received">Received: {formatEth(totalReceived)} ETH</div>
          </div>
        </Html>
      )}
      
      {/* Highlight for central node */}
      {isCenter && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[size + 0.1, 16, 16]} />
          <meshStandardMaterial 
            color="#ffffff" 
            transparent={true} 
            opacity={0.2} 
            wireframe={true}
          />
        </mesh>
      )}
    </group>
  );
};

// Connection (edge) between nodes
const Connection = ({ start, end, thickness, color }) => {
  const ref = useRef();
  
  useEffect(() => {
    if (ref.current) {
      // Calculate direction and position
      const direction = new THREE.Vector3().subVectors(end, start);
      const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const length = direction.length();
      
      // Set position and rotation
      ref.current.position.copy(center);
      ref.current.scale.set(thickness, length, thickness);
      ref.current.lookAt(end);
      ref.current.rotateX(Math.PI / 2);
    }
  }, [start, end, thickness]);
  
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[1, 1, 1, 16]} />
      <meshStandardMaterial
        color={color}
        transparent={true}
        opacity={0.7}
      />
    </mesh>
  );
};

// Arrow for direction indication
const Arrow = ({ start, end, color }) => {
  const ref = useRef();
  
  useEffect(() => {
    if (ref.current) {
      // Position at 80% of the way from start to end
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      direction.normalize();
      
      const position = new THREE.Vector3().copy(start).add(
        direction.multiplyScalar(length * 0.8)
      );
      
      // Set position and rotation
      ref.current.position.copy(position);
      ref.current.lookAt(end);
      ref.current.rotateX(Math.PI / 2);
    }
  }, [start, end]);
  
  return (
    <mesh ref={ref}>
      <coneGeometry args={[0.15, 0.4, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Camera auto-rotation effect
const CameraRotation = ({ speed = 0.0005, enabled }) => {
  const { camera } = useThree();
  
  useFrame(({ clock }) => {
    if (enabled) {
      const t = clock.getElapsedTime();
      camera.position.x = Math.sin(t * speed) * 25;
      camera.position.z = Math.cos(t * speed) * 25;
      camera.lookAt(0, 0, 0);
    }
  });
  
  return null;
};

// Main component
const TransferGraph3D = ({ transferPartners, searchAddress }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  
  // Process data for 3D visualization
  const nodes = [];
  const connections = [];
  
  // Add central node (the searched address)
  nodes.push({
    id: searchAddress,
    position: [0, 0, 0],
    size: 1,
    color: "#ff6347",
    address: searchAddress,
    isCenter: true,
    totalValue: 0,
    totalSent: 0,
    totalReceived: 0
  });
  
  // Calculate maximum transaction value for scaling
  const maxValue = Math.max(
    ...transferPartners.map(p => p.totalSent + p.totalReceived)
  );
  
  // Position partner nodes in a spherical arrangement
  transferPartners.forEach((partner, index) => {
    const totalValue = partner.totalSent + partner.totalReceived;
    
    // Calculate position on a sphere
    const phi = Math.acos(-1 + (2 * index) / transferPartners.length);
    const theta = Math.sqrt(transferPartners.length * Math.PI) * phi;
    
    // Radius depends on number of partners
    const radius = Math.min(15, Math.max(8, Math.log(transferPartners.length) * 3));
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // Node size based on transaction volume (scaled)
    const nodeSize = 0.2 + (totalValue / maxValue) * 0.8;
    
    // Color based on the ratio of sent/received
    let nodeColor = "#1f77b4"; // Default blue
    
    // Check for anomalies
    if (partner.anomalies && partner.anomalies.hasAnomalies) {
      nodeColor = "#db4437"; // Red for anomalies
    }
    
    // Add node
    nodes.push({
      id: partner.address,
      position: [x, y, z],
      size: nodeSize,
      color: nodeColor,
      address: partner.address,
      isCenter: false,
      totalValue: partner.totalSent + partner.totalReceived,
      totalSent: partner.totalSent,
      totalReceived: partner.totalReceived
    });
    
    // Add connections for sent and received transactions
    if (partner.totalSent > 0) {
      connections.push({
        source: searchAddress,
        target: partner.address,
        thickness: 0.05 + (partner.totalSent / maxValue) * 0.15,
        color: "#ff9999",
        value: partner.totalSent
      });
    }
    
    if (partner.totalReceived > 0) {
      connections.push({
        source: partner.address,
        target: searchAddress,
        thickness: 0.05 + (partner.totalReceived / maxValue) * 0.15,
        color: "#99ff99",
        value: partner.totalReceived
      });
    }
  });
  
  const handleNodeClick = (address) => {
    setSelectedNode(address === selectedNode ? null : address);
  };
  
  return (
    <div className="transfer-graph-3d">
      <h3>3D Network Visualization</h3>
      
      <div className="controls-3d">
        <button 
          onClick={() => setAutoRotate(!autoRotate)}
          className={autoRotate ? 'active' : ''}
        >
          {autoRotate ? '🛑 Stop Rotation' : '🔄 Auto Rotate'}
        </button>
        <button 
          onClick={() => setShowLabels(!showLabels)}
          className={showLabels ? 'active' : ''}
        >
          {showLabels ? '🏷️ Hide Labels' : '🏷️ Show Labels'}
        </button>
        <div className="help-text">
          <span>👆 Click and drag to rotate</span>
          <span>🖱️ Scroll to zoom</span>
          <span>🔍 Click on nodes for details</span>
        </div>
      </div>
      
      <div className="canvas-container">
        <Canvas 
          camera={{ position: [0, 0, 20], fov: 60 }}
          shadows
          className="three-canvas"
        >
          {/* Scene lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
          <directionalLight position={[-10, -10, -10]} intensity={0.5} />
          
          {/* Camera controls */}
          <CameraRotation enabled={autoRotate} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          
          {/* Graph nodes */}
          {nodes.map((node) => (
            <Node
              key={node.id}
              position={node.position}
              size={node.size}
              color={node.color}
              address={node.address}
              selected={node.id === selectedNode}
              onClick={handleNodeClick}
              totalValue={node.totalValue}
              totalSent={node.totalSent}
              totalReceived={node.totalReceived}
              isCenter={node.isCenter}
            />
          ))}
          
          {/* Graph connections */}
          {connections.map((connection, index) => {
            // Find source and target node objects
            const source = nodes.find(node => node.id === connection.source);
            const target = nodes.find(node => node.id === connection.target);
            
            if (!source || !target) return null;
            
            return (
              <group key={`connection-${index}`}>
                <Connection 
                  start={new THREE.Vector3(...source.position)}
                  end={new THREE.Vector3(...target.position)}
                  thickness={connection.thickness}
                  color={connection.color}
                />
                <Arrow
                  start={new THREE.Vector3(...source.position)}
                  end={new THREE.Vector3(...target.position)}
                  color={connection.color}
                />
              </group>
            );
          })}
        </Canvas>
      </div>
      
      <div className="legend-3d">
        <div className="legend-item">
          <span className="node-dot search-address"></span>
          <span>Central Address</span>
        </div>
        <div className="legend-item">
          <span className="node-dot partner-address"></span>
          <span>Partner Address</span>
        </div>
        <div className="legend-item">
          <span className="node-dot anomaly-address"></span>
          <span>Address with Anomalies</span>
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
          <p>* Sphere size represents total transaction volume</p>
          <p>* Line thickness represents transaction amounts</p>
          <p>* Arrows show direction of ETH flow</p>
        </div>
      </div>
    </div>
  );
};

export default TransferGraph3D;