import React, { useState, useMemo, useEffect } from 'react';
import { User, Expense, ExpenseCategory } from '../types';
import { formatCurrency, getCurrencyConfig } from '../utils/currencies';
import {
  getCategoryDropdownOptions,
  normalizeCategoryInput,
} from '../utils/categories';
import {
  getLocalCurrentMonthKey,
  getLocalTodayDateString,
  formatMonthName,
  addMonths,
  isValidDateString,
} from '../utils/dates';
import {
  getUserExpenses,
  getUserCustomCategories,
  addExpense,
  updateExpense,
  deleteExpense,
  saveUserExpenses,
} from '../services/storage';
import { auth, subscribeToUserExpenses } from '../services/firebase';
import { CategoryChart } from './CategoryChart';
import { ExpenseTable } from './ExpenseTable';
import { ExpenseModal } from './ExpenseModal';
import {
  TrendingUp,
  AlertTriangle,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Cloud,
} from 'lucide-react';

interface DashboardPageProps {
  user: User;
  onOpenEditBudget: () => void;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onOpenEditBudget,
  onLogout,
}) => {
  // All expenses stored for this user across all months
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getUserExpenses(user.id)
  );

  // Month selector state defaulting to current local month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalCurrentMonthKey);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // User custom categories
  const [userCustomCategories, setUserCustomCategories] = useState<string[]>(() =>
    getUserCustomCategories(user.id)
  );

  // Refresh custom categories when expenses change
  useEffect(() => {
    setUserCustomCategories(getUserCustomCategories(user.id));
  }, [user.id, expenses]);

  // Real-time Firestore synchronizer
  useEffect(() => {
    if (auth.currentUser && auth.currentUser.uid === user.id) {
      const unsubscribe = subscribeToUserExpenses(
        user.id,
        (cloudExpenses) => {
          setExpenses(cloudExpenses);
          saveUserExpenses(user.id, cloudExpenses);
        },
        (err) => {
          console.warn('Firestore subscription fallback:', err);
        }
      );
      return () => unsubscribe();
    }
  }, [user.id]);

  // Quick inline add expense form state
  const [inlineName, setInlineName] = useState('');
  const [inlineAmount, setInlineAmount] = useState('');
  const [inlineCategory, setInlineCategory] = useState<string>('Food');
  const [inlineCustomCategory, setInlineCustomCategory] = useState('');
  const [inlineDate, setInlineDate] = useState(() => getLocalTodayDateString());
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showInlineForm, setShowInlineForm] = useState(false);

  // When switching months, sync inline date default if appropriate
  useEffect(() => {
    const currentMonth = getLocalCurrentMonthKey();
    if (selectedMonth === currentMonth) {
      setInlineDate(getLocalTodayDateString());
    } else {
      setInlineDate(`${selectedMonth}-01`);
    }
  }, [selectedMonth]);

  const currencyConfig = getCurrencyConfig(user.currency);

  // Filter expenses strictly to the selected month
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Calculate totals strictly for the selected month
  const totalSpent = useMemo(() => {
    return monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [monthExpenses]);

  const monthlyBudget = user.monthlyBudget || 0;
  const remainingBalance = monthlyBudget - totalSpent;
  const percentageUsed = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  const isOverBudget = remainingBalance < 0;
  const isNearBudget = percentageUsed >= 80 && percentageUsed <= 100;

  // Handlers
  const handleSaveExpense = (expenseData: {
    id?: string;
    name: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    notes?: string;
  }) => {
    if (expenseData.id) {
      // Edit: keep original createdAt time
      const existing = expenses.find((e) => e.id === expenseData.id);
      const updated: Expense = {
        id: expenseData.id,
        userId: user.id,
        name: expenseData.name,
        amount: expenseData.amount,
        category: expenseData.category,
        date: expenseData.date,
        notes: expenseData.notes,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
      };
      updateExpense(user.id, updated);
      setExpenses((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
    } else {
      // Add
      const created = addExpense(user.id, {
        name: expenseData.name,
        amount: expenseData.amount,
        category: expenseData.category,
        date: expenseData.date,
        notes: expenseData.notes,
      });
      setExpenses((prev) => [created, ...prev]);

      // If the added expense is in a different month, switch to that month so the user sees it immediately
      const expenseMonth = created.date.substring(0, 7);
      if (expenseMonth !== selectedMonth) {
        setSelectedMonth(expenseMonth);
      }
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(user.id, expenseId);
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setEditingExpense(null);
    setIsAddModalOpen(true);
  };

  // Inline Quick Add submit with date & custom category validation
  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    const nameTrimmed = inlineName.trim();
    if (!nameTrimmed) {
      setInlineError('Please enter an expense name.');
      return;
    }
    const num = parseFloat(inlineAmount);
    if (isNaN(num) || num <= 0) {
      setInlineError('Please enter a valid amount.');
      return;
    }

    if (!inlineDate || !isValidDateString(inlineDate)) {
      setInlineError('Please enter a valid date (YYYY-MM-DD).');
      return;
    }

    let finalCategory = inlineCategory;
    if (inlineCategory === 'Other') {
      const trimmedCustom = inlineCustomCategory.trim();
      if (!trimmedCustom) {
        setInlineError('Please enter a custom category name.');
        return;
      }
      const capped = trimmedCustom.slice(0, 30);
      finalCategory = normalizeCategoryInput(capped, userCustomCategories);
    }

    handleSaveExpense({
      name: nameTrimmed,
      amount: num,
      category: finalCategory,
      date: inlineDate,
    });

    // Reset inline form
    setInlineName('');
    setInlineAmount('');
    setInlineCustomCategory('');
    setInlineError(null);
    setShowInlineForm(false);
  };

  const inlineDropdownOptions = getCategoryDropdownOptions(userCustomCategories);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Greeting & Month Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Hello, {user.name} 👋
            </h1>
            {auth.currentUser && auth.currentUser.uid === user.id && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                <Cloud className="w-3.5 h-3.5 text-teal-600" />
                <span>Cloud Synced</span>
              </span>
            )}
          </div>
          
          {/* Month Selector Component */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Budgeting for:</span>
            </span>

            <div className="inline-flex items-center gap-1 bg-white border border-teal-100 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => addMonths(m, -1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Previous month"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-xs sm:text-sm font-semibold text-slate-900 min-w-[130px] text-center select-none">
                {formatMonthName(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Next month"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {selectedMonth !== getLocalCurrentMonthKey() && (
              <button
                type="button"
                onClick={() => setSelectedMonth(getLocalCurrentMonthKey())}
                className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                Return to Current Month
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInlineForm(!showInlineForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-600" />
            <span>{showInlineForm ? 'Hide Quick Add' : 'Quick Add Expense'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Exceeded / Near Budget Alert Banners */}
      {isOverBudget ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm sm:text-base text-rose-900">
              Warning: Budget Exceeded for {formatMonthName(selectedMonth)}!
            </h4>
            <p className="text-xs sm:text-sm text-rose-700 mt-0.5 leading-relaxed">
              You have exceeded your monthly budget of <strong>{formatCurrency(monthlyBudget, user.currency)}</strong> by{' '}
              <strong className="font-semibold text-rose-900 underline">
                {formatCurrency(Math.abs(remainingBalance), user.currency)}
              </strong>{' '}
              ({percentageUsed.toFixed(1)}% used). Consider reviewing your expenditures.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenEditBudget}
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Adjust Budget
          </button>
        </div>
      ) : isNearBudget ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-amber-900">
              Heads up: Approaching Budget Limit ({formatMonthName(selectedMonth)})
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              You have spent <strong>{percentageUsed.toFixed(1)}%</strong> of your monthly allowance.{' '}
              <strong>{formatCurrency(remainingBalance, user.currency)}</strong> remaining for this month.
            </p>
          </div>
        </div>
      ) : null}

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card 1: Monthly Budget */}
        <div className="bg-white rounded-2xl border border-teal-100 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Budget
            </span>
            <button
              type="button"
              onClick={onOpenEditBudget}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(monthlyBudget, user.currency)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Currency: {currencyConfig.name}
            </div>
          </div>
        </div>

        {/* Card 2: Total Spent (selected month) */}
        <div className="bg-white rounded-2xl border border-teal-100 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Spent ({formatMonthName(selectedMonth).split(' ')[0]})
            </span>
            <span className="text-xs font-semibold text-teal-700 px-2 py-0.5 rounded-md bg-teal-50">
              {monthExpenses.length} transaction{monthExpenses.length === 1 ? '' : 's'}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(totalSpent, user.currency)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {percentageUsed.toFixed(1)}% of monthly budget
            </div>
          </div>
        </div>

        {/* Card 3: Remaining Balance */}
        <div
          className={`rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors ${
            isOverBudget
              ? 'bg-rose-50/50 border-rose-200'
              : 'bg-white border-teal-100'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Remaining Balance
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                isOverBudget
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {isOverBudget ? 'Over Budget' : 'Safe to Spend'}
            </span>
          </div>
          <div>
            <div
              className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
                isOverBudget ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(remainingBalance, user.currency)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {isOverBudget
                ? `Exceeded by ${formatCurrency(Math.abs(remainingBalance), user.currency)}`
                : `${(100 - percentageUsed).toFixed(1)}% left in reserve`}
            </div>
          </div>
        </div>

      </div>

      {/* Progress Bar Component with 80% Marker and Positioned Label */}
      <div className="bg-white rounded-2xl border border-teal-100 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span className="text-xs sm:text-sm font-semibold text-slate-800">
              Budget Utilization for {formatMonthName(selectedMonth)}
            </span>
          </div>
          <span
            className={`text-xs sm:text-sm font-bold tabular-nums ${
              percentageUsed > 100
                ? 'text-rose-600'
                : percentageUsed >= 80
                ? 'text-amber-600'
                : 'text-teal-700'
            }`}
          >
            {percentageUsed.toFixed(1)}% Used
          </span>
        </div>

        {/* Dynamic Multi-Color Progress Bar with 80% Marker line */}
        <div className="relative w-full">
          <div className="w-full h-3.5 rounded-full bg-slate-100 relative overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentageUsed > 100
                  ? 'bg-rose-600'
                  : percentageUsed >= 80
                  ? 'bg-amber-500'
                  : 'bg-teal-500'
              }`}
              style={{
                width: `${Math.min(percentageUsed, 100)}%`,
              }}
            />
            {/* Thin vertical marker line at 80% position */}
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-slate-400/80 z-10 pointer-events-none"
              style={{ left: '80%' }}
              title="80% Threshold marker"
            />
          </div>

          {/* Indicators row with 80% Threshold label positioned at 80% */}
          <div className="relative flex justify-between items-center text-xs text-slate-400 mt-2">
            <span>{formatCurrency(0, user.currency)}</span>

            {/* Centered at 80% */}
            <div
              className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: '80%' }}
            >
              <span className="text-[11px] font-medium text-slate-500">80% Threshold</span>
            </div>

            <span>Budget: {formatCurrency(monthlyBudget, user.currency)}</span>
          </div>
        </div>
      </div>

      {/* Inline Quick Add Form */}
      {showInlineForm && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-800">Quick Log Expense</h3>
            <button
              type="button"
              onClick={() => setShowInlineForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Close
            </button>
          </div>

          {inlineError && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
              {inlineError}
            </div>
          )}

          <form onSubmit={handleInlineSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label htmlFor="inline-desc" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Description
              </label>
              <input
                id="inline-desc"
                type="text"
                value={inlineName}
                onChange={(e) => setInlineName(e.target.value)}
                placeholder="e.g. Lunch with team"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="inline-amount" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Amount ({currencyConfig.symbol})
              </label>
              <input
                id="inline-amount"
                type="number"
                step="any"
                min="0.01"
                value={inlineAmount}
                onChange={(e) => setInlineAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 tabular-nums"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="inline-category" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Category
              </label>
              <select
                id="inline-category"
                value={inlineCategory}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setInlineCategory(newCat);
                  if (newCat !== 'Other') {
                    setInlineCustomCategory('');
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {inlineDropdownOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {inlineCategory === 'Other' && (
                <div className="mt-2 animate-in fade-in duration-200">
                  <label htmlFor="inline-custom-cat" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Custom category
                  </label>
                  <input
                    id="inline-custom-cat"
                    type="text"
                    required
                    maxLength={30}
                    value={inlineCustomCategory}
                    onChange={(e) => setInlineCustomCategory(e.target.value)}
                    placeholder="Type your category (e.g., Gym, Pets, Gifts)"
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="inline-date" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Date
              </label>
              <input
                id="inline-date"
                type="date"
                required
                value={inlineDate}
                onChange={(e) => setInlineDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-1">
              <button
                type="submit"
                className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Charts & Visual Analytics strictly for selected month */}
      <CategoryChart
        expenses={monthExpenses}
        currency={user.currency}
        totalSpent={totalSpent}
      />

      {/* Main Expense Table / List strictly for selected month */}
      <ExpenseTable
        expenses={monthExpenses}
        currency={user.currency}
        selectedMonth={selectedMonth}
        userCustomCategories={userCustomCategories}
        onEdit={handleEditClick}
        onDelete={handleDeleteExpense}
        onOpenAddModal={handleOpenNewModal}
      />

      {/* Single Add/Edit Modal */}
      <ExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
        currency={user.currency}
        userCustomCategories={userCustomCategories}
      />
    </div>
  );
};
