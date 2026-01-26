import yahooFinance from "yahoo-finance2";

// 抑制 Yahoo 套件不必要的警告
yahooFinance.suppressNotices(['yahooSurvey', 'nonsensical', 'uncertainPeriod']);

export default async function handler(req, res) {
  // --- 1. CORS 設定 (維持不變) ---
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
  // 假設前端傳來的是: symbol="2330.TW" 或 "AAPL", start="2023-01-01", end="2023-12-31"
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
      
      // 【關鍵修改】: 強制去掉 .TW，只取前面的代碼 (符合你說的 "只有撈代碼")
      const stockId = safeSymbol.replace('.TW', '');
      
      console.log(`[TW Mode] Fetching ${stockId} from FinMind (${start} to ${end})`);

      // FinMind URL (日期格式剛好支援 YYYY-MM-DD，所以 start/end 直接帶入)
      const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${start}&end_date=${end}`;
      
      const response = await fetch(apiUrl);
      const json = await response.json();

      // 【關鍵轉換】: 為了不改 App 前端，這裡把 FinMind 的欄位名稱
      // 強制轉成 Yahoo 的欄位名稱 (open, high, low, close, volume)
      if (json.data && json.data.length > 0) {
        resultData = json.data.map(item => ({
          date: item.date,            // FinMind 也是 YYYY-MM-DD
          open: item.open,
          high: item.max,             // FinMind 叫 max，轉成 high
          low: item.min,              // FinMind 叫 min，轉成 low
          close: item.close,
          adjClose: item.close,       // 台股暫用 close 當 adjClose
          volume: item.Trading_Volume // FinMind 叫 Trading_Volume，轉成 volume
        }));
      } else {
        console.warn(`FinMind returned no data for ${stockId}`);
        // 如果 FinMind 沒抓到，維持空陣列，避免報錯
      }

    } else {
      //Params: 美股策略 (Yahoo Finance)
      console.log(`[US Mode] Fetching ${safeSymbol} from Yahoo`);

      // 美股不需要特別去背 .TW，直接帶入即可
      // 也不需要手動偽裝 Header，讓套件自動處理
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
