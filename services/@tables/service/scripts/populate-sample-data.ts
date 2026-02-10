/**
 * Script to populate sample data for investment portfolio tables
 * Run with: tsx scripts/populate-sample-data.ts
 */

import { randomUUID } from "node:crypto";
import { memoryStore } from "../src/store/memory.js";

// Table IDs
const TABLES = {
  assets: "bab8f9c3-7e2d-4944-837b-1e71d4e00a05",
  portfolioHoldings: "99bc94e7-c066-4060-80d5-33d52d38738b",
  transactions: "fd440205-a582-41b0-9691-3928bd1f3088",
  dividendsIncome: "f0a1979c-f940-405e-974e-7849f4ba8402",
  performanceTracking: "b9184054-4a81-4993-8d80-5a491bc3ac77",
  watchlist: "5a2e3985-a0f3-46a9-92fa-4201bfd82f49",
  investmentGoals: "120cbe9c-d46d-479d-a9e1-1ecf5e2cacef",
};

async function populateAssets() {
  console.log("Populating Assets table...");
  const table = memoryStore.getTable(TABLES.assets);
  if (!table) {
    throw new Error("Assets table not found");
  }

  // Get column IDs
  const columns = Array.from(table.columns.values());
  const getColumnId = (name: string) =>
    columns.find((c) => c.name === name)?.id || "";

  const sampleAssets = [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      type: "Stock",
      exchange: "NASDAQ",
      sector: "Technology",
      currency: "USD",
      notes: "Technology leader in consumer electronics",
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      type: "Stock",
      exchange: "NASDAQ",
      sector: "Technology",
      currency: "USD",
      notes: "Cloud computing and software giant",
    },
    {
      symbol: "VTI",
      name: "Vanguard Total Stock Market ETF",
      type: "ETF",
      exchange: "NYSE",
      sector: "Diversified",
      currency: "USD",
      notes: "Total US stock market index fund",
    },
    {
      symbol: "BTC-USD",
      name: "Bitcoin",
      type: "Cryptocurrency",
      exchange: "Crypto",
      sector: "Digital Assets",
      currency: "USD",
      notes: "Leading cryptocurrency",
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      type: "Stock",
      exchange: "NASDAQ",
      sector: "Consumer Cyclical",
      currency: "USD",
      notes: "E-commerce and cloud services leader",
    },
  ];

  for (const asset of sampleAssets) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId: TABLES.assets,
      rowId,
      data: {
        [getColumnId("Symbol")]: asset.symbol,
        [getColumnId("Name")]: asset.name,
        [getColumnId("Asset Type")]: asset.type,
        [getColumnId("Exchange")]: asset.exchange,
        [getColumnId("Sector/Category")]: asset.sector,
        [getColumnId("Currency")]: asset.currency,
        [getColumnId("Notes")]: asset.notes,
      },
    });
  }

  console.log(`Added ${sampleAssets.length} assets`);
}

async function populatePortfolioHoldings() {
  console.log("Populating Portfolio Holdings table...");
  const table = memoryStore.getTable(TABLES.portfolioHoldings);
  if (!table) {
    throw new Error("Portfolio Holdings table not found");
  }

  const columns = Array.from(table.columns.values());
  const getColumnId = (name: string) =>
    columns.find((c) => c.name === name)?.id || "";

  const sampleHoldings = [
    {
      account: "Brokerage Account",
      asset: "AAPL",
      quantity: 50,
      avgCostBasis: 145.5,
      currentPrice: 182.63,
      currentValue: 9131.5,
      unrealizedGainLoss: 1856.5,
      unrealizedGainLossPct: 25.5,
      lastUpdated: "2026-02-10",
    },
    {
      account: "Roth IRA",
      asset: "VTI",
      quantity: 100,
      avgCostBasis: 210.25,
      currentPrice: 234.8,
      currentValue: 23480,
      unrealizedGainLoss: 2455,
      unrealizedGainLossPct: 11.7,
      lastUpdated: "2026-02-10",
    },
    {
      account: "Brokerage Account",
      asset: "MSFT",
      quantity: 25,
      avgCostBasis: 350.0,
      currentPrice: 420.15,
      currentValue: 10503.75,
      unrealizedGainLoss: 1753.75,
      unrealizedGainLossPct: 20.0,
      lastUpdated: "2026-02-10",
    },
    {
      account: "Crypto Wallet",
      asset: "BTC-USD",
      quantity: 0.25,
      avgCostBasis: 42000,
      currentPrice: 95000,
      currentValue: 23750,
      unrealizedGainLoss: 13250,
      unrealizedGainLossPct: 126.2,
      lastUpdated: "2026-02-10",
    },
    {
      account: "401k",
      asset: "AMZN",
      quantity: 15,
      avgCostBasis: 165.8,
      currentPrice: 186.3,
      currentValue: 2794.5,
      unrealizedGainLoss: 307.5,
      unrealizedGainLossPct: 12.4,
      lastUpdated: "2026-02-10",
    },
  ];

  for (const holding of sampleHoldings) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId: TABLES.portfolioHoldings,
      rowId,
      data: {
        [getColumnId("Account")]: holding.account,
        [getColumnId("Asset")]: holding.asset,
        [getColumnId("Quantity")]: holding.quantity,
        [getColumnId("Avg Cost Basis")]: holding.avgCostBasis,
        [getColumnId("Current Price")]: holding.currentPrice,
        [getColumnId("Current Value")]: holding.currentValue,
        [getColumnId("Unrealized Gain/Loss")]: holding.unrealizedGainLoss,
        [getColumnId("Unrealized Gain/Loss %")]: holding.unrealizedGainLossPct,
        [getColumnId("Last Updated")]: holding.lastUpdated,
      },
    });
  }

  console.log(`Added ${sampleHoldings.length} holdings`);
}

async function populateTransactions() {
  console.log("Populating Transactions table...");
  const table = memoryStore.getTable(TABLES.transactions);
  if (!table) {
    throw new Error("Transactions table not found");
  }

  const columns = Array.from(table.columns.values());
  const getColumnId = (name: string) =>
    columns.find((c) => c.name === name)?.id || "";

  const sampleTransactions = [
    {
      date: "2026-01-15",
      account: "Brokerage Account",
      asset: "AAPL",
      type: "Buy",
      quantity: 50,
      price: 145.5,
      totalAmount: 7275,
      fees: 0,
      notes: "Initial position in Apple",
    },
    {
      date: "2026-01-20",
      account: "Roth IRA",
      asset: "VTI",
      type: "Buy",
      quantity: 100,
      price: 210.25,
      totalAmount: 21025,
      fees: 0,
      notes: "Annual IRA contribution",
    },
    {
      date: "2026-01-25",
      account: "Crypto Wallet",
      asset: "BTC-USD",
      type: "Buy",
      quantity: 0.25,
      price: 42000,
      totalAmount: 10500,
      fees: 52.5,
      notes: "Bitcoin accumulation",
    },
    {
      date: "2026-02-01",
      account: "Brokerage Account",
      asset: "MSFT",
      type: "Buy",
      quantity: 25,
      price: 350.0,
      totalAmount: 8750,
      fees: 0,
      notes: "Adding Microsoft position",
    },
    {
      date: "2026-02-05",
      account: "Brokerage Account",
      asset: "AAPL",
      type: "Sell",
      quantity: 10,
      price: 180.0,
      totalAmount: 1800,
      fees: 0,
      notes: "Partial profit taking",
    },
  ];

  for (const tx of sampleTransactions) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId: TABLES.transactions,
      rowId,
      data: {
        [getColumnId("Date")]: tx.date,
        [getColumnId("Account")]: tx.account,
        [getColumnId("Asset")]: tx.asset,
        [getColumnId("Type")]: tx.type,
        [getColumnId("Quantity")]: tx.quantity,
        [getColumnId("Price")]: tx.price,
        [getColumnId("Total Amount")]: tx.totalAmount,
        [getColumnId("Fees")]: tx.fees,
        [getColumnId("Notes")]: tx.notes,
      },
    });
  }

  console.log(`Added ${sampleTransactions.length} transactions`);
}

async function populateDividendsIncome() {
  console.log("Populating Dividends & Income table...");
  const table = memoryStore.getTable(TABLES.dividendsIncome);
  if (!table) {
    throw new Error("Dividends & Income table not found");
  }

  const columns = Array.from(table.columns.values());
  const getColumnId = (name: string) =>
    columns.find((c) => c.name === name)?.id || "";

  const sampleDividends = [
    {
      date: "2026-01-15",
      account: "Brokerage Account",
      asset: "AAPL",
      type: "Dividend",
      amount: 24.0,
      quantity: 50,
      perShare: 0.48,
      reinvested: false,
    },
    {
      date: "2026-01-30",
      account: "Roth IRA",
      asset: "VTI",
      type: "Dividend",
      amount: 85.0,
      quantity: 100,
      perShare: 0.85,
      reinvested: true,
    },
    {
      date: "2026-02-01",
      account: "Brokerage Account",
      asset: "MSFT",
      type: "Dividend",
      amount: 19.5,
      quantity: 25,
      perShare: 0.78,
      reinvested: false,
    },
    {
      date: "2026-02-05",
      account: "Brokerage Account",
      asset: "AAPL",
      type: "Interest",
      amount: 12.35,
      quantity: null,
      perShare: null,
      reinvested: false,
    },
    {
      date: "2026-02-08",
      account: "401k",
      asset: "AMZN",
      type: "Capital Gain",
      amount: 45.2,
      quantity: 15,
      perShare: 3.01,
      reinvested: true,
    },
  ];

  for (const dividend of sampleDividends) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId: TABLES.dividendsIncome,
      rowId,
      data: {
        [getColumnId("Date")]: dividend.date,
        [getColumnId("Account")]: dividend.account,
        [getColumnId("Asset")]: dividend.asset,
        [getColumnId("Type")]: dividend.type,
        [getColumnId("Amount")]: dividend.amount,
        [getColumnId("Quantity Held")]: dividend.quantity,
        [getColumnId("Per Share")]: dividend.perShare,
        [getColumnId("Reinvested")]: dividend.reinvested,
      },
    });
  }

  console.log(`Added ${sampleDividends.length} dividend/income records`);
}

async function populatePerformanceTracking() {
  console.log("Populating Performance Tracking table...");
  const table = memoryStore.getTable(TABLES.performanceTracking);
  if (!table) {
    throw new Error("Performance Tracking table not found");
  }

  const columns = Array.from(table.columns.values());
  const getColumnId = (name: string) =>
    columns.find((c) => c.name === name)?.id || "";

  const samplePerformance = [
    {
      date: "2026-01-31",
      account: "Brokerage Account",
      startingBalance: 0,
      endingBalance: 16025,
      netDeposits: 16025,
      netGainLoss: 0,
      returnPct: 0,
      notes: "Account opened",
    },
    {
      date: "2026-02-10",
      account: "Brokerage Account",
      startingBalance: 16025,
      endingBalance: 19635.25,
      netDeposits: 0,
      netGainLoss: 3610.25,
      returnPct: 22.5,
      notes: "Strong market performance",
    },
    {
      date: "2026-01-31",
      account: "Roth IRA",
      startingBalance: 0,
      endingBalance: 21025,
      netDeposits: 21025,
      netGainLoss: 0,
      returnPct: 0,
      notes: "Annual contribution",
    },
    {
      date: "2026-02-10",
      account: "Roth IRA",
      startingBalance: 21025,
      endingBalance: 23480,
      netDeposits: 0,
      netGainLoss: 2455,
      returnPct: 11.7,
      notes: "Steady growth",
    },
    {
      date: "2026-02-10",
      account: "Crypto Wallet",
      startingBalance: 10552.5,
      endingBalance: 23750,
      netDeposits: 0,
      netGainLoss: 13197.5,
      returnPct: 125.1,
      notes: "Bitcoin rally",
    },
  ];

  for (const perf of samplePerformance) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId: TABLES.performanceTracking,
      rowId,
      data: {
        [getColumnId("Date")]: perf.date,
        [getColumnId("Account")]: perf.account,
        [getColumnId("Starting Balance")]: perf.startingBalance,
        [getColumnId("Ending Balance")]: perf.endingBalance,
        [getColumnId("Net Deposits/Withdrawals")]: perf.netDeposits,
        [getColumnId("Net Gain/Loss")]: perf.netGainLoss,
        [getColumnId("Return %")]: perf.returnPct,
        [getColumnId("Notes")]: perf.notes,
      },
    });
  }

  console.log(`Added ${samplePerformance.length} performance records`);
}

async function populateWatchlist() {
  console.log("Populating Watchlist table...");
  const table = memoryStore.getTable(TABLES.watchlist);
  if (!table) {
    throw new Error("Watchlist table not found");
  }

  const columns = Array.from(table.columns.values());
  const getColumnId = (name: string) =>
    columns.find((c) => c.name === name)?.id || "";

  const sampleWatchlist = [
    {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      type: "Stock",
      targetPrice: 800.0,
      currentPrice: 875.25,
      notes: "Waiting for pullback below $800",
      addedDate: "2026-01-10",
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      type: "Stock",
      targetPrice: 145.0,
      currentPrice: 152.3,
      notes: "Strong AI positioning, buy on dip",
      addedDate: "2026-01-15",
    },
    {
      symbol: "SCHD",
      name: "Schwab U.S. Dividend Equity ETF",
      type: "ETF",
      targetPrice: 28.0,
      currentPrice: 29.45,
      notes: "High dividend yield ETF for income",
      addedDate: "2026-01-20",
    },
    {
      symbol: "ETH-USD",
      name: "Ethereum",
      type: "Cryptocurrency",
      targetPrice: 3000,
      currentPrice: 3450,
      notes: "Accumulate on dips below $3000",
      addedDate: "2026-02-01",
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      type: "Stock",
      targetPrice: 220.0,
      currentPrice: 195.8,
      notes: "High volatility, small position on target",
      addedDate: "2026-02-05",
    },
  ];

  for (const item of sampleWatchlist) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId: TABLES.watchlist,
      rowId,
      data: {
        [getColumnId("Symbol")]: item.symbol,
        [getColumnId("Name")]: item.name,
        [getColumnId("Asset Type")]: item.type,
        [getColumnId("Target Price")]: item.targetPrice,
        [getColumnId("Current Price")]: item.currentPrice,
        [getColumnId("Notes")]: item.notes,
        [getColumnId("Date Added")]: item.addedDate,
      },
    });
  }

  console.log(`Added ${sampleWatchlist.length} watchlist items`);
}

async function populateInvestmentGoals() {
  console.log("Populating Investment Goals table...");
  const table = memoryStore.getTable(TABLES.investmentGoals);
  if (!table) {
    throw new Error("Investment Goals table not found");
  }

  const columns = Array.from(table.columns.values());
  const getColumnId = (name: string) =>
    columns.find((c) => c.name === name)?.id || "";

  const sampleGoals = [
    {
      goalName: "Retirement Fund",
      targetAmount: 1000000,
      currentAmount: 325000,
      targetDate: "2046-12-31",
      monthlyContribution: 2500,
      status: "On Track",
      notes: "Diversified portfolio across 401k and IRAs",
    },
    {
      goalName: "House Down Payment",
      targetAmount: 150000,
      currentAmount: 42000,
      targetDate: "2028-06-30",
      monthlyContribution: 4000,
      status: "On Track",
      notes: "Saving in high-yield savings and short-term bonds",
    },
    {
      goalName: "Emergency Fund",
      targetAmount: 50000,
      currentAmount: 50000,
      targetDate: "2026-01-01",
      monthlyContribution: 0,
      status: "Achieved",
      notes: "6 months expenses fully funded",
    },
    {
      goalName: "Kids College Fund",
      targetAmount: 200000,
      currentAmount: 18000,
      targetDate: "2038-09-01",
      monthlyContribution: 1200,
      status: "On Track",
      notes: "529 plan with age-based portfolio",
    },
    {
      goalName: "Vacation Fund",
      targetAmount: 15000,
      currentAmount: 8500,
      targetDate: "2026-07-01",
      monthlyContribution: 1500,
      status: "On Track",
      notes: "European trip planned for summer",
    },
  ];

  for (const goal of sampleGoals) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId: TABLES.investmentGoals,
      rowId,
      data: {
        [getColumnId("Goal Name")]: goal.goalName,
        [getColumnId("Target Amount")]: goal.targetAmount,
        [getColumnId("Current Amount")]: goal.currentAmount,
        [getColumnId("Target Date")]: goal.targetDate,
        [getColumnId("Monthly Contribution")]: goal.monthlyContribution,
        [getColumnId("Status")]: goal.status,
        [getColumnId("Notes")]: goal.notes,
      },
    });
  }

  console.log(`Added ${sampleGoals.length} investment goals`);
}

async function main() {
  console.log("Starting sample data population...\n");

  try {
    await populateAssets();
    await populatePortfolioHoldings();
    await populateTransactions();
    await populateDividendsIncome();
    await populatePerformanceTracking();
    await populateWatchlist();
    await populateInvestmentGoals();

    console.log("\n✅ Sample data population complete!");
  } catch (error) {
    console.error("❌ Error populating sample data:", error);
    process.exit(1);
  }
}

main();
