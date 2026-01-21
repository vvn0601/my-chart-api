import yahooFinance from 'yahoo-finance2';

// 1. 全局設定：偽裝成一般瀏覽器
yahooFinance.setGlobalConfig({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  queue: {
    concurrency: 1, // 降低併發數，避免被擋
    limit: 1,
    interval: 1000
  }
});

export default async function handler(req, res) {
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

  if (!symbol) return res.status(400).json({ error: 'Symbol missing' });

  try {
    const isTW = /^\d+$/.test(symbol);
    const querySymbol = isTW ? `${symbol}.TW` : symbol;

    console.log(`Fetching: ${querySymbol}`);

    // 2. 加上 suppressErrors 選項，忽略一些非致命警告
    const result = await yahooFinance.historical(querySymbol, {
      period1: start,
      period2: end
    }, { validateResult: false }); 

    res.status(200).json(result);
  } catch (error) {
    console.error("Yahoo Error:", error.message);
    // 回傳具體錯誤訊息，方便除錯
    res.status(500).json({ error: 'Yahoo Finance Blocked Request', details: error.message });
  }
}
