import yfModule from "yahoo-finance2";
const yahooFinance = yfModule.default ?? yfModule;

export default async function handler(req, res) {
  // CORS 設定
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
    const isTW = /^\d+$/.test(safeSymbol);
    const querySymbol = isTW ? `${safeSymbol}.TW` : safeSymbol;

    console.log(`Fetching with mask: ${querySymbol}`);

    // 關鍵修正：在請求中直接帶入 User-Agent 偽裝
    const result = await yahooFinance.historical(querySymbol, {
      period1: start,
      period2: end
    }, {
      validateResult: false, // 忽略警告
      fetchOptions: {
        headers: {
          // 這是偽裝的關鍵，假裝自己是瀏覽器
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    });

    res.status(200).json(result);

  } catch (error) {
    console.error("API Error:", error.message);
    
    // 如果還是被擋，回傳特定的 JSON 讓你知道
    res.status(500).json({ 
      error: 'Fetch Failed', 
      details: error.message.includes('Unexpected token') ? 'Yahoo Rate Limit (Blocked)' : error.message
    });
  }
}
