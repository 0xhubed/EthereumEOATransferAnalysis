# Blockchain Transfer History Explorer

A web application that allows users to explore transfer history between Ethereum addresses. This app specializes in showing all Externally Owned Accounts (EOAs) that a specific address has directly transferred coins with, along with the transfer amounts.

## Features

- Search for any Ethereum address transfer history
- Display all EOAs that have transferred ETH with the searched address
- View detailed transaction history between addresses
- See total amounts sent and received between addresses

## Technology Stack

- React.js - Frontend framework
- Alchemy SDK - For accessing Ethereum blockchain data

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

## Obtaining an Alchemy API Key

To use this application, you'll need an Alchemy API key:

1. Sign up for a free account at [Alchemy](https://www.alchemy.com/)
2. Create a new application in the Alchemy dashboard
3. Select the Ethereum network you want to use
4. Copy your API key and use it in the application

## License

MIT