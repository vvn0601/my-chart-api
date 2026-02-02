// 改用 require，避開 import 在某些環境的問題
const yahooFinance = require('yahoo-finance2').default; 

module.exports = async (req, res) => {
  // --- 1. CORS 設定 ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol, start, end } = req.query;

  try {
    if (!symbol) throw new Error('Symbol is required');

    const safeSymbol = symbol.toUpperCase();
    // 判斷是否為台股
    const isTW = /^\d+$/.test(safeSymbol) || safeSymbol.endsWith('.TW');
    
    let resultData = [];

    if (isTW) {
      // --- 台股邏輯 (FinMind) ---
      const stockId = safeSymbol.replace('.TW', '').replace('.TWO', '');
      console.log(`[TW Mode] Fetching ${stockId}`);
      
      const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${start}&end_date=${end}`;
      const response = await fetch(apiUrl);
      const json = await response.json();

      if (json.data && json.data.length > 0) {
        resultData = json.data.map(item => ({
          date: item.date,
          open: item.open,
          high: item.max,
          low: item.min,
          close: item.close,
          adjClose: item.close,
          volume: item.Trading_Volume
        }));
      }
    } else {
      // --- 美股邏輯 (Yahoo) ---
      console.log(`[US Mode] Fetching ${safeSymbol}`);
      
      // 重點：必須用 new Date() 包起來，並建議改用 historical 方法比較穩定
    const result = await yahooFinance.historical(safeSymbol, {
      period1: new Date(start), // 👈 轉成 Date 物件
      period2: new Date(end),   // 👈 轉成 Date 物件
      interval: '1d'
    });

      if (result && result.length > 0) {
        resultData = result.map(q => ({
          date: q.date.toISOString().split('T')[0], // 格式化日期
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          adjClose: q.adjclose || q.close,
          volume: q.volume
        }));
      }
    }

    res.status(200).json(resultData);

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ 
      error: 'Fetch Failed', 
      details: error.message 
    });
  }
};
