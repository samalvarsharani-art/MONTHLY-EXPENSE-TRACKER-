import React, { useEffect, useRef } from 'react';
import { BackupValidationResult } from '../services/storage';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface ImportBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupData: NonNullable<BackupValidationResult['data']> | null;
  onConfirm: () => void;
}

export const ImportBackupModal: React.FC<ImportBackupModalProps> = ({
  isOpen,
  onClose,
  backupData,
  onConfirm,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !backupData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-teal-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-amber-600 text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
            <h3 id="import-modal-title" className="font-bold text-base text-white">
              Restore Data from Backup
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-amber-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">⚠️ Warning: Existing data will be replaced</p>
            <p className="text-amber-800 leading-relaxed">
              Importing this backup will completely overwrite your current budget settings, custom categories, and all transaction history for your account.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-slate-800">Backup Contents:</div>
            <div className="flex justify-between text-slate-600">
              <span>Account Name:</span>
              <strong className="text-slate-800">{backupData.user.name}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Monthly Budget:</span>
              <strong className="text-slate-800">{backupData.user.currency} {backupData.user.monthlyBudget}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Transactions:</span>
              <strong className="text-teal-700">{backupData.expenses.length} expenses</strong>
            </div>
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
              ref={confirmBtnRef}
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Yes, Restore Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
