# Blockchain Transfer History Explorer

A web application that allows users to explore transfer history between Ethereum addresses. This app specializes in showing all Externally Owned Accounts (EOAs) that a specific address has directly transferred coins with, along with the transfer amounts.

> **Note:** This project was generated with [Claude Code](https://claude.ai/code) as a learning project to demonstrate AI-assisted software development.

## Core Features

- Search for any Ethereum address transfer history
- Display all EOAs that have transferred ETH with the searched address
- View detailed transaction history between addresses 
- See total amounts sent and received between addresses
- Save and manage search history with detailed notes and tags
- Export transaction data in various formats

## Data Visualization Features

- **Network Graph Visualization**: Interactive graph showing relationships between addresses
- **Time-Based Analysis**: ✅ Timeline visualization showing how transfer patterns evolve over time
- **Network Evolution**: ✅ Animated visualization showing how a transaction network grows over time
- **3D Visualization**: ✅ Immersive 3D exploration of complex transaction networks
- **Heat Maps**: ✅ Geographic distribution visualization of transaction patterns
- **Anomaly Highlighting**: ✅ Visual emphasis on unusual transactions that deviate from normal patterns

## Advanced Analytics Features

- **Transaction Pattern Recognition**: ✅ Automated identification of common transaction patterns
- **Smart Contract Interaction Analysis**: ✅ Visualization of how addresses interact with smart contracts
- **Wallet Profiling**: ✅ Automatic categorization of wallets based on behavior (trader, hodler, etc.)
- **Risk Scoring**: ✅ Assigns risk scores to addresses based on transaction patterns
- **Identity Clustering**: ✅ Groups addresses that likely belong to the same entity
- **Gas Usage Analysis**: ✅ Visualizes gas spending patterns and efficiency

## Technology Stack

- React.js - Frontend framework
- Alchemy SDK - For accessing Ethereum blockchain data
- D3.js - For advanced data visualizations and interactive graphs
- Three.js - For 3D visualizations (compatibility package)
- Tailwind CSS - Utility-first CSS framework
- shadcn/ui styled components - Modern UI component system

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Alchemy API key

## Getting Started

1. Clone the repository
   ```
   git clone https://github.com/yourusername/blockchain-web-app.git
   cd blockchain-web-app
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your Alchemy API key:
   ```
   REACT_APP_ALCHEMY_API_KEY=your-api-key-here
   ```

4. Start the development server
   ```
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Using the Application

1. The application will automatically use the Alchemy API key from your environment variables
2. Enter an Ethereum address to search for in the search box
3. View the list of EOAs that have transferred ETH with the searched address
4. Click on any transfer partner to see detailed transaction history
5. Use the visualization mode selector to switch between different views:
   - Standard Network View: 2D graph visualization
   - Timeline View: Time-based transaction history
   - Network Evolution: See how the transaction network evolves over time
   - 3D Visualization: Explore transactions in 3D space
   - Heat Map: View geographic distribution of transactions
6. Explore advanced analytics features:
   - Pattern Analysis: View detected transaction patterns and wallet behavior profiles
   - Contract Interactions: Analyze how addresses interact with smart contracts
   - Gas Usage Analysis: Examine gas spending patterns and efficiency
   - Identity Clustering: See groups of addresses that likely belong to the same entity

## Obtaining an Alchemy API Key

To use this application, you'll need an Alchemy API key:

1. Sign up for a free account at [Alchemy](https://www.alchemy.com/)
2. Create a new application in the Alchemy dashboard
3. Select the Ethereum network you want to use
4. Copy your API key and use it in the application

## UI Components Integration

This project uses a custom integration of shadcn-inspired UI components:

1. We've set up:
   - Tailwind CSS with a custom configuration
   - Core UI components like Button, Card, and Input
   - CSS variables for theming

2. Components added:
   - Button - Various styles and sizes for interactive elements
   - Card - Container component with header, content, and footer sections
   - Input - Form elements with consistent styling

3. How components were integrated:
   - Manual implementation of core shadcn-like components
   - Custom design system with consistency across all elements
   - Full compatibility with Tailwind utility classes

4. For adding more components, follow the pattern in `/src/components/ui/`

## Advanced Visualizations & Analytics

### Time-Based Analysis
The timeline visualization allows users to see how transactions occur over time. Users can:
- View transaction points plotted chronologically
- Identify periods of high activity
- Filter by different time periods (last 7 days, 4 weeks, 6 months, all time)
- Hover over points to see transaction details

### Network Evolution
This visualization shows how a transaction network grows and changes over time:
- Animated playback of network growth
- Step-by-step view of how new partners are added 
- Interactive timeline with play/pause controls
- Detailed metrics about the network at each point in time

### 3D Visualization
The 3D view provides an immersive way to explore complex transaction networks:
- Interactive 3D space for exploring transaction relationships
- Rotation controls for viewing the network from different angles
- Node sizes scaled to represent transaction volumes
- Visual indicators for anomalous transactions
- Depth perception to better understand complex networks

### Heat Maps
The geographic distribution visualization provides insights into transaction patterns:
- Color-coded regions based on transaction density
- Multiple visualization modes (volume, count, anomalies)
- Interactive regions with detailed statistics
- Simulated geographic distribution for demonstration purposes

### Transaction Pattern Analysis
Advanced analytics to identify common transaction behaviors:
- Detection of periodic/regular transfers
- Round number pattern identification
- Distribution and collection pattern detection
- Identification of abnormally large transfers
- Burst activity and cyclical behavior recognition

### Wallet Profiling & Risk Analysis
Automated behavior analysis provides insights into wallet characteristics:
- Wallet type classification (trader, hodler, distributor, etc.)
- Behavioral pattern identification
- Risk scoring based on transaction patterns
- Anomaly detection and flagging

### Identity Clustering
Groups addresses that likely belong to the same entity:
- Multiple clustering algorithms (temporal, co-spending, behavioral)
- Confidence scoring for relationship strength
- Detailed evidence for clustering decisions
- Cluster-level risk assessment

## License

MIT

---

*This project was built with the assistance of Claude Code, Anthropic's AI coding assistant. It demonstrates how AI-assisted development can rapidly implement complex visualizations and data analysis tools. The project serves as a learning resource for blockchain data analysis and AI-assisted software development.*

## Current Development Status

As of the latest update, we've implemented:

- ✅ Core transfer history exploration functionality
- ✅ All planned data visualization features (Network Graph, Timeline, Evolution, 3D, Heat Maps)
- ✅ Advanced analytics (Pattern Recognition, Contract Analysis, Wallet Profiling, Risk Scoring)
- ✅ Identity Clustering for address relationship analysis
- ✅ Search history management and data export capabilities

See the [ENHANCEMENT_IDEAS.md](./ENHANCEMENT_IDEAS.md) file for a complete roadmap of implemented and planned features.