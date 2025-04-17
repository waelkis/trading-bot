// strategy.js

// Placeholder functions for external dependencies
const ta = {
  ema: (series, length) => {
    // Placeholder: Replace with actual EMA calculation
    return series.map((x, i) => {
      if (i < length - 1) return undefined;
      const values = series.slice(i - length + 1, i + 1).filter(v => v !== undefined);
      if (values.length < length) return undefined;
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });
  },
};

const math = {
  abs: (x) => Math.abs(x),
};

// Range Filter indicator functions
function smoothrng(x, t, m) {
  const wper = t * 2 - 1;
  const avrng = ta.ema(x.map((val, i) => i > 0 ? math.abs(val - x[i - 1]) : 0), t);
  const smoothedAvrng = ta.ema(avrng, wper);
  return smoothedAvrng.map(val => val * m);
}

function rngfilt(x, r) {
  let rngfiltVal = x[0]; 
  const result = [rngfiltVal];

  for (let i = 1; i < x.length; i++) {
    const currentX = x[i];
    const previousFilt = result[i - 1];
    const currentR = r[i];

    if (currentX > previousFilt) {
      rngfiltVal = currentX - currentR < previousFilt ? previousFilt : currentX - currentR;
    } else {
      rngfiltVal = currentX + currentR > previousFilt ? previousFilt : currentX + currentR;
    }
    result.push(rngfiltVal);
  }

  return result;
}

// --- Trading Bot Logic ---

const instruments = ["BTCUSDT", "XRPUSDT", "HBARUSDT"]; // Example instruments, adjust as needed
const timeframe = "5m";
const per = 100; // Sampling Period
const mult = 3.0; // Range Multiplier

async function fetchHistoricalData(instrument, timeframe, sendRequest) {
  console.log(`Fetching historical data for ${instrument} on ${timeframe} from OKX API`);
  try {
    // Assuming instrument is like 'BTCUSDT' and needs to be 'BTC-USDT' for the API
    const apiInstrumentId = instrument.replace('USDT', '-USDT');
    const params = {
      instId: apiInstrumentId,
      bar: timeframe,
    };
    // Assuming sendRequest is available and handles the base URL
    const response = await sendRequest('GET', '/market/candles', params);

    if (response.code === '0' && response.data && response.data.length > 0) {
      // OKX API returns candles in reverse chronological order, and each candle is an array of strings.
      // Example: [
      //   ["1624476300000","34670.2","34685.7","34666.7","34680.3","21.3410326","740925.1901"],
      //   ...
      // ]
      const candles = response.data[0].map(item => ({ close: parseFloat(item[4]) })); // item[4] is the closing price
      // We need it in chronological order
      return candles.reverse();
    } else {
      console.error('Error fetching historical data:', response);
      return [];
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

async function placeOrder(instrument, side, tradeSize) {
  // Placeholder: Replace with actual order placement via OKX API
  console.log(`Placing ${side} order for ${instrument} with size ${tradeSize}`);
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 200));
}

async function closePosition(instrument) {
  // Placeholder: Replace with actual position closing via OKX API
  console.log(`Closing position for ${instrument}`);
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 200));
}

async function runStrategy(instrument, tradeSize, sendRequest) {
  try {
    const candles = await fetchHistoricalData(instrument, timeframe);
    const closePrices = candles.map(candle => candle.close);

    const smrngValues = smoothrng(closePrices, per, mult);
    const filtValues = rngfilt(closePrices, smrngValues);

    let position = null; // null, "long", or "short"
    let condIni = 0;

    for (let i = 1; i < closePrices.length; i++) {
      const src = closePrices[i];
      const prevSrc = closePrices[i - 1];
      const filt = filtValues[i];
      const prevFilt = filtValues[i-1] || filtValues[0]; // Use first value if previous is undefined
      const upward = filt > prevFilt ? (i > 1 ? (filtValues[i-1] > filtValues[i-2] ? 1 : 0) : 1) : 0;
      const downward = filt < prevFilt ? (i > 1 ? (filtValues[i-1] < filtValues[i-2] ? 1: 0) : 1) : 0;
      
      const longCond = (src > filt && src > prevSrc && upward > 0) || (src > filt && src < prevSrc && upward > 0);
      const shortCond = (src < filt && src < prevSrc && downward > 0) || (src < filt && src > prevSrc && downward > 0);

      condIni = longCond ? 1 : shortCond ? -1 : condIni;
      const longCondition = longCond && (i > 0 ? (closePrices[i-1] < filtValues[i-1]) : false);
      const shortCondition = shortCond && (i > 0 ? (closePrices[i-1] > filtValues[i-1]) : false);

      if (longCondition && position !== "long") {
        if (position === "short") {
          await closePosition(instrument);
        }
        const orderResult = await placeOrder(instrument, "long", tradeSize);
        if (orderResult.success) {
          position = "long";
        }
      } else if (shortCondition && position !== "short") {
        if (position === "long") {
          await closePosition(instrument);
        }
        const orderResult = await placeOrder(instrument, "short", tradeSize);
        if (orderResult.success) {
          position = "short";
        }
      }
    }
  } catch (error) {
    console.error(`Error running strategy for ${instrument}:`, error);
  }
}

// Run the strategy for each instrument
async function main() {
  for (const instrument of instruments) {
    await runStrategy(instrument);
  }
  console.log("Strategy execution completed.");
}

// Start the bot (you'll need to adapt this for your environment, e.g., a loop with a delay)
// main();  // Commented out to prevent immediate execution
console.log("Trading bot initialized. Call main() to start.");

// --- Notes ---
// 1.  Replace placeholder functions (fetchHistoricalData, placeOrder, closePosition)
//     with your actual OKX API integration.  You'll need to install the OKX SDK
//     and handle authentication.
// 2.  Error handling is basic.  Improve it for production use (e.g., retry logic).
// 3.  Consider adding position sizing, stop-loss/take-profit orders, and other
//     risk management features.
// 4.  Backtest thoroughly before live trading.
module.exports={runStrategy}