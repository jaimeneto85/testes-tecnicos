import {Request, Response} from 'express';
import { validateRange } from '../validations/stocks';
import { StockHistory, StockPricing, StockQuote } from '../@types/stock';
import { api } from '../api';

function translateStockName(stock_name: String) : String {
  const stockNameRaw = stock_name.split('.');
  return stockNameRaw[0];
}
export const StockHistoryController = async (req: Request, res: Response) => {
  const stock_name = translateStockName(req.params.stock_name);
  const {from, to} = req.query;
  
  const range = validateRange(from as string, to as string);
  let stockHistoryResult : StockHistory = {} as StockHistory;
  try {
    const stockHistoryConsult = await api.get(`quote/${stock_name}/?range=${range}&modules=balanceSheetHistory&fundamental=true&interval=1d`);
    const {results} = stockHistoryConsult.data;
    const {longName, historicalDataPrice} = results[0];
    
    const stockHistoryPricing : StockPricing[] =  historicalDataPrice.map((historicalPrice: any) => {
      const timestamp = historicalPrice.date;
      const date = new Date(timestamp * 1000);
  
      return {
        opening: historicalPrice.open,
        low: historicalPrice.low,
        high: historicalPrice.high,
        closing: historicalPrice.close,
        pricedAt: date.toISOString(),
      }
    });
    stockHistoryResult = {
      name: longName,
      prices: stockHistoryPricing,
    }
    res.status(200).json(stockHistoryResult);
  } catch (error: any) {
    let errorMessage = '';
    let errorStatus = 400;
    if(error?.response?.data?.message) {
      errorMessage = error.response.data.message;
      errorStatus = error.response.status;
    } else {
      errorMessage = 'Houve um erro ao consultar o historico da ação. Por favor, tente novamente mais tarde.'
    }
    res.status(errorStatus).json({errors: [errorMessage]});
  }
}

export const StockQuoteController = async (req: Request, res: Response) => {
  const stock_name = translateStockName(req.params.stock_name);
  let stockQuoteResponse : StockQuote = {} as StockQuote;
  try {
    const stockQuoteConsult : any = await api.get(`quote/${stock_name}/`);
    const {results, requestedAt} = stockQuoteConsult.data;
    const {longName, regularMarketPrice, regularMarketTime} = results[0];
    
    stockQuoteResponse = {
      name: longName,
      lastPrice: regularMarketPrice,
      pricedAt: regularMarketTime,
    };

    res.status(200).json(stockQuoteResponse);
  } catch (error: any) {
    let errorMessage = '';
    let errorStatus = 400;
    if(error?.response?.data?.message) {
      errorMessage = error.response.data.message;
      errorStatus = error.response.status;
    } else {
      errorMessage = 'Houve um erro ao consultar a cotação da ação. Por favor, tente novamente mais tarde.'
    }
    res.status(errorStatus).json({errors: [{msg: errorMessage}]});
  }
  // const stockQuote : StockQuote = {} as StockQuote;  
}

export const StockCompareController = async (req: Request, res: Response) => {
  const stock_name = translateStockName(req.params.stock_name);
  const {stocks} = req.body;
  const stocksString = [stock_name, ...stocks].map((stock: string) => (translateStockName(stock))).join(',');
  let stockCompareResponse : StockQuote[] = [];
  try {
    const stockCompareConsult : any = await api.get(`quote/${stocksString}/`);
    const {results} = stockCompareConsult.data;
    results.forEach((stock: any) => {
      if (stock.error){
        throw new Error(stock.message);
      }

      if (stock.regularMarketPrice === null) {
        const erro = {
          response: {
            status: 404,
            data: {
              message: 'erro',
            },
          },
        };

        throw erro;
      }

      stockCompareResponse.push({
        name: stock.longName,
        lastPrice: stock.regularMarketPrice,
        pricedAt: stock.regularMarketTime,
      });
    });

    res.status(201).json({lastPrices: stockCompareResponse});

  } catch (error: any) {
    let errorMessage : String  = '';
    let errorStatus = 400;
    if(error?.response?.data?.message) {
      errorMessage = error.response.data.message;
      errorStatus = error.response.status;
    } else if (error.toString().includes('encontramos')) {
      errorMessage = error.toString();
    } else {
      errorMessage = 'Houve um erro ao consultar a cotação da ação. Por favor, tente novamente mais tarde.'
    }
    res.status(errorStatus).json({errors: [{msg: errorMessage}]});
  }
}