import yahooFinance from 'yahoo-finance2';

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

    // 2. 判斷台股
    const safeSymbol = symbol.toUpperCase();
    const isTW = /^\d+$/.test(safeSymbol);
    const querySymbol = isTW ? `${safeSymbol}.TW` : safeSymbol;

    console.log(`Fetching: ${querySymbol}`);

    // 3. 呼叫 Yahoo (不使用全域設定，避免崩潰)
    // 加入 validateResult: false 是為了避免 Yahoo 回傳警告導致報錯
    const result = await yahooFinance.historical(querySymbol, {
      period1: start,
      period2: end
    }, { validateResult: false });

    res.status(200).json(result);

  } catch (error) {
    console.error("API Error:", error.message);
    // 即使出錯，也要回傳 JSON，這樣前端才不會顯示 500 崩潰畫面
    res.status(500).json({ 
      error: 'Fetch Failed', 
      details: error.message,
      hint: 'Yahoo might be rate limiting this IP.' 
    });
  }
}
