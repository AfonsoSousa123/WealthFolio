import { Finance } from 'google-finance-quote';

const finance = new Finance();
finance.setFrom('USD').setTo('JPY');
finance.quote().then(res => console.log('quote', res));
