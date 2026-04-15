import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { getFinanceAnalytics } from '../../../services/orderService';
import { createExpense, getAllExpenses, updateExpense, deleteExpense } from '../../../services/expenseService';
import { createPurchase } from '../../../services/purchaseService';
import { useProduct } from '../../../contexts/ProductContext';
import {
  MdTrendingUp,
  MdTrendingDown,
  MdAttachMoney,
  MdReceipt,
  MdShoppingCart,
  MdLocalShipping,
  MdDownload,
  MdAdd,
  MdClose,
  MdRefresh,
  MdSwapHoriz,
  MdAssignment
} from 'react-icons/md';

const FinanceAnalytics = () => {
  const { products } = useProduct();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    paymentMethod: 'vodafone_cash',
    notes: ''
  });

  // Purchase Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    supplier: '',
    paymentMethod: 'cash',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Analytics ─────────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(() => {
    let startIso = '';
    let endIso = '';
    if (startDate) startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
    if (endDate) endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();

    setLoading(true);
    Promise.all([
      getFinanceAnalytics(startIso, endIso),
      getAllExpenses(startDate || endDate ? { startDate: startIso, endDate: endIso } : {})
    ])
      .then(([analyticsRes, expensesRes]) => {
        if (analyticsRes.success) {
          setAnalyticsData(analyticsRes.data);
        }
        if (expensesRes.success) {
          setExpenses(expensesRes.data || []);
        }
      })
      .catch(err => console.error("Failed to load data: ", err))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Expense Handlers ────────────────────────────────────────────────────────

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description || '',
      amount: (expense.amount || 0).toString(),
      category: expense.category || '',
      paymentMethod: expense.paymentMethod || 'vodafone_cash',
      notes: (expense.notes || '').toString()
    });
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      const expenseId = expense.id || expense._id;
      await deleteExpense(expenseId);
      fetchAnalytics();
      alert("Expense deleted successfully!");
    } catch (error) {
      console.error("Failed to delete expense:", error);
      alert(`Failed to delete expense: ${error.message}`);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let payload;
      
      if (editingExpense) {
        payload = {
          description: String(expenseForm.description || '').trim(),
          amount: Number(expenseForm.amount) || 0
        };
        if (expenseForm.category !== editingExpense.category) {
          payload.category = String(expenseForm.category || '').trim();
        }
        if (expenseForm.paymentMethod !== editingExpense.paymentMethod) {
          payload.paymentMethod = String(expenseForm.paymentMethod || 'vodafone_cash').trim();
        }
        if (expenseForm.notes && (!editingExpense.notes || expenseForm.notes !== editingExpense.notes)) {
          payload.notes = String(expenseForm.notes).trim();
        }
      } else {
        payload = {
          description: String(expenseForm.description || '').trim(),
          category: String(expenseForm.category || '').trim(),
          paymentMethod: String(expenseForm.paymentMethod || 'vodafone_cash').trim(),
          amount: Number(expenseForm.amount) || 0
        };
        if (expenseForm.notes && String(expenseForm.notes).trim() !== '') {
          payload.notes = String(expenseForm.notes).trim();
        }
      }

      // Remove any unexpected fields
      const allowedFields = ['description', 'category', 'paymentMethod', 'amount', 'notes'];
      Object.keys(payload).forEach(key => {
        if (!allowedFields.includes(key)) delete payload[key];
      });
      delete payload.id;
      delete payload._id;

      if (editingExpense) {
        const expenseId = editingExpense.id || editingExpense._id;
        try {
          await updateExpense(expenseId, payload);
          alert("Expense updated successfully!");
        } catch (updateError) {
          const minimalPayload = { description: payload.description };
          if (payload.amount !== editingExpense.amount) minimalPayload.amount = payload.amount;
          await updateExpense(expenseId, minimalPayload);
          alert("Expense updated successfully!");
        }
      } else {
        await createExpense(payload);
        alert("Expense created successfully!");
      }
      
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setExpenseForm({ description: '', amount: '', category: '', paymentMethod: 'vodafone_cash', notes: '' });
      fetchAnalytics();
    } catch (error) {
      console.error("Failed to save expense:", error);
      alert(`Failed to save expense: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Purchase Handler ────────────────────────────────────────────────────────

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplier.trim()) {
      alert("Supplier is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        supplier: purchaseForm.supplier,
        paymentMethod: purchaseForm.paymentMethod
      };
      if (purchaseForm.notes && purchaseForm.notes.trim() !== '') {
        payload.notes = purchaseForm.notes.trim();
      }
      await createPurchase(payload);
      setIsPurchaseModalOpen(false);
      setPurchaseForm({ supplier: '', paymentMethod: 'cash', notes: '' });
      fetchAnalytics();
    } catch (error) {
      console.error("Failed to create purchase:", error);
      alert(error.message || "Failed to create purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  // Calculate total expenses from the expenses list as a fallback
  const computedTotalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  }, [expenses]);

  const handleExport = () => {
    const d = analyticsData || {};
    const csvData = [
      ['Metric', 'Value'],
      ['--- Sales Analytics ---', ''],
      ['Total Sales', (d.totalSales || 0).toFixed(2)],
      ['Returned Sales', (d.returnedSalesAmount || 0).toFixed(2)],
      ['Exchanged Sales', (d.exchangedSalesAmount || 0).toFixed(2)],
      ['Net Sales', (d.netSales || 0).toFixed(2)],
      ['Sales Efficiency %', d.totalSales > 0 ? ((d.netSales / d.totalSales) * 100).toFixed(1) : '0.0'],
      ['Return Rate %', d.totalSales > 0 ? ((d.returnedSalesAmount / d.totalSales) * 100).toFixed(1) : '0.0'],
      ['Exchange Rate %', d.totalSales > 0 ? ((d.exchangedSalesAmount / d.totalSales) * 100).toFixed(1) : '0.0'],
      ['--- Profit Analytics ---', ''],
      ['Delivered Orders Profit', (d.deliveredOrdersProfit || 0).toFixed(2)],
      ['Total Expenses', (d.totalExpenses || computedTotalExpenses || 0).toFixed(2)],
      ['Net Profit', (d.finalProfit || 0).toFixed(2)],
      ['Delivered Orders Count', d.deliveredOrdersCount || 0],
    ];
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  // Sales data
  const totalSales = analyticsData?.totalSales ?? 0;
  const returnedSalesAmount = analyticsData?.returnedSalesAmount ?? 0;
  const exchangedSalesAmount = analyticsData?.exchangedSalesAmount ?? 0;
  const netSales = analyticsData?.netSales ?? 0;

  // Sales computed metrics
  const salesReduction = returnedSalesAmount + exchangedSalesAmount;
  const salesEfficiency = totalSales > 0 ? (netSales / totalSales * 100) : 0;
  const returnRate = totalSales > 0 ? (returnedSalesAmount / totalSales * 100) : 0;
  const exchangeRate = totalSales > 0 ? (exchangedSalesAmount / totalSales * 100) : 0;

  // Profit data
  const deliveredOrdersProfit = analyticsData?.deliveredOrdersProfit ?? 0;
  const totalExpenses = analyticsData?.totalExpenses ?? computedTotalExpenses;
  const finalProfit = analyticsData?.finalProfit ?? (deliveredOrdersProfit - totalExpenses);
  const deliveredOrdersCount = analyticsData?.deliveredOrdersCount ?? 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Finance & Analytics</h1>
          <p className="text-gray-500 text-sm">Comprehensive sales & profit overview with returns tracking</p>
        </div>
        <div className="flex space-x-3 items-center flex-wrap gap-y-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 shadow-sm h-10 w-fit">
            <span className="text-gray-500 text-sm font-medium">From</span>
            <input
              type="date"
              className="py-1 text-sm text-gray-700 bg-transparent focus:outline-none focus:ring-0 cursor-pointer"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 text-sm font-medium">To</span>
            <input
              type="date"
              className="py-1 text-sm text-gray-700 bg-transparent focus:outline-none focus:ring-0 cursor-pointer"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="ml-1 text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                title="Clear Dates (Show All Time)"
              >
                <MdClose className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={fetchAnalytics}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center text-sm"
          >
            <MdRefresh className="mr-1 h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
          >
            <MdAdd className="mr-1" /> Expense
          </button>

          <button
            onClick={handleExport}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm"
          >
            <MdDownload className="mr-1" /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── SALES ANALYTICS SECTION ─────────────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600">
                  <MdAssignment className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Sales Analytics</h2>
                  <p className="text-xs text-gray-400">Revenue tracking with returns & exchanges impact</p>
                </div>
              </div>
              {totalSales > 0 && (
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    salesEfficiency >= 90
                      ? 'bg-emerald-100 text-emerald-700'
                      : salesEfficiency >= 70
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                  title="Sales Efficiency: Net Sales / Total Sales"
                >
                  {salesEfficiency.toFixed(1)}% Efficiency
                </span>
              )}
            </div>

            {/* Sales Cards 2x2 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

              {/* Card 1 – Total Sales */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <MdShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ALL ORDERS</span>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Sales</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(totalSales)}
                </p>
                <p className="text-xs text-gray-400 mt-2" title="Sum of itemsPrice from all orders (excluding cancelled)">
                  All order revenue excluding cancelled
                </p>
              </div>

              {/* Card 2 – Returned Sales */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-orange-100 group-hover:bg-orange-200 transition-colors">
                    <MdTrendingDown className="h-6 w-6 text-orange-600" />
                  </div>
                  {totalSales > 0 && (
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      {returnRate.toFixed(1)}% of sales
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Returned Sales</p>
                <p className="text-3xl font-bold text-orange-600">
                  {formatCurrency(returnedSalesAmount)}
                </p>
                <p className="text-xs text-gray-400 mt-2" title="Total itemsPrice from returned orders">
                  Revenue lost to returns
                </p>
              </div>

              {/* Card 3 – Exchanged Sales */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-200 transition-colors">
                    <MdSwapHoriz className="h-6 w-6 text-amber-600" />
                  </div>
                  {totalSales > 0 && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {exchangeRate.toFixed(1)}% of sales
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Exchanged Sales</p>
                <p className="text-3xl font-bold text-amber-600">
                  {formatCurrency(exchangedSalesAmount)}
                </p>
                <p className="text-xs text-gray-400 mt-2" title="Total itemsPrice from exchanged orders">
                  Revenue impacted by exchanges
                </p>
              </div>

              {/* Card 4 – Net Sales */}
              <div className={`rounded-2xl shadow-lg p-6 border-2 hover:shadow-xl transition-all duration-200 group ${
                netSales >= 0
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                  : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${netSales >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    <MdTrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    netSales >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {netSales >= 0 ? 'POSITIVE' : 'NEGATIVE'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Net Sales</p>
                <p className={`text-3xl font-extrabold ${netSales >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatCurrency(netSales)}
                </p>
                <p className="text-xs text-gray-400 mt-2" title="Total Sales − Returns − Exchanges">
                  Total Sales − Returns − Exchanges
                </p>
              </div>
            </div>

            {/* Sales Progress Bar: Total Sales → Net Sales */}
            {totalSales > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Sales Retention</p>
                  <p className="text-sm font-bold text-gray-900">{salesEfficiency.toFixed(1)}%</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      salesEfficiency >= 90
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        : salesEfficiency >= 70
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                          : 'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, salesEfficiency))}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>Deductions: {formatCurrency(salesReduction)}</span>
                  <span>Net: {formatCurrency(netSales)} of {formatCurrency(totalSales)}</span>
                </div>
              </div>
            )}
          </div>


          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── PROFIT ANALYTICS SECTION ────────────────────────────────── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-emerald-600">
                <MdAttachMoney className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Profit Analytics</h2>
                <p className="text-xs text-gray-400">Profit calculations based on delivered orders</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Card 1 – Delivered Orders Profit */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${deliveredOrdersProfit >= 0 ? 'bg-emerald-100 group-hover:bg-emerald-200' : 'bg-red-100 group-hover:bg-red-200'} transition-colors`}>
                    <MdTrendingUp className={`h-6 w-6 ${deliveredOrdersProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Delivered Orders Profit</p>
                <p className={`text-3xl font-bold ${deliveredOrdersProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(deliveredOrdersProfit)}
                </p>
                <p className="text-xs text-gray-400 mt-2">Selling price − buying price of delivered orders</p>
              </div>

              {/* Card 2 – Total Expenses */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-orange-100 group-hover:bg-orange-200 transition-colors">
                    <MdReceipt className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-orange-600">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-xs text-gray-400 mt-2">Sum of all recorded expenses</p>
              </div>

              {/* Card 3 – Net Profit (highlighted, spans full width) */}
              <div className={`rounded-2xl shadow-lg p-6 border-2 hover:shadow-xl transition-all duration-200 md:col-span-2
                ${finalProfit >= 0
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                  : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${finalProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    <MdAttachMoney className="h-7 w-7 text-white" />
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    finalProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {finalProfit >= 0 ? 'PROFIT' : 'LOSS'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Net Profit</p>
                <p className={`text-4xl font-extrabold ${finalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatCurrency(finalProfit)}
                </p>
                <p className="text-xs text-gray-400 mt-2">Delivered orders profit − total expenses</p>
              </div>

              {/* Card 4 – Delivered Orders Count */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Delivered Orders</p>
                    <p className="text-3xl font-bold text-blue-600">{deliveredOrdersCount}</p>
                    <p className="text-xs text-gray-400 mt-2">Total orders with delivered status</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-100">
                    <MdLocalShipping className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Expenses Table ──────────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Expenses</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <tr key={expense._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {(expense.category || '').replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {(expense.paymentMethod || '').replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={expense.notes}>
                          {expense.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                        No expenses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Purchase Modal ────────────────────────────────────────────── */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Stock Purchase</h2>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <MdClose className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreatePurchase} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    value={purchaseForm.supplier}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                    placeholder="e.g., Factory A, Wholesaler X"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    value={purchaseForm.paymentMethod}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="vodafone_cash">Vodafone Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  rows="2"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  placeholder="Optional notes regarding this purchase..."
                ></textarea>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The system will automatically calculate purchases from all products with stock greater than 0.
                </p>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Submit Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Expense Modal ─────────────────────────────────────────────── */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => {
                setIsExpenseModalOpen(false);
                setEditingExpense(null);
                setExpenseForm({ description: '', amount: '', category: '', paymentMethod: 'vodafone_cash', notes: '' });
              }} className="text-gray-400 hover:text-gray-600">
                <MdClose className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g., Office Supplies"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (EGP) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="">Select a category</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="marketing">Marketing</option>
                  <option value="salaries">Salaries</option>
                  <option value="supplies">Supplies</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="shipping">Shipping</option>
                  <option value="ads">Ads</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="other_operating">Other Operating</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                >
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  rows="3"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Additional details..."
                ></textarea>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceAnalytics;
