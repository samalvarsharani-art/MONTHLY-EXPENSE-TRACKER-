import React, { useState, useEffect, useRef } from 'react';
import { Expense, ExpenseCategory } from '../types';
import {
  getCategoryDropdownOptions,
  normalizeCategoryInput,
  CORE_CATEGORIES,
} from '../utils/categories';
import { getCurrencyConfig } from '../utils/currencies';
import { getLocalTodayDateString, isValidDateString } from '../utils/dates';
import { X, Plus, Check, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: {
    id?: string;
    name: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    notes?: string;
  }) => void;
  editingExpense?: Expense | null;
  currency: string;
  userCustomCategories: string[];
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingExpense,
  currency,
  userCustomCategories,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Food');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);
  const currencyConfig = getCurrencyConfig(currency);

  // Available options for the dropdown: Core categories -> User's saved custom categories -> 'Other'
  const dropdownOptions = getCategoryDropdownOptions(userCustomCategories);

  // Set initial form state whenever modal opens or editingExpense changes
  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setName(editingExpense.name);
        setAmount(editingExpense.amount.toString());
        setDate(editingExpense.date);
        setNotes(editingExpense.notes || '');

        // Determine if category is in our dropdown options (excluding 'Other')
        const matchedInDropdown = dropdownOptions.find(
          (opt) => opt.toLowerCase() === editingExpense.category.toLowerCase() && opt !== 'Other'
        );

        if (matchedInDropdown) {
          setSelectedCategory(matchedInDropdown);
          setCustomCategory('');
        } else if (editingExpense.category.toLowerCase() === 'other') {
          setSelectedCategory('Other');
          setCustomCategory('');
        } else {
          // It's a new custom category not yet in the list
          setSelectedCategory('Other');
          setCustomCategory(editingExpense.category);
        }
      } else {
        setName('');
        setAmount('');
        setSelectedCategory('Food');
        setCustomCategory('');
        setDate(getLocalTodayDateString());
        setNotes('');
      }
      setErrorMsg(null);

      // Focus first input
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  }, [editingExpense, isOpen, dropdownOptions]);

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      setErrorMsg('Please enter an expense description or name.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    if (!date || !isValidDateString(date)) {
      setErrorMsg('Please select a valid date (YYYY-MM-DD).');
      return;
    }

    // Category resolution
    let finalCategory = selectedCategory;
    if (selectedCategory === 'Other') {
      const trimmedCustom = customCategory.trim();
      if (!trimmedCustom) {
        setErrorMsg('Please enter a custom category name.');
        return;
      }
      const capped = trimmedCustom.slice(0, 30);
      finalCategory = normalizeCategoryInput(capped, userCustomCategories);
    }

    onSave({
      id: editingExpense?.id,
      name: nameTrimmed,
      amount: numericAmount,
      category: finalCategory,
      date,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const quickSuggestions: { name: string; category: ExpenseCategory }[] = [
    { name: 'Supermarket Groceries', category: 'Food' },
    { name: 'Coffee & Breakfast', category: 'Food' },
    { name: 'Metro / Fuel / Taxi', category: 'Transport' },
    { name: 'Electricity / Water Bill', category: 'Bills' },
    { name: 'Apartment Monthly Rent', category: 'Rent' },
    { name: 'Pharmacy / Health', category: 'Health' },
    { name: 'Weekend Movie / Dinner', category: 'Entertainment' },
    { name: 'Clothing / Shopping', category: 'Shopping' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-teal-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white">
              {editingExpense ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 id="expense-modal-title" className="font-bold text-base text-white">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <p className="text-xs text-teal-100">
                {editingExpense ? 'Update expense details' : 'Log a new transaction to your monthly tracker'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Suggestions (only in Add mode) */}
          {!editingExpense && (
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.slice(0, 4).map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setName(sug.name);
                      setSelectedCategory(sug.category);
                      setCustomCategory('');
                    }}
                    className="px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-colors cursor-pointer"
                  >
                    + {sug.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expense Description */}
          <div>
            <label htmlFor="expense-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Description / Name
            </label>
            <input
              ref={firstInputRef}
              id="expense-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly Organic Produce"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Amount & Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Amount ({currencyConfig.symbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                  {currencyConfig.symbol}
                </span>
                <input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 tabular-nums transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expense-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  id="expense-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Category Dropdown & Custom Category Input */}
          <div>
            <label htmlFor="expense-category" className="block text-xs font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              id="expense-category"
              value={selectedCategory}
              onChange={(e) => {
                const newCat = e.target.value;
                setSelectedCategory(newCat);
                if (newCat !== 'Other') {
                  setCustomCategory('');
                }
              }}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              {dropdownOptions.map((catKey) => (
                <option key={catKey} value={catKey}>
                  {catKey}
                </option>
              ))}
            </select>

            {/* Custom Category Input (Appears only when "Other" is selected) */}
            {selectedCategory === 'Other' && (
              <div className="mt-3 animate-in fade-in duration-200">
                <label htmlFor="expense-custom-category" className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom category
                </label>
                <input
                  id="expense-custom-category"
                  type="text"
                  required
                  maxLength={30}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Type your category (e.g., Gym, Pets, Gifts)"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="expense-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Note / Tag
            </label>
            <input
              id="expense-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Split with roommate, tax deductible"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {editingExpense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
