import gf from 'google-finance-data';
gf.getSymbol('AAPL').then(console.log).catch(console.error);