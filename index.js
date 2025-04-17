const https = require('https');
const crypto = require('crypto');
const strategy = require('./strategy'); // Import the strategy module

// OKX API credentials (replace with your actual credentials)
const apiKey = '4be582e6-5df5-48da-b7ed-fd096c08463a'; // Replace with your API key
const secretKey = '562CDC5951824751EBBADA2B629407E8'; // Replace with your secret key
const passphrase = 'Kis08875892@'; // Replace with your passphrase

// Function to generate the OKX API signature
function generateSignature(timestamp, method, requestPath, body = '') {    
    const bodyString = body ? JSON.stringify(body) : '';
    const prehash = timestamp + method.toUpperCase() + requestPath + bodyString;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(prehash)
      .digest('base64');
    return signature
}

// Function to send requests to the OKX API
function sendRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    // Generate the timestamp in ISO 8601 format
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5${endpoint}`;
    const body = data ;
    const signature = generateSignature(timestamp, method, requestPath, data);

    const options = {
      hostname: 'www.okx.com',
      port: 443,
      path: requestPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'X-SDK-LANG': 'nodejs',
        'X-SIMULATED-TRADING': 1,
        'OK-ACCESS-PASSPHRASE': passphrase,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body && (method !== 'GET' )) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Function to fetch account balance
async function getBalance() {
  try {
    // Send a GET request to the /api/v5/account/balance endpoint
    const response = await sendRequest('GET', '/account/balance');
    console.log('Account Balance:', response);
    return response;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return null;
  }
}

// Function to place an order (market for simplicity, adapt as needed for limit/stop-loss)
async function placeLimitOrder(instrumentId, side, size, price) {
  try {
    // Prepare the order details
    const orderDetails = {
      instId: instrumentId,
      tdMode: 'cash', // Use 'simulated' for demo trading
      side: side,
      ordType: 'market', // Changed to market order for immediate execution
      sz: size,
      px: price,
    };
    // Send a POST request to the /api/v5/trade/order endpoint
    const response = await sendRequest('POST', '/trade/order', orderDetails);
    console.log('Order placed:', response);
    return response;
  } catch (error) {
    console.error('Error placing order:', error);
    return null;
  }
}

// Function to fetch open orders
async function getOpenOrders(instrumentId) {
  try {
    // There is no body for this call.
    const params = null
    
    // Send a GET request to the /api/v5/trade/orders-pending endpoint
    const response = await sendRequest('GET', '/trade/orders-pending');
    console.log('Open Orders:', response);
    return response;
  } catch (error) {
    console.error('Error fetching open orders:', error);
    return null;
  }
}

// Trading Logic
async function runStrategy() {
  const instruments = ['BTC-USDT', 'XRP-USDT', 'HBAR-USDT'];
  const tradeSize = '20'; // USDT

  for (const instrumentId of instruments) {
    try {
      await strategy.runStrategy(instrumentId, tradeSize, sendRequest); // Pass tradeSize and sendRequest to the strategy
    } catch (error) {
      console.error(`Error processing signal for ${instrumentId}:`, error);
    }
  }
}

setInterval(runStrategy, 300000); // Run every 5 minutes (300000 ms)

getBalance();