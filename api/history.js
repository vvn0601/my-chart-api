import yahooFinance from "yahoo-finance2";

export default async function handler(req, res) {
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

  // --- 2. 接收參數 ---
  const { symbol, start, end } = req.query;

  try {
    if (!symbol) throw new Error('Symbol is required');

    const safeSymbol = symbol.toUpperCase();
    
    // 判斷是否為台股：純數字 或 結尾是 .TW
    const isTW = /^\d+$/.test(safeSymbol) || safeSymbol.endsWith('.TW');
    
    let resultData = [];

    // --- 3. 分流邏輯 ---

    if (isTW) {
      //Params: 台股策略 (FinMind)
      
      // 強制去掉 .TW，只取前面的代碼
      const stockId = safeSymbol.replace('.TW', '');
      
      console.log(`[TW Mode] Fetching ${stockId} from FinMind (${start} to ${end})`);

      // FinMind URL
      const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${start}&end_date=${end}`;
      
      const response = await fetch(apiUrl);
      const json = await response.json();

      // 轉換 FinMind 格式為 Yahoo 格式
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
      } else {
        console.warn(`FinMind returned no data for ${stockId}`);
      }

    } else {
      //Params: 美股策略 (Yahoo Finance)
      console.log(`[US Mode] Fetching ${safeSymbol} from Yahoo`);

      // 美股直接用，移除多餘的 header 設定
      resultData = await yahooFinance.historical(safeSymbol, {
        period1: start,
        period2: end
      }, {
        validateResult: false 
      });
    }

    // --- 4. 回傳結果 ---
    res.status(200).json(resultData);

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ 
      error: 'Fetch Failed', 
      details: error.message 
    });
  }
}
