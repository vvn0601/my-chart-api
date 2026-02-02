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

  const { symbol, start, end } = req.query;

  try {
    if (!symbol) throw new Error('Symbol is required');

    const safeSymbol = symbol.toUpperCase();
    
    // 判斷是否為台股：純數字 或 結尾是 .TW
    const isTW = /^\d+$/.test(safeSymbol) || safeSymbol.endsWith('.TW');
    
    let resultData = [];

    // --- 分流邏輯 ---
    if (isTW) {
      // 台股策略 (FinMind)
      const stockId = safeSymbol.replace('.TW', '').replace('.TWO', '');
      console.log(`[TW Mode] Fetching ${stockId} from FinMind (${start} to ${end})`);

      try {
        const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${start}&end_date=${end}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`FinMind API Error: ${response.statusText}`);
        
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
        } else {
          console.warn(`[TW Mode] No data for ${stockId}`);
          // 回傳空陣列而非報錯，避免前端 500
          resultData = [];
        }
      } catch (err) {
        console.error("[TW Mode] Error:", err.message);
        throw new Error(`FinMind Failed: ${err.message}`);
      }

    } else {
      // 美股策略 (Yahoo Finance)
      console.log(`[US Mode] Fetching ${safeSymbol} from Yahoo`);
      
      try {
        // 使用 .chart()
        const chartResult = await yahooFinance.chart(safeSymbol, {
          period1: start,
          period2: end,
          interval: '1d'
        }, { validateResult: false });

        if (chartResult && chartResult.quotes && Array.isArray(chartResult.quotes)) {
          resultData = chartResult.quotes.map(q => ({
            date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : new Date(q.date).toISOString().split('T')[0],
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            adjClose: q.adjclose || q.close,
            volume: q.volume
          }));
        } else {
          console.warn(`[US Mode] No quotes for ${safeSymbol}`);
          resultData = [];
        }
      } catch (err) {
        console.error("[US Mode] Error:", err.message);
        // 如果 Yahoo 抓不到，不要讓整個 Server 掛掉，回傳空陣列或錯誤訊息
        // 這裡選擇拋出錯誤讓最外層 catch 抓到
        throw new Error(`Yahoo Failed: ${err.message}`);
      }
    }

    // --- 回傳成功 ---
    res.status(200).json(resultData);

  } catch (error) {
    console.error("Global API Error:", error.message);
    // 即使失敗，也要回傳 JSON 格式的錯誤，而不是讓 Vercel 預設的 500 頁面出現
    res.status(500).json({ 
      error: 'Fetch Failed', 
      details: error.message,
      symbol: symbol 
    });
  }
}
