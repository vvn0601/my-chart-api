import yahooFinance from 'yahoo-finance2';

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
    // 1. 強制轉大寫 (確保 aapl -> AAPL)
    const safeSymbol = symbol.toUpperCase();

    // 2. 智慧判斷：
    //    純數字 (如 2330) -> 視為台股，加 .TW
    //    非純數字 (如 AAPL) -> 視為美股，維持原樣
    const isTW = /^\d+$/.test(safeSymbol);
    const querySymbol = isTW ? `${safeSymbol}.TW` : safeSymbol;

    console.log(`Fetching: ${querySymbol} (${start} ~ ${end})`);

    const result = await yahooFinance.historical(querySymbol, {
      period1: start,
      period2: end
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
