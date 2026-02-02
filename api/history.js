// 強制引入 node-fetch，避免 Vercel 環境找不到 fetch
import fetch from 'node-fetch';
import yahooFinance from "yahoo-finance2";

export default async function handler(req, res) {
  // 1. 設定 CORS
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
    const isTW = /^\d+$/.test(safeSymbol) || safeSymbol.endsWith('.TW');
    
    let resultData = [];

    if (isTW) {
      // 台股邏輯 (FinMind)
      const stockId = safeSymbol.replace('.TW', '').replace('.TWO', '');
      console.log(`[TW] ${stockId}`);
      
      const apiUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${start}&end_date=${end}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`FinMind error: ${response.status}`);
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
      // 美股邏輯 (Yahoo)
      console.log(`[US] ${safeSymbol}`);
      
      // 使用 chart
      const chartResult = await yahooFinance.chart(safeSymbol, {
        period1: start,
        period2: end,
        interval: '1d'
      }, { validateResult: false });

      if (chartResult && chartResult.quotes) {
        resultData = chartResult.quotes.map(q => ({
          date: new Date(q.date).toISOString().split('T')[0],
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
    // 重要：這裡回傳 200 狀態碼但包裝錯誤訊息，
    // 這樣瀏覽器才收得到 CORS header，你才能在 Console 看到真正的錯誤！
    res.status(200).json({ 
      error: true, // 前端可以判斷這個 flag
      message: error.message,
      stack: error.stack
    });
  }
}
