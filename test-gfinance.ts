import gf from 'google-finance';

gf.historical({
  symbol: 'AAPL',
  from: '2024-01-01',
  to: '2024-04-01'
}, function(err, res) {
  if (err) console.error(err);
  else console.log(res);
});