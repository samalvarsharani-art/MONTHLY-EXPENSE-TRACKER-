import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { getCategoryMeta } from '../utils/categories';
import { formatCurrency } from '../utils/currencies';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';

interface CategoryChartProps {
  expenses: Expense[];
  currency: string;
  totalSpent: number;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({
  expenses,
  currency,
  totalSpent,
}) => {
  const [chartMode, setChartMode] = useState<'donut' | 'bar'>('donut');
  const [hoveredCategory, setHoveredCategory] = useState<ExpenseCategory | null>(null);

  // Aggregate spending by category (supports all standard and custom categories)
  const categoryTotals: Record<string, number> = {};

  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  // Extract unique categories with spending
  const uniqueCategories = Object.keys(categoryTotals);

  const activeCategories = uniqueCategories
    .map((cat) => ({
      category: cat,
      meta: getCategoryMeta(cat),
      amount: categoryTotals[cat],
      percentage: totalSpent > 0 ? (categoryTotals[cat] / totalSpent) * 100 : 0,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // If no expenses logged yet
  if (totalSpent === 0 || activeCategories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-teal-100 p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
          <PieIcon className="w-6 h-6 text-teal-500" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 mb-1">
          Spending Breakdown
        </h4>
        <p className="text-xs text-slate-400 max-w-xs">
          Your category breakdown chart will appear here once you log your first expense.
        </p>
      </div>
    );
  }

  // Calculate donut stroke slices
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercentage = 0;

  const donutSlices = activeCategories.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
    cumulativePercentage += item.percentage;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeHoverItem = hoveredCategory
    ? activeCategories.find((i) => i.category === hoveredCategory)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-teal-100 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header with Switcher */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Spending by Category
          </h3>
          <p className="text-xs text-slate-400">
            {activeCategories.length} active categor{activeCategories.length === 1 ? 'y' : 'ies'}
          </p>
        </div>

        {/* Chart View Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setChartMode('donut')}
            className={`p-1.5 rounded-md text-xs font-medium transition-all ${
              chartMode === 'donut'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Donut Chart View"
          >
            <PieIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bar')}
            className={`p-1.5 rounded-md text-xs font-medium transition-all ${
              chartMode === 'bar'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Bar Chart View"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {chartMode === 'donut' ? (
        /* Donut Chart View */
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center my-2">
          
          {/* SVG Donut */}
          <div className="sm:col-span-6 flex flex-col items-center justify-center relative">
            <svg
              className="w-48 h-48 -rotate-90 transform"
              viewBox="0 0 160 160"
            >
              {/* Background circle track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-100 stroke-current"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Data segments */}
              {donutSlices.map((slice) => {
                const isHovered = hoveredCategory === slice.category;
                return (
                  <circle
                    key={slice.category}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={slice.meta.fillColor}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
            </svg>

            {/* Center Label inside donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              {activeHoverItem ? (
                <>
                  <span className="text-[11px] font-medium text-slate-500 line-clamp-1">
                    {activeHoverItem.meta.label}
                  </span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(activeHoverItem.amount, currency)}
                  </span>
                  <span className="text-[11px] text-teal-600 font-semibold tabular-nums">
                    {activeHoverItem.percentage.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-slate-400">Total Spent</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(totalSpent, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">100%</span>
                </>
              )}
            </div>
          </div>

          {/* Legend / Category breakdown on right */}
          <div className="sm:col-span-6 space-y-2">
            {activeCategories.map((item) => {
              const Icon = item.meta.icon;
              const isHovered = hoveredCategory === item.category;

              return (
                <div
                  key={item.category}
                  onMouseEnter={() => setHoveredCategory(item.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                    isHovered ? 'bg-teal-50/80 ring-1 ring-teal-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.meta.fillColor }}
                    />
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {item.meta.label}
                    </span>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1.5 tabular-nums">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        /* Horizontal Bar Chart View */
        <div className="space-y-3.5 my-2">
          {activeCategories.map((item) => {
            const Icon = item.meta.icon;
            const maxAmount = activeCategories[0].amount;
            const barWidthPercent = (item.amount / maxAmount) * 100;

            return (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-medium text-slate-700">{item.meta.label}</span>
                  </div>
                  <div className="tabular-nums">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <span className="text-slate-400 text-[11px] ml-1.5">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidthPercent}%`,
                      backgroundColor: item.meta.fillColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Hover over segments to inspect details</span>
        <span className="font-medium text-teal-700">Total: {formatCurrency(totalSpent, currency)}</span>
      </div>
    </div>
  );
};
