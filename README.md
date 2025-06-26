# EtherFlow - Ethereum Transaction Analysis Made Simple

EtherFlow is a comprehensive web application for analyzing Ethereum transaction patterns and relationships. It provides powerful tools to visualize, analyze, and understand ETH transfer networks between addresses, featuring multiple visualization modes, advanced analytics, and anomaly detection.

> **Note:** This project was generated with [Claude Code](https://claude.ai/code) as a learning project to demonstrate AI-assisted software development.

## Key Features

### Core Analysis
- **Address Search**: Analyze any Ethereum address for transfer patterns with EOAs (Externally Owned Accounts)
- **Transfer Mapping**: View complete transfer relationships showing sent/received amounts
- **Time Filtering**: Filter analysis by specific block ranges for targeted investigation
- **Anomaly Detection**: Automatically identify unusual transaction patterns and suspicious activity
- **Saved Searches**: Manage search history with custom names and restore previous analyses

### Data Export & Management  
- **JSON Export**: Export complete transfer data for external analysis
- **Search History**: Quick access to recent searches and saved analysis sessions

### Interactive Visualizations
- **Standard Network Graph**: Interactive D3.js-powered node-link visualization showing address relationships
- **Timeline Visualization**: Chronological view of transactions over time with filtering capabilities  
- **Transaction Volume Heatmap**: Time-based patterns showing transaction density and volume
- **Tree Map Visualization**: Hierarchical representation of transaction volumes and relationships

### Advanced Analytics
- **Pattern Analysis**: Automated detection of periodic transfers, round number patterns, and distribution behaviors
- **Gas Usage Analysis**: Comprehensive gas spending analysis with optimization recommendations
- **Profit/Loss Analysis**: Track net gains/losses and value flow over time
- **Wallet Behavior Profiling**: Categorize addresses by behavior patterns (trader, holder, distributor, etc.)
- **Risk Assessment**: Calculate risk scores based on transaction patterns and anomalies

## Technology Stack

- **Frontend**: React.js with modern hooks and state management
- **Blockchain Data**: Alchemy SDK for reliable Ethereum network access
- **Visualizations**: D3.js for interactive charts and network graphs
- **Styling**: Tailwind CSS with custom shadcn/ui-inspired components
- **Analytics**: Custom services for pattern analysis, gas optimization, and profit/loss tracking

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Alchemy API key

## Getting Started

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/etherflow.git
   cd etherflow
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Alchemy API key:
   ```bash
   REACT_APP_ALCHEMY_API_KEY=your-api-key-here
   ```

4. Start the development server
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use EtherFlow

### Basic Analysis
1. **Setup**: The app automatically detects your Alchemy API key from environment variables
2. **Search**: Enter any valid Ethereum address (0x format) in the search box
3. **Filter**: Optionally enable time-based filtering using block numbers for targeted analysis
4. **Analyze**: View the complete list of transfer partners with sent/received amounts

### Visualization Options
Switch between different visualization modes to explore your data:
- **Standard Network**: Interactive graph showing address relationships
- **Timeline View**: Chronological transaction history with time-based insights
- **Volume Heatmap**: Visual patterns of transaction density over time
- **Tree Map**: Hierarchical view of transaction volumes

### Advanced Analytics
Access powerful analysis tools:
- **Pattern Analysis**: Detect periodic transfers, distribution patterns, and anomalies
- **Gas Analysis**: Examine gas usage patterns and get optimization recommendations  
- **Profit/Loss Analysis**: Track net value flow and portfolio performance over time

### Data Management
- **Save Searches**: Create named bookmarks for important addresses
- **Export Data**: Download complete transfer data as JSON for external analysis
- **Quick Access**: Use search history for rapid re-analysis of previous queries

## Obtaining an Alchemy API Key

To use this application, you'll need an Alchemy API key:

1. Sign up for a free account at [Alchemy](https://www.alchemy.com/)
2. Create a new application in the Alchemy dashboard
3. Select the Ethereum network you want to use
4. Copy your API key and use it in the application

## Deployment

EtherFlow can be easily deployed to Vercel or other static hosting platforms. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/etherflow&env=REACT_APP_ALCHEMY_API_KEY&envDescription=Alchemy%20API%20key%20for%20Ethereum%20data%20access&envLink=https://www.alchemy.com/)

**Important**: Since this is a client-side app, the API key will be visible to users. Use a free-tier Alchemy key and configure domain restrictions in your Alchemy dashboard for security.

## Architecture Overview

EtherFlow is built with a modular architecture for maintainability and extensibility:

### Component Structure
- **Core App**: Main application logic and state management in `src/App.js`
- **UI Components**: Reusable shadcn/ui-inspired components in `src/components/ui/`
- **Analysis Components**: Specialized components for different analytics in `src/components/`
- **Services**: Business logic and external API integration in `src/services/`

### Key Services
- **alchemyService.js**: Ethereum blockchain data fetching and processing
- **patternAnalysisService.js**: Transaction pattern detection and wallet profiling
- **gasAnalysisService.js**: Gas usage analysis and optimization recommendations
- **profitLossService.js**: Portfolio performance and value flow tracking
- **treeMapService.js**: Hierarchical data processing for tree map visualizations

## Feature Details

### Timeline Analysis
Chronological visualization reveals transaction patterns over time:
- Interactive timeline with transaction points plotted by timestamp
- Identify periods of high/low activity and behavioral changes
- Hover interactions show detailed transaction information
- Time period filtering for focused analysis

### Pattern Recognition
Automated detection of common transaction behaviors:
- **Periodic Transfers**: Regular/scheduled payment patterns
- **Round Numbers**: Preference for round transaction amounts
- **Distribution Patterns**: Single source to multiple destinations
- **Collection Patterns**: Multiple sources to single destination  
- **Large Transfer Detection**: Transactions significantly above average amounts

### Gas Usage Insights
Comprehensive analysis of transaction costs and efficiency:
- Gas price trends and optimization opportunities
- Transaction complexity analysis based on gas usage
- Cost efficiency recommendations for future transactions
- Comparative analysis against network averages

### Profit/Loss Tracking
Portfolio performance analysis over time:
- Net value flow calculations (inbound vs outbound)
- Time-based P&L tracking with visual charts
- ROI analysis for trading addresses
- Value flow visualization between address relationships

## License

MIT

---

*This project was built with the assistance of Claude Code, Anthropic's AI coding assistant. It demonstrates how AI-assisted development can rapidly implement complex visualizations and data analysis tools. The project serves as a learning resource for blockchain data analysis and AI-assisted software development.*

## Use Cases

EtherFlow is valuable for various Ethereum analysis scenarios:

### For Investigators & Analysts
- **Fraud Investigation**: Detect suspicious patterns and trace fund flows
- **Compliance Analysis**: Monitor address behavior for regulatory compliance
- **Risk Assessment**: Evaluate counterparty risk based on transaction patterns

### For Traders & Investors  
- **Portfolio Analysis**: Track performance and value flows across addresses
- **Due Diligence**: Research addresses before engaging in transactions
- **Market Research**: Understand trading patterns and behaviors

### For Researchers & Developers
- **Behavioral Analysis**: Study transaction patterns and wallet behaviors
- **Network Analysis**: Understand Ethereum transaction network topology
- **Gas Optimization**: Research efficient transaction strategies

## Development Status

**Current Version**: Fully functional with all core features implemented
- ✅ Complete transfer analysis and visualization suite
- ✅ Advanced pattern recognition and anomaly detection  
- ✅ Multi-mode visualizations (Network, Timeline, Heatmap, TreeMap)
- ✅ Comprehensive analytics (Pattern, Gas, Profit/Loss analysis)
- ✅ Search management and data export capabilities

For future enhancements and feature requests, see [ENHANCEMENT_IDEAS.md](./ENHANCEMENT_IDEAS.md).