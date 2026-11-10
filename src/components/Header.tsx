import React, { useRef } from 'react';
import { User } from '../types';
import { Wallet, Settings2, LogOut, Download, Upload } from 'lucide-react';
import { getCurrencyConfig } from '../utils/currencies';

interface HeaderProps {
  user: User | null;
  onEditBudget?: () => void;
  onExportBackup?: () => void;
  onImportBackupFile?: (file: File) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onEditBudget,
  onExportBackup,
  onImportBackupFile,
  onLogout,
}) => {
  const currency = user ? getCurrencyConfig(user.currency) : null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportBackupFile) {
      onImportBackupFile(file);
    }
    // Reset file input so the same file can be re-selected if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-teal-100/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap">
            Monthly Expense Tracker
          </span>
        </div>

        {/* Zone 2 & 3: Actions & Profile */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Hidden file input for importing backup */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Import JSON backup file"
            />

            {/* Backup options in header */}
            {onExportBackup && (
              <button
                type="button"
                onClick={onExportBackup}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Save a complete JSON backup of all your data"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Backup</span>
              </button>
            )}

            {onImportBackupFile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Restore all your data from a JSON backup file"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import Backup</span>
              </button>
            )}

            {onEditBudget && (
              <button
                type="button"
                onClick={onEditBudget}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Edit Budget and Preferred Currency"
              >
                <Settings2 className="w-4 h-4 text-teal-600" />
                <span className="hidden sm:inline">Edit Budget ({currency?.symbol})</span>
                <span className="sm:hidden">Budget</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Log out from account"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-teal-700 bg-teal-50/80 px-2.5 py-1 rounded-md border border-teal-100 whitespace-nowrap">
            Simple & Private
          </div>
        )}
      </div>
    </header>
  );
};
