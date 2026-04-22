import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const symbol = 'AAPL:NASDAQ';
  const res = await axios.get(`https://www.google.com/finance/quote/${symbol}`);
  const $ = cheerio.load(res.data);
  const price = $('.YMlKec.fxKbKc').text();
  console.log('Price:', price);
}
test();