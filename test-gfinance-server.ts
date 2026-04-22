import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

app.get("/api/finance/quote", async (req, res) => {
  try {
    const { symbol } = req.query;
    // Basic mapping, assuming user inputs TICKER or TICKER:EXCHANGE
    let querySymbol = symbol as string;
    if (!querySymbol.includes(':')) {
       // fallback, could be NASDAQ or NYSE
       querySymbol = `${querySymbol}:NASDAQ`; 
    }
    const response = await axios.get(`https://www.google.com/finance/quote/${querySymbol}`);
    const $ = cheerio.load(response.data);
    
    // Scrape price
    const priceText = $('.YMlKec.fxKbKc').first().text();
    const price = parseFloat(priceText.replace(/[^0-9.-]+/g,""));
    
    // Scrape name
    const name = $('.zzDege').first().text();
    
    if (isNaN(price)) {
        return res.status(404).json({ error: "Quote not found on Google Finance" });
    }
    
    res.json({
       price,
       symbol: querySymbol,
       name: name || querySymbol
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Test running on ${PORT}`);
});
