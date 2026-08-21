import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  getFinanceOverview,
  updateFinanceSettings,
  getInventoryPurchases,
  createInventoryPurchase,
  updateInventoryPurchase,
  deleteInventoryPurchase,
} from '../../../services/financeService';
import { createExpense, getAllExpenses, updateExpense, deleteExpense } from '../../../services/expenseService';
import {
  MdAttachMoney,
  MdDownload,
  MdAdd,
  MdClose,
  MdRefresh,
  MdAccountBalance,
  MdPayments,
  MdInventory,
  MdReceipt,
} from 'react-icons/md';

const FinanceAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [financeSettings, setFinanceSettings] = useState(null);
  const [availableCashBreakdown, setAvailableCashBreakdown] = useState(null);
  const [capitalMoney, setCapitalMoney] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [inventoryPurchases, setInventoryPurchases] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({ totalAmount: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeTab, setActiveTab] = useState('purchases');
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const itemsPerPage = 10;

  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [capitalForm, setCapitalForm] = useState({ capitalMoney: 0 });
  const [cashBaselineForm, setCashBaselineForm] = useState({ cashBaseline: 0 });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    paymentMethod: 'vodafone_cash',
    notes: '',
  });

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({
    description: '',
    amount: '',
    supplier: '',
    paymentMethod: 'cash',
    date: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDateRangeIso = useCallback(() => {
    let startIso = '';
    let endIso = '';
    if (startDate) startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
    if (endDate) endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();
    return { startIso, endIso };
  }, [startDate, endDate]);

  const fetchData = useCallback(() => {
    const { startIso, endIso } = getDateRangeIso();
    const dateParams = {
      limit: 10000,
      ...(startDate || endDate ? { startDate: startIso, endDate: endIso } : {})
    };

    setLoading(true);
    Promise.all([
      getFinanceOverview(startIso, endIso),
      getAllExpenses(dateParams),
      getInventoryPurchases(startIso, endIso, purchasesPage),
    ])
      .then(([overviewRes, expensesRes, inventoryRes]) => {
        if (overviewRes.success) {
          const d = overviewRes.data;
          setAnalyticsData(d.analytics);
          setFinanceSettings(d.settings);
          setAvailableCashBreakdown(d.availableCash);
          setCapitalMoney(d.capitalMoney ?? d.settings?.capitalMoney ?? 0);
        }
        if (expensesRes.success) {
          setExpenses(expensesRes.data || []);
        }
        if (inventoryRes.success) {
          setInventoryPurchases(inventoryRes.data || []);
          setInventorySummary(inventoryRes.summary || { totalAmount: 0, count: 0 });
        }
      })
      .catch((err) => console.error('Failed to load finance data:', err))
      .finally(() => setLoading(false));
  }, [getDateRangeIso, startDate, endDate, purchasesPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData, startDate, endDate, purchasesPage]);

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description || '',
      amount: (expense.amount || 0).toString(),
      category: expense.category || '',
      paymentMethod: expense.paymentMethod || 'vodafone_cash',
      notes: (expense.notes || '').toString(),
    });
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      const expenseId = expense.id || expense._id;
      await deleteExpense(expenseId);
      fetchData();
      alert('Expense deleted successfully!');
    } catch (error) {
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
          amount: Number(expenseForm.amount) || 0,
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
          amount: Number(expenseForm.amount) || 0,
        };
        if (expenseForm.notes && String(expenseForm.notes).trim() !== '') {
          payload.notes = String(expenseForm.notes).trim();
        }
      }

      if (editingExpense) {
        const expenseId = editingExpense.id || editingExpense._id;
        await updateExpense(expenseId, payload);
        alert('Expense updated successfully!');
      } else {
        await createExpense(payload);
        alert('Expense created successfully!');
      }

      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setExpenseForm({ description: '', amount: '', category: '', paymentMethod: 'vodafone_cash', notes: '' });
      fetchData();
    } catch (error) {
      alert(`Failed to save expense: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCapital = async () => {
    setIsSubmitting(true);
    try {
      await updateFinanceSettings({ capitalMoney: Number(capitalForm.capitalMoney) });
      alert('Capital updated successfully!');
      setIsCapitalModalOpen(false);
      fetchData();
    } catch (error) {
      alert(`Failed to update capital: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCashBaseline = async () => {
    setIsSubmitting(true);
    try {
      await updateFinanceSettings({ cashBaseline: Number(cashBaselineForm.cashBaseline) });
      alert('Cash count saved. Delivered sales after now will be added automatically.');
      setIsCashModalOpen(false);
      fetchData();
    } catch (error) {
      alert(`Failed to save cash count: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCapitalModal = () => {
    setCapitalForm({ capitalMoney });
    setIsCapitalModalOpen(true);
  };

  const handleOpenCashModal = () => {
    setCashBaselineForm({
      cashBaseline: financeSettings?.cashBaseline ?? availableCashBreakdown?.cashBaseline ?? 0,
    });
    setIsCashModalOpen(true);
  };

  const increaseCapital = async (amount) => {
    try {
      await updateFinanceSettings({ capitalMoney: capitalMoney + amount });
      alert(`Capital increased by ${formatCurrency(amount)}!`);
      fetchData();
    } catch (error) {
      alert(`Failed to increase capital: ${error.message}`);
    }
  };

  const resetInventoryForm = () => {
    setInventoryForm({
      description: '',
      amount: '',
      supplier: '',
      paymentMethod: 'cash',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setEditingInventory(null);
  };

  const handleEditInventory = (item) => {
    setEditingInventory(item);
    setInventoryForm({
      description: item.description || '',
      amount: String(item.amount || ''),
      supplier: item.supplier || '',
      paymentMethod: item.paymentMethod || 'cash',
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
      notes: item.notes || '',
    });
    setIsInventoryModalOpen(true);
  };

  const handleDeleteInventory = async (item) => {
    if (!window.confirm('Delete this inventory purchase?')) return;
    try {
      await deleteInventoryPurchase(item._id || item.id);
      fetchData();
      alert('Inventory purchase deleted.');
    } catch (error) {
      alert(`Failed to delete: ${error.message}`);
    }
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    if (!inventoryForm.description.trim() || !inventoryForm.amount) {
      alert('Description and amount are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        description: inventoryForm.description.trim(),
        amount: Number(inventoryForm.amount),
        supplier: inventoryForm.supplier?.trim() || undefined,
        paymentMethod: inventoryForm.paymentMethod,
        notes: inventoryForm.notes?.trim() || undefined,
      };
      if (inventoryForm.date) {
        payload.date = new Date(inventoryForm.date).toISOString();
      }

      if (editingInventory) {
        await updateInventoryPurchase(editingInventory._id || editingInventory.id, payload);
        alert('Inventory purchase updated.');
      } else {
        await createInventoryPurchase(payload);
        alert('Inventory purchase recorded.');
      }

      setIsInventoryModalOpen(false);
      resetInventoryForm();
      fetchData();
    } catch (error) {
      alert(`Failed to save inventory purchase: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  const computedTotalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [expenses]
  );

  const handleExport = () => {
    const d = analyticsData || {};
    const cash = availableCashBreakdown || {};
    const csvData = [
      ['Metric', 'Value'],
      ['Available Cash', (cash.total || 0).toFixed(2)],
      ['Cash Baseline', (cash.cashBaseline || 0).toFixed(2)],
      ['Delivered Sales (after baseline)', (cash.deliveredSalesAfterBaseline || 0).toFixed(2)],
      ['Inventory Purchases', (cash.inventoryPurchases || 0).toFixed(2)],
      ['Expenses', (cash.expenses || 0).toFixed(2)],
      ['Capital (separate)', (capitalMoney || 0).toFixed(2)],
      ['Net Sales', (d.netSales || 0).toFixed(2)],
      ['Delivered Orders Profit', (d.deliveredOrdersProfit || 0).toFixed(2)],
      ['Net Profit', (d.finalProfit || 0).toFixed(2)],
    ];
    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const netSales = analyticsData?.netSales ?? 0;
  const deliveredOrdersProfit = analyticsData?.deliveredOrdersProfit ?? 0;
  const totalExpenses = analyticsData?.totalExpenses ?? computedTotalExpenses;
  const finalProfit = analyticsData?.finalProfit ?? deliveredOrdersProfit - totalExpenses;
  const deliveredOrdersCount = analyticsData?.deliveredOrdersCount ?? 0;
  const totalSoldItems = analyticsData?.totalSoldItems ?? analyticsData?.totalItemsSold ?? 0;

  const availableCashTotal = availableCashBreakdown?.total ?? 0;
  const cashBaseline = availableCashBreakdown?.cashBaseline ?? financeSettings?.cashBaseline ?? 0;
  const deliveredSalesAfterBaseline = availableCashBreakdown?.deliveredSalesAfterBaseline ?? 0;
  const inventoryTotal = availableCashBreakdown?.inventoryPurchases ?? inventorySummary.totalAmount ?? 0;
  const expensesInCash = availableCashBreakdown?.expenses ?? totalExpenses;

  const formatBaselineTime = (date) => {
    if (!date) return 'Not set — record your cash count to start tracking';
    return `Counted on ${new Date(date).toLocaleString()}`;
  };

  const totalPurchasesPages = Math.ceil(inventorySummary.count / 50) || 1;

  const startIndexExpenses = (expensesPage - 1) * itemsPerPage;
  const paginatedExpenses = expenses.slice(startIndexExpenses, startIndexExpenses + itemsPerPage);
  const totalExpensesPages = Math.ceil(expenses.length / itemsPerPage) || 1;

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Finance & Analytics</h1>
          <p className="text-gray-500 text-sm">Sales, profit, and live available cash</p>
        </div>
        <div className="flex space-x-3 items-center flex-wrap gap-y-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 shadow-sm h-10 w-fit">
            <span className="text-gray-500 text-sm font-medium">From</span>
            <input
              type="date"
              className="py-1 text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPurchasesPage(1); setExpensesPage(1); }}
            />
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 text-sm font-medium">To</span>
            <input
              type="date"
              className="py-1 text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPurchasesPage(1); setExpensesPage(1); }}
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setPurchasesPage(1); setExpensesPage(1); }}
                className="ml-1 text-gray-400 hover:text-red-500 p-1 rounded"
                title="Clear dates"
              >
                <MdClose className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={fetchData}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center text-sm"
          >
            <MdRefresh className="mr-1 h-4 w-4" /> Refresh
          </button>
          <button
            onClick={handleOpenCashModal}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
          >
            <MdPayments className="mr-1" /> Cash Count
          </button>
          <button
            onClick={handleOpenCapitalModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
          >
            <MdAccountBalance className="mr-1" /> Capital
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 shadow-md ring-2 ring-orange-200 flex items-center text-sm font-semibold"
          >
            <MdReceipt className="mr-1 h-4 w-4" /> Expense
          </button>
          <button
            onClick={() => { resetInventoryForm(); setIsInventoryModalOpen(true); }}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center text-sm"
          >
            <MdInventory className="mr-1" /> Inventory
          </button>
          <button
            onClick={handleExport}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center text-sm"
          >
            <MdDownload className="mr-1" /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      ) : (
        <>
          {/* Available Cash */}
          <div className="mb-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-600">
                    <MdPayments className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Available Cash (computed)</p>
                    <p className="text-4xl font-extrabold text-green-700">{formatCurrency(availableCashTotal)}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatBaselineTime(financeSettings?.cashBaselineAt)}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                  LIVE CASH
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                <div className="bg-white/80 rounded-lg p-3 border border-green-100">
                  <p className="text-gray-500">+ Cash baseline</p>
                  <p className="font-bold text-gray-800">{formatCurrency(cashBaseline)}</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-green-100">
                  <p className="text-gray-500">+ Delivered sales</p>
                  <p className="font-bold text-emerald-700">{formatCurrency(deliveredSalesAfterBaseline)}</p>
                  <p className="text-xs text-gray-400">{availableCashBreakdown?.deliveredOrdersCount ?? 0} orders</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-green-100">
                  <p className="text-gray-500">− Inventory</p>
                  <p className="font-bold text-amber-700">{formatCurrency(inventoryTotal)}</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-green-100">
                  <p className="text-gray-500">− Expenses</p>
                  <p className="font-bold text-orange-700">{formatCurrency(expensesInCash)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-white rounded-2xl shadow-md p-6 border border-gray-100 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Capital (tracked separately)</p>
                <button
                  onClick={() => increaseCapital(10000)}
                  className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                >
                  +10K
                </button>
              </div>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(capitalMoney)}</p>
              <p className="text-xs text-gray-400 mt-1">Not included in available cash</p>
            </div>
          </div>

          {/* Net Sales */}
          <div className="mb-8">
            <div className={`rounded-2xl shadow-lg p-6 border-2 ${netSales >= 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
              }`}>
              <p className="text-sm font-medium text-gray-500 mb-1">Net Sales</p>
              <p className={`text-4xl font-extrabold ${netSales >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(netSales)}
              </p>
            </div>
          </div>

          {/* Profit Analytics */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-emerald-600">
                <MdAttachMoney className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Profit Analytics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Delivered Orders Profit</p>
                <p className={`text-3xl font-bold ${deliveredOrdersProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(deliveredOrdersProfit)}
                </p>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className={`rounded-2xl shadow-lg p-6 border-2 md:col-span-2 ${finalProfit >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
                }`}>
                <p className="text-sm text-gray-500 mb-1">Net Profit</p>
                <p className={`text-4xl font-extrabold ${finalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatCurrency(finalProfit)}
                </p>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Delivered Orders</p>
                <p className="text-3xl font-bold text-blue-600">{deliveredOrdersCount}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Total Sold Items</p>
                <p className="text-3xl font-bold text-purple-600">{totalSoldItems}</p>
              </div>
            </div>
          </div>

          {/* Tabs Container */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8 border border-gray-100">
            <div className="flex border-b border-gray-100 pb-4 mb-6">
              <button
                onClick={() => setActiveTab('purchases')}
                className={`flex items-center space-x-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  activeTab === 'purchases'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>Purchases</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'purchases' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                  {inventorySummary.count}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center space-x-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  activeTab === 'expenses'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>Expenses</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'expenses' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
                  {expenses.length}
                </span>
              </button>
            </div>

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Inventory Purchases</h3>
                    <p className="text-xs text-gray-400">Total amount in period: <span className="font-semibold text-amber-700">{formatCurrency(inventorySummary.totalAmount)}</span></p>
                  </div>
                  <button
                    onClick={() => { resetInventoryForm(); setIsInventoryModalOpen(true); }}
                    className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 flex items-center font-medium shadow-sm transition-all"
                  >
                    <MdAdd className="mr-1 h-4 w-4" /> Add Purchase
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                      {inventoryPurchases.length > 0 ? (
                        inventoryPurchases.map((item) => (
                          <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-medium text-gray-800">{item.description}</td>
                            <td className="px-4 py-3 text-gray-500">{item.supplier || '—'}</td>
                            <td className="px-4 py-3 capitalize">{(item.paymentMethod || '').replace('_', ' ')}</td>
                            <td className="px-4 py-3 font-semibold text-amber-700">{formatCurrency(item.amount)}</td>
                            <td className="px-4 py-3 text-xs space-x-2">
                              <button onClick={() => handleEditInventory(item)} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                              <button onClick={() => handleDeleteInventory(item)} className="text-red-600 hover:text-red-800">Delete</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-6 text-center text-gray-400">No inventory purchases found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Purchases pagination controls */}
                {inventorySummary.count > 50 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div>
                      Showing page <span className="font-semibold">{purchasesPage}</span> of <span className="font-semibold">{totalPurchasesPages}</span> ({inventorySummary.count} entries)
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPurchasesPage(prev => Math.max(prev - 1, 1))}
                        disabled={purchasesPage === 1}
                        className={`px-3 py-1.5 border rounded-lg transition-all ${purchasesPage === 1 ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPurchasesPage(prev => Math.min(prev + 1, totalPurchasesPages))}
                        disabled={purchasesPage === totalPurchasesPages}
                        className={`px-3 py-1.5 border rounded-lg transition-all ${purchasesPage === totalPurchasesPages ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Detailed Expenses</h3>
                    <p className="text-xs text-gray-400">Total amount in period: <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span></p>
                  </div>
                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 flex items-center font-medium shadow-sm transition-all"
                  >
                    <MdAdd className="mr-1 h-4 w-4" /> Add Expense
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                      {paginatedExpenses.length > 0 ? (
                        paginatedExpenses.map((expense) => (
                          <tr key={expense._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-xs text-gray-400">{new Date(expense.date).toLocaleDateString()}</td>
                            <td className="px-6 py-3 font-medium text-gray-800">{expense.description}</td>
                            <td className="px-6 py-3 capitalize">{expense.category ? expense.category.replace('_', ' ') : '—'}</td>
                            <td className="px-6 py-3 capitalize">{expense.paymentMethod ? expense.paymentMethod.replace('_', ' ') : '—'}</td>
                            <td className="px-6 py-3 font-semibold text-red-600">{formatCurrency(expense.amount)}</td>
                            <td className="px-6 py-3 text-xs space-x-2">
                              <button onClick={() => handleEditExpense(expense)} className="text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                              <button onClick={() => handleDeleteExpense(expense)} className="text-red-600 hover:text-red-800">Delete</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-6 text-center text-gray-400">No expenses found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Expenses pagination controls */}
                {expenses.length > itemsPerPage && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div>
                      Showing <span className="font-semibold">{startIndexExpenses + 1}</span> to <span className="font-semibold">{Math.min(startIndexExpenses + itemsPerPage, expenses.length)}</span> of <span className="font-semibold">{expenses.length}</span> entries
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setExpensesPage(prev => Math.max(prev - 1, 1))}
                        disabled={expensesPage === 1}
                        className={`px-3 py-1.5 border rounded-lg transition-all ${expensesPage === 1 ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setExpensesPage(prev => Math.min(prev + 1, totalExpensesPages))}
                        disabled={expensesPage === totalExpensesPages}
                        className={`px-3 py-1.5 border rounded-lg transition-all ${expensesPage === totalExpensesPages ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Cash baseline modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Record Cash Count</h2>
              <button onClick={() => setIsCashModalOpen(false)}><MdClose className="h-6 w-6 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Enter the cash you have right now. Delivered order sales after this moment will be added automatically.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cash on hand (EGP)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              value={cashBaselineForm.cashBaseline}
              onChange={(e) => setCashBaselineForm({ cashBaseline: parseFloat(e.target.value) || 0 })}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCashModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSaveCashBaseline} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save count'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capital modal */}
      {isCapitalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Update Capital</h2>
              <button onClick={() => setIsCapitalModalOpen(false)}><MdClose className="h-6 w-6 text-gray-400" /></button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capital Money (EGP)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              value={capitalForm.capitalMoney}
              onChange={(e) => setCapitalForm({ capitalMoney: parseFloat(e.target.value) || 0 })}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCapitalModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSaveCapital} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory modal */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingInventory ? 'Edit' : 'Add'} Inventory Purchase</h2>
              <button onClick={() => { setIsInventoryModalOpen(false); resetInventoryForm(); }}><MdClose className="h-6 w-6 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={inventoryForm.description} onChange={(e) => setInventoryForm({ ...inventoryForm, description: e.target.value })} placeholder="e.g. Summer stock" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (EGP) *</label>
                <input type="number" required min="0.01" step="0.01" className="w-full px-4 py-2 border rounded-lg" value={inventoryForm.amount} onChange={(e) => setInventoryForm({ ...inventoryForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" className="w-full px-4 py-2 border rounded-lg" value={inventoryForm.date} onChange={(e) => setInventoryForm({ ...inventoryForm, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Supplier</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg" value={inventoryForm.supplier} onChange={(e) => setInventoryForm({ ...inventoryForm, supplier: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment</label>
                <select className="w-full px-4 py-2 border rounded-lg" value={inventoryForm.paymentMethod} onChange={(e) => setInventoryForm({ ...inventoryForm, paymentMethod: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea className="w-full px-4 py-2 border rounded-lg" rows="2" value={inventoryForm.notes} onChange={(e) => setInventoryForm({ ...inventoryForm, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsInventoryModalOpen(false); resetInventoryForm(); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => { setIsExpenseModalOpen(false); setEditingExpense(null); setExpenseForm({ description: '', amount: '', category: '', paymentMethod: 'vodafone_cash', notes: '' }); }}>
                <MdClose className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (EGP) *</label>
                <input type="number" required min="0.01" step="0.01" className="w-full px-4 py-2 border rounded-lg" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select required className="w-full px-4 py-2 border rounded-lg" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  <option value="">Select</option>
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
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select className="w-full px-4 py-2 border rounded-lg" value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea className="w-full px-4 py-2 border rounded-lg" rows="3" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
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
