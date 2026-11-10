import React, { useState, useMemo } from 'react';
import { Expense } from '../types';
import { CORE_CATEGORIES, getCategoryMeta, deduplicateCustomCategories } from '../utils/categories';
import { formatCurrency } from '../utils/currencies';
import { formatDisplayDate } from '../utils/dates';
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Download,
  PlusCircle,
  Calendar,
} from 'lucide-react';

interface ExpenseTableProps {
  expenses: Expense[]; // already filtered to selected month
  currency: string;
  selectedMonth: string; // YYYY-MM
  userCustomCategories: string[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  onOpenAddModal: () => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  currency,
  selectedMonth,
  userCustomCategories,
  onEdit,
  onDelete,
  onOpenAddModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dynamic category options for filter dropdown:
  // All -> Standard Core -> User's saved custom categories -> Other
  const categoryFilterOptions = useMemo(() => {
    const customInExpenses = expenses.map((e) => e.category);
    const combinedCustom = deduplicateCustomCategories([
      ...userCustomCategories,
      ...customInExpenses,
    ]);
    return [...CORE_CATEGORIES, ...combinedCustom, 'Other'];
  }, [expenses, userCustomCategories]);

  // Filter & sort logic
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((item) => {
        const matchesCategory =
          selectedCategory === 'ALL' ||
          item.category.toLowerCase() === selectedCategory.toLowerCase();
        const matchesSearch =
          searchTerm === '' ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOption === 'date-desc') {
          return b.date.localeCompare(a.date);
        }
        if (sortOption === 'date-asc') {
          return a.date.localeCompare(b.date);
        }
        if (sortOption === 'amount-desc') {
          return b.amount - a.amount;
        }
        if (sortOption === 'amount-asc') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [expenses, selectedCategory, searchTerm, sortOption]);

  // Export only selected month's expenses to CSV with Blob, BOM, escaping, and formula injection protection
  const handleExportCSV = () => {
    if (expenses.length === 0) return;

    const sanitizeCell = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      let str = String(val);
      // Prefix formula triggers (=, +, -, @) with an apostrophe to prevent injection in spreadsheet viewers
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      // Wrap in double quotes and escape internal quotes by doubling them
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Notes'];
    const headerLine = headers.map(sanitizeCell).join(',');

    const rows = expenses.map((e) => [
      sanitizeCell(e.date),
      sanitizeCell(e.name),
      sanitizeCell(e.category),
      sanitizeCell(e.amount),
      sanitizeCell(currency),
      sanitizeCell(e.notes || ''),
    ].join(','));

    // UTF-8 BOM (\uFEFF) ensures Excel displays currency symbols properly
    const csvContent = '\uFEFF' + [headerLine, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly_expenses_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-teal-100 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
        <div>
          <h3 className="font-bold text-base text-slate-900 tracking-tight">
            Transaction History
          </h3>
          <p className="text-xs text-slate-400">
            Showing {filteredExpenses.length} of {expenses.length} record{expenses.length === 1 ? '' : 's'} in selected month
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV button (only selected month's expenses) */}
          {expenses.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Download CSV spreadsheet of selected month"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Add Expense Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="table-search"
            type="text"
            placeholder="Search by name or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:col-span-4 relative">
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="table-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-1.5 pl-2 pr-6 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              <option value="ALL">All Categories</option>
              {categoryFilterOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="sm:col-span-3">
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="table-sort-option"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="w-full py-1.5 pl-2 pr-6 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              <option value="date-desc">Date (Newest)</option>
              <option value="date-asc">Date (Oldest)</option>
              <option value="amount-desc">Amount (Highest)</option>
              <option value="amount-asc">Amount (Lowest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content or Empty State */}
      {filteredExpenses.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
            <PlusCircle className="w-7 h-7 text-teal-500" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">
            {expenses.length === 0
              ? 'No expenses for this month. Add your first one!'
              : 'No matching expenses found'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {expenses.length === 0
              ? 'Start tracking your spending for this month to stay nicely within your budget limit.'
              : 'Try clearing your search term or selecting "All Categories" to view all records.'}
          </p>
          {expenses.length === 0 ? (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Expense for This Month</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
              }}
              className="text-xs text-teal-700 hover:underline font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredExpenses.map((expense) => {
                const meta = getCategoryMeta(expense.category);
                const Icon = meta.icon;
                const isConfirmingDelete = deleteConfirmId === expense.id;
                const displayDate = formatDisplayDate(expense.date);

                return (
                  <tr
                    key={expense.id}
                    className="hover:bg-teal-50/30 transition-colors group"
                  >
                    {/* Name & Notes */}
                    <td className="py-3 px-4 sm:px-6">
                      <div className="font-medium text-slate-800 text-sm">
                        {expense.name}
                      </div>
                      {expense.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                          {expense.notes}
                        </div>
                      )}
                    </td>

                    {/* Category with icon badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${meta.color} border ${meta.borderColor}`}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span>{expense.category}</span>
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                      <div className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{displayDate}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-slate-900 text-sm tabular-nums">
                      {formatCurrency(expense.amount, currency)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                      {isConfirmingDelete ? (
                        <div className="inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                          <span className="text-[11px] text-rose-600 font-medium mr-1">Delete?</span>
                          <button
                            type="button"
                            onClick={() => confirmDelete(expense.id)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(expense)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                            title="Edit this expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(expense.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete this expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
