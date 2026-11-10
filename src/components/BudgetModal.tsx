import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { CURRENCIES, getCurrencyConfig, formatCurrency } from '../utils/currencies';
import { X, Save, AlertCircle, AlertTriangle } from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updatedUser: User) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('INR');
  const [userName, setUserName] = useState<string>('');
  const [currencyWarningConfirmed, setCurrencyWarningConfirmed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset fields to user's saved values every time the popup opens
  useEffect(() => {
    if (isOpen) {
      setBudgetInput(user.monthlyBudget ? user.monthlyBudget.toString() : '');
      setSelectedCurrency(user.currency || 'INR');
      setUserName(user.name || '');
      setCurrencyWarningConfirmed(false);
      setErrorMsg(null);

      // Focus first input
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, user]);

  // Handle ESC key press to close popup
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

  const numericBudget = parseFloat(budgetInput) || 0;
  const currentCurrencyConfig = getCurrencyConfig(selectedCurrency);
  const isCurrencyChanged = selectedCurrency !== user.currency;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(numericBudget) || numericBudget <= 0) {
      setErrorMsg('Please enter a budget amount greater than 0.');
      return;
    }

    if (!userName.trim()) {
      setErrorMsg('Name cannot be empty.');
      return;
    }

    // Currency change confirmation validation
    if (isCurrencyChanged && !currencyWarningConfirmed) {
      setErrorMsg(
        'Please confirm that you understand existing expense amounts will not be converted to the new currency.'
      );
      return;
    }

    const updatedUser: User = {
      ...user,
      name: userName.trim(),
      monthlyBudget: numericBudget,
      currency: selectedCurrency,
    };

    onSave(updatedUser);
    onClose();
  };

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
      aria-labelledby="budget-modal-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-teal-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-700 text-white">
          <div>
            <h3 id="budget-modal-title" className="font-bold text-base text-white">
              Edit Budget & Currency
            </h3>
            <p className="text-xs text-teal-100">Adjust your monthly ceiling and currency</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="budget-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Your Name
            </label>
            <input
              ref={firstInputRef}
              id="budget-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="budget-currency" className="block text-xs font-semibold text-slate-700 mb-1">
              Preferred Currency
            </label>
            <select
              id="budget-currency"
              value={selectedCurrency}
              onChange={(e) => {
                setSelectedCurrency(e.target.value);
                setCurrencyWarningConfirmed(false);
              }}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Currency change warning & confirmation */}
          {isCurrencyChanged && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-medium">
                  Notice: Existing expense amounts will <strong>NOT</strong> be converted from{' '}
                  {user.currency} to {selectedCurrency}. They will only display the new currency symbol.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-700 font-medium select-none">
                <input
                  type="checkbox"
                  id="confirm-currency-change"
                  checked={currencyWarningConfirmed}
                  onChange={(e) => setCurrencyWarningConfirmed(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="text-[11px]">I understand existing amounts will not be converted</span>
              </label>
            </div>
          )}

          <div>
            <label htmlFor="budget-amount" className="block text-xs font-semibold text-slate-700 mb-1">
              Monthly Budget ({currentCurrencyConfig.symbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                {currentCurrencyConfig.symbol}
              </span>
              <input
                id="budget-amount"
                type="number"
                min="1"
                step="any"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 tabular-nums transition-colors"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-between">
            <span className="text-xs text-teal-800 font-medium">New Monthly Limit:</span>
            <span className="text-sm font-bold text-teal-700 tabular-nums">
              {formatCurrency(numericBudget, selectedCurrency)}
            </span>
          </div>

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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
