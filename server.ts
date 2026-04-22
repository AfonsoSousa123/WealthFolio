import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import YahooFinance from "yahoo-finance2";

dotenv.config();

const yahooFinance = new YahooFinance();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common symbol fallbacks to bypass flaky Yahoo Finance search API
const SYMBOL_MAP: Record<string, string> = {
  "VWCE": "VWCE.DE",
  "EUNA": "EUNA.DE",
  "BTC": "BTC-USD",
  "ETH": "ETH-USD",
  "IWDA": "IWDA.AS",
  "GLD": "GLD"
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Yahoo Finance Proxy routes
  app.get("/api/finance/quote", async (req, res) => {
    try {
      const symbols = req.query.symbols as string; // comma separated
      if (!symbols) return res.status(400).json({ error: "Missing symbol(s)" });
      
      const symbolList = symbols.split(',').map(s => s.trim());
      const results = [];
      
      for (const symbol of symbolList) {
        let querySymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;
        
        // Only run search if not in our predefined map
        if (!SYMBOL_MAP[symbol.toUpperCase()]) {
          try {
            const searchRes: any = await yahooFinance.search(symbol);
            const bestMatch = searchRes.quotes.find((q: any) => q.isYahooFinance) || searchRes.quotes[0];
            if (bestMatch) querySymbol = bestMatch.symbol;
          } catch (searchErr: any) {
            console.warn(`Search failed for ${symbol}, falling back to ${querySymbol}. Error:`, searchErr.message);
          }
        }
        
        try {
          const quote: any = await yahooFinance.quote(querySymbol);
          results.push({
            originalSymbol: symbol,
            yahooSymbol: querySymbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            name: quote.longName || quote.shortName || symbol,
            currency: quote.currency
          });
        } catch (err: any) {
          console.error(`Error fetching quote for ${symbol} using ${querySymbol}:`, err.message);
        }
      }
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/finance/history", async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      const rangeParam = (req.query.range as string) || '1y';
      const intervalParam = (req.query.interval as string) || '1d';
      
      if (!symbol) return res.status(400).json({ error: "Missing symbol" });
      
      let querySymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;
      
      if (!SYMBOL_MAP[symbol.toUpperCase()]) {
        try {
          const searchRes: any = await yahooFinance.search(symbol);
          const bestMatch = searchRes.quotes.find((q: any) => q.isYahooFinance) || searchRes.quotes[0];
          if (bestMatch) querySymbol = bestMatch.symbol;
        } catch (searchErr: any) {
          console.warn(`History search failed for ${symbol}, falling back to ${querySymbol}. Error:`, searchErr.message);
        }
      }

      // Map range to period1
      const now = new Date();
      let period1: Date | number = 0;
      
      switch (rangeParam) {
        case '1d': period1 = new Date(now.getTime() - 86400000); break;
        case '5d': period1 = new Date(now.getTime() - 5 * 86400000); break;
        case '7d': period1 = new Date(now.getTime() - 7 * 86400000); break;
        case '1mo': period1 = new Date(now.getTime() - 30 * 86400000); break;
        case '3mo': period1 = new Date(now.getTime() - 90 * 86400000); break;
        case '6mo': period1 = new Date(now.getTime() - 180 * 86400000); break;
        case '1y': period1 = new Date(now.getTime() - 365 * 86400000); break;
        case '2y': period1 = new Date(now.getTime() - 2 * 365 * 86400000); break;
        case '5y': period1 = new Date(now.getTime() - 5 * 365 * 86400000); break;
        case '10y': period1 = new Date(now.getTime() - 10 * 365 * 86400000); break;
        case 'max': period1 = 0; break;
        default: period1 = new Date(now.getTime() - 365 * 86400000);
      }

      const queryOptions: any = {
        period1,
        period2: now,
        interval: intervalParam as any
      };

      try {
        // Use chart() instead of historical() as it's more flexible and historical() is deprecated in v3
        const result: any = await yahooFinance.chart(querySymbol, queryOptions);
        if (result && result.quotes) {
          const history = result.quotes.map((q: any) => ({
            date: q.date,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume
          })).filter((q: any) => q.close !== null && q.close !== undefined);
          return res.json({ symbol: querySymbol, history });
        }
        
        // Fallback or empty result
        res.json({ symbol: querySymbol, history: [] });
      } catch (e: any) {
        console.error(`Finance API error for ${querySymbol}:`, e.message);
        if (e.errors || e.subErrors) {
          console.error("Validation errors details:", JSON.stringify(e.errors || e.subErrors, null, 2));
        }
        res.status(500).json({ error: e.message });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
