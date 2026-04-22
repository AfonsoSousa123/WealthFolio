import { Asset, AssetType } from "../types";

export const exportPortfolioToExcel = (assets: Asset[]) => {
  if (!window.XLSX) {
    alert("Excel library not loaded. Please refresh the page.");
    return;
  }

    // Prepare data for export - Aligning with "Estratégia Opção B"
  const data = assets.map(asset => {
    const totalValue = asset.quantity * asset.currentPrice;
    const totalCost = asset.quantity * asset.avgPrice;
    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    return {
      "Investimento": asset.name,
      "Símbolo": asset.symbol,
      "Estratégia": asset.type,
      "Quantidade": asset.quantity,
      "Preço Médio": asset.avgPrice,
      "Preço Atual": asset.currentPrice,
      "Moeda": asset.currency,
      "TER": asset.ter !== undefined ? `${asset.ter}%` : "",
      "Fund Size": asset.fundSize || "",
      "Replication": asset.replication || "",
      "Distribution": asset.distribution || "",
      "% de Alocação": asset.allocation ? `${asset.allocation}%` : "0%",
      "€ a investir": asset.targetInvestment || 0,
      "€ a investir cada": asset.targetInvestmentPerPerson || 0,
      "Valor Total": totalValue,
      "Ganho/Perda": gainLoss,
      "Ganho/Perda %": `${gainLossPercent.toFixed(2)}%`
    };
  });

  const worksheet = window.XLSX.utils.json_to_sheet(data);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  
  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  window.XLSX.writeFile(workbook, `WealthFolio_Export_${date}.xlsx`);
};

export const exportPortfolioToCSV = (assets: Asset[]) => {
  if (!window.XLSX) {
    alert("Excel library not loaded. Please refresh the page.");
    return;
  }

  const data = assets.map(asset => {
    const totalValue = asset.quantity * asset.currentPrice;
    const totalCost = asset.quantity * asset.avgPrice;
    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    return {
      "Investimento": asset.name,
      "Símbolo": asset.symbol,
      "Estratégia": asset.type,
      "Quantidade": asset.quantity,
      "Preço Médio": asset.avgPrice,
      "Preço Atual": asset.currentPrice,
      "Moeda": asset.currency,
      "TER": asset.ter !== undefined ? `${asset.ter}%` : "",
      "Fund Size": asset.fundSize || "",
      "Replication": asset.replication || "",
      "Distribution": asset.distribution || "",
      "% de Alocação": asset.allocation ? `${asset.allocation}%` : "0%",
      "€ a investir": asset.targetInvestment || 0,
      "€ a investir cada": asset.targetInvestmentPerPerson || 0,
      "Valor Total": totalValue,
      "Ganho/Perda": gainLoss,
      "Ganho/Perda %": `${gainLossPercent.toFixed(2)}%`
    };
  });

  const worksheet = window.XLSX.utils.json_to_sheet(data);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  
  const date = new Date().toISOString().split('T')[0];
  window.XLSX.writeFile(workbook, `WealthFolio_Export_${date}.csv`);
};

export const parseExcelImport = (file: File): Promise<Asset[]> => {
  return new Promise((resolve, reject) => {
    if (!window.XLSX) {
      reject("Excel library not loaded.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Try parsing as array of arrays to find the "Investimento" header row
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        let headerRowIndex = -1;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && typeof row[0] === 'string' && row[0].toLowerCase().includes('investimento')) {
            headerRowIndex = i;
            break;
          }
        }
        
        const parsedAssets: Asset[] = [];
        
        if (headerRowIndex !== -1) {
          // Found the Portuguese template or WealthFolio export
          const headers = rows[headerRowIndex].map((h: any) => String(h).toLowerCase());
          
          const idx = {
            name: headers.indexOf('investimento'),
            symbol: headers.indexOf('símbolo'),
            strategy: headers.indexOf('estratégia'),
            allocation: headers.indexOf('% de alocação'),
            amountToInvest: headers.indexOf('€ a investir'),
            amountPerPerson: headers.indexOf('€ a investir cada'),
            quantity: headers.indexOf('quantidade'),
            avgPrice: headers.indexOf('preço médio'),
            currentPrice: headers.indexOf('preço atual'),
            currency: headers.indexOf('moeda'),
            ter: headers.indexOf('ter'),
            fundSize: headers.indexOf('fund size'),
            replication: headers.indexOf('replication'),
            distribution: headers.indexOf('distribution')
          };
          
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || !r[idx.name]) break;
            if (r[idx.name] === 'Fundo de Emergência') break;
            
            const name = r[idx.name] || 'Unknown';
            const rawSymbol = idx.symbol !== -1 ? r[idx.symbol] : '';
            const strategy = idx.strategy !== -1 ? r[idx.strategy] : 'ETF';
            
            const allocationStr = idx.allocation !== -1 ? String(r[idx.allocation] || '0').replace('%', '').replace(',', '.') : '0';
            const allocation = parseFloat(allocationStr) || 0;
            
            const amountToInvestStr = idx.amountToInvest !== -1 ? String(r[idx.amountToInvest] || '0').replace(/[^0-9.-]+/g,"").replace(',', '.') : '0';
            const amountToInvest = parseFloat(amountToInvestStr) || 0;
            
            const amountPerPersonStr = idx.amountPerPerson !== -1 ? String(r[idx.amountPerPerson] || '0').replace(/[^0-9.-]+/g,"").replace(',', '.') : '0';
            const amountPerPerson = parseFloat(amountPerPersonStr) || 0;

            const quantity = idx.quantity !== -1 ? parseFloat(String(r[idx.quantity] || 0)) : 0;
            const avgPrice = idx.avgPrice !== -1 ? parseFloat(String(r[idx.avgPrice] || amountToInvest)) : amountToInvest;
            const currentPrice = idx.currentPrice !== -1 ? parseFloat(String(r[idx.currentPrice] || amountToInvest)) : amountToInvest;
            const currency = idx.currency !== -1 ? r[idx.currency] : 'EUR';
            
            const terStr = idx.ter !== -1 ? String(r[idx.ter] || '0').replace('%', '').replace(',', '.') : '0';
            const ter = parseFloat(terStr);

            const symbol = rawSymbol || name.split(' ').map((s: string) => s[0]).join('').substring(0, 4).toUpperCase();
            
            parsedAssets.push({
              id: `imported-${Date.now()}-${i}`,
              symbol: symbol || 'UNK',
              name: name,
              type: strategy as any,
              allocation: allocation,
              targetInvestment: amountToInvest,
              targetInvestmentPerPerson: amountPerPerson,
              quantity: quantity,
              avgPrice: avgPrice,
              currentPrice: currentPrice,
              currency: currency,
              ter: ter || undefined,
              fundSize: idx.fundSize !== -1 ? String(r[idx.fundSize]) : undefined,
              replication: idx.replication !== -1 ? String(r[idx.replication]) : undefined,
              distribution: idx.distribution !== -1 ? String(r[idx.distribution]) : undefined
            });
          }
        } else {
          // Legacy generic JSON parse
          const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
          for (let i = 0; i < json.length; i++) {
            const row = json[i];
            parsedAssets.push({
              id: `imported-${Date.now()}-${i}`,
              symbol: row.Symbol || row.symbol || 'UNK',
              name: row.Name || row.name || row.Investimento || 'Unknown Asset',
              type: row.Type || row.type || row["Estratégia"] || 'Stock',
              allocation: parseFloat(String(row["% de Alocação"] || 0)),
              targetInvestment: parseFloat(String(row["€ a investir"] || 0)),
              targetInvestmentPerPerson: parseFloat(String(row["€ a investir cada"] || 0)),
              quantity: Number(row.Quantity || row.quantity || 0),
              avgPrice: Number(row['Avg Price'] || row.avgPrice || 0),
              currentPrice: Number(row['Current Price'] || row.currentPrice || 0),
              currency: row.Currency || row.currency || 'USD'
            });
          }
        }

        resolve(parsedAssets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};