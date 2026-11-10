import React, { useState } from 'react';
import { User } from '../types';
import { CURRENCIES, getCurrencyConfig, formatCurrency } from '../utils/currencies';
import { saveUser } from '../services/storage';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  CheckCircle,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

interface ProfileSetupPageProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const ProfileSetupPage: React.FC<ProfileSetupPageProps> = ({ user, onComplete }) => {
  const [name, setName] = useState(user.name || '');
  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    user.monthlyBudget > 0 ? user.monthlyBudget.toString() : '50000'
  );
  const [currency, setCurrency] = useState<string>(user.currency || 'INR');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedCurrencyConfig = getCurrencyConfig(currency);
  const numericBudget = parseFloat(monthlyBudget) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      setErrorMsg('Please enter your preferred name.');
      return;
    }

    if (isNaN(numericBudget) || numericBudget <= 0) {
      setErrorMsg('Please enter a valid monthly budget greater than 0.');
      return;
    }

    const updatedUser: User = {
      ...user,
      name: nameTrimmed,
      monthlyBudget: numericBudget,
      currency,
      profileCompleted: true,
    };

    saveUser(updatedUser);
    onComplete(updatedUser);
  };

  // Quick preset buttons tailored to currency
  const isINR = currency === 'INR' || currency === 'JPY';
  const presetValues = isINR ? [20000, 40000, 60000, 100000] : [1500, 3000, 5000, 8000];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50/60">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-700 p-6 sm:p-8 text-white relative">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-teal-100 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-teal-200" />
              <span>Step 2 of 2: Personalize Your Budget</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Set Up Your Monthly Budget
            </h1>
            <p className="text-teal-100 text-sm leading-relaxed">
              Define your monthly spending limit and preferred currency. You can adjust these anytime from the dashboard.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Input Form (Left 7 cols) */}
            <form onSubmit={handleSubmit} className="md:col-span-7 space-y-5">
              <div>
                <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Pre-filled from your registration.
                </p>
              </div>

              <div>
                <label htmlFor="profile-currency" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Preferred Currency
                </label>
                <select
                  id="profile-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} — {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-budget" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Monthly Budget Target ({selectedCurrencyConfig.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                    {selectedCurrencyConfig.symbol}
                  </span>
                  <input
                    id="profile-budget"
                    type="number"
                    min="1"
                    step="any"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="Enter monthly target"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 tabular-nums transition-colors"
                  />
                </div>

                {/* Quick Presets */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs text-slate-400 self-center mr-1">Presets:</span>
                  {presetValues.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMonthlyBudget(val.toString())}
                      className="px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-colors"
                    >
                      {formatCurrency(val, currency)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Live Preview Card (Right 5 cols) */}
            <div className="md:col-span-5 bg-teal-50/70 border border-teal-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <span>Live Budget Preview</span>
              </div>

              <div className="p-4 rounded-lg bg-white border border-teal-100 shadow-xs">
                <div className="text-xs text-slate-500 mb-1">Target Account</div>
                <div className="text-sm font-semibold text-slate-800 mb-3 truncate">
                  {name.trim() || 'Your Name'}
                </div>

                <div className="text-xs text-slate-500 mb-1">Monthly Spending Ceiling</div>
                <div className="text-2xl font-bold tracking-tight text-teal-700 tabular-nums">
                  {numericBudget > 0
                    ? formatCurrency(numericBudget, currency)
                    : `${selectedCurrencyConfig.symbol} 0`}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Currency: {selectedCurrencyConfig.name}
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span>Remaining balance will be automatically calculated as you log expenses.</span>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <span>The progress meter turns amber at 80% and red when exceeded.</span>
                </div>
              </div>

              <div className="p-3 bg-teal-100/50 rounded-lg text-xs text-teal-800 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>Tip: A common financial guideline is the 50/30/20 rule (50% needs, 30% wants, 20% savings).</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
