export const getLiveQuotes = async (symbols: string[]) => {
  try {
    const res = await fetch(`/api/finance/quote?symbols=${symbols.join(',')}`);
    if (!res.ok) throw new Error('Failed to fetch quotes');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getLiveHistory = async (symbol: string, range?: string, interval?: string) => {
  try {
    let url = `/api/finance/history?symbol=${symbol}`;
    if (range) url += `&range=${range}`;
    if (interval) url += `&interval=${interval}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch history');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
};
