import React, { useState, useEffect, useRef } from 'react';
import { User, PageView } from './types';
import {
  initSeedDataIfEmpty,
  getCurrentUser,
  setActiveSessionUserId,
  saveUser,
  exportUserDataBackup,
  validateBackupData,
  importUserDataBackup,
  BackupValidationResult,
} from './services/storage';
import {
  onFirebaseAuthStateChange,
  logoutFirebase,
  getUserFromFirestore,
} from './services/firebase';
import { Header } from './components/Header';
import { AuthPage } from './components/AuthPage';
import { ProfileSetupPage } from './components/ProfileSetupPage';
import { DashboardPage } from './components/DashboardPage';
import { BudgetModal } from './components/BudgetModal';
import { ImportBackupModal } from './components/ImportBackupModal';
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageView>('auth');
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Backup import state
  const [pendingBackup, setPendingBackup] = useState<NonNullable<BackupValidationResult['data']> | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [systemNotification, setSystemNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Force re-render key when importing backup data
  const [refreshKey, setRefreshKey] = useState(0);

  const footerFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize session and Firebase Auth listener on mount
  useEffect(() => {
    initSeedDataIfEmpty();

    const unsubscribe = onFirebaseAuthStateChange(async (fbUser) => {
      if (fbUser) {
        try {
          const cloudUser = await getUserFromFirestore(fbUser.uid);
          if (cloudUser) {
            saveUser(cloudUser);
            setActiveSessionUserId(cloudUser.id);
            setCurrentUser(cloudUser);
            if (cloudUser.profileCompleted && cloudUser.monthlyBudget > 0) {
              setCurrentPage('dashboard');
            } else {
              setCurrentPage('profile-setup');
            }
          } else {
            // New user signed in with Firebase
            const newUser: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              monthlyBudget: 0,
              currency: 'INR',
              profileCompleted: false,
              createdAt: new Date().toISOString(),
              photoURL: fbUser.photoURL || undefined,
              isFirebaseUser: true,
            };
            saveUser(newUser);
            setActiveSessionUserId(newUser.id);
            setCurrentUser(newUser);
            setCurrentPage('profile-setup');
          }
        } catch (err) {
          console.warn('Could not retrieve Firestore user:', err);
          const active = getCurrentUser();
          if (active) {
            setCurrentUser(active);
            setCurrentPage(active.profileCompleted && active.monthlyBudget > 0 ? 'dashboard' : 'profile-setup');
          }
        }
      } else {
        const active = getCurrentUser();
        if (active) {
          setCurrentUser(active);
          if (active.profileCompleted && active.monthlyBudget > 0) {
            setCurrentPage('dashboard');
          } else {
            setCurrentPage('profile-setup');
          }
        } else {
          setCurrentUser(null);
          setCurrentPage('auth');
        }
      }
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.profileCompleted && user.monthlyBudget > 0) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('profile-setup');
    }
  };

  const handleProfileComplete = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setCurrentPage('dashboard');
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
    } catch (err) {
      console.warn('Logout notice:', err);
    }
    setActiveSessionUserId(null);
    setCurrentUser(null);
    setCurrentPage('auth');
  };

  // Backup Export
  const handleExportBackup = () => {
    if (!currentUser) return;
    exportUserDataBackup(currentUser);
  };

  // Backup Import File Reader & Validator
  const handleImportBackupFile = (file: File) => {
    if (!currentUser) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateBackupData(parsed);

        if (!result.valid || !result.data) {
          setSystemNotification({
            type: 'error',
            message: result.error || 'The selected file is not a valid Monthly Expense Tracker backup.',
          });
          return;
        }

        // Valid backup: prompt user for confirmation
        setPendingBackup(result.data);
        setImportModalOpen(true);
      } catch (err) {
        setSystemNotification({
          type: 'error',
          message: 'Failed to read file: invalid JSON format.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!currentUser || !pendingBackup) return;

    const updatedUser = importUserDataBackup(currentUser.id, pendingBackup);
    setCurrentUser(updatedUser);
    setPendingBackup(null);
    setImportModalOpen(false);
    setRefreshKey((k) => k + 1);

    setSystemNotification({
      type: 'success',
      message: 'Backup restored successfully! All records and settings have been updated.',
    });

    setTimeout(() => {
      setSystemNotification(null);
    }, 4500);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-teal-700 text-sm font-medium animate-pulse">
          Loading Monthly Expense Tracker...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navigation */}
      <Header
        user={currentUser}
        onEditBudget={
          currentPage === 'dashboard' ? () => setIsEditBudgetOpen(true) : undefined
        }
        onExportBackup={currentUser ? handleExportBackup : undefined}
        onImportBackupFile={currentUser ? handleImportBackupFile : undefined}
        onLogout={handleLogout}
      />

      {/* Global Notification Banner */}
      {systemNotification && (
        <div
          className={`max-w-6xl mx-auto px-4 mt-4 w-full animate-in fade-in duration-200`}
        >
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
              systemNotification.type === 'success'
                ? 'bg-teal-50 border-teal-200 text-teal-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {systemNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{systemNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSystemNotification(null)}
              className="text-xs underline font-semibold ml-3 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Page View with smooth transition */}
      <main className="flex-1 transition-all duration-300">
        {currentPage === 'auth' && (
          <AuthPage onAuthSuccess={handleAuthSuccess} />
        )}

        {currentPage === 'profile-setup' && currentUser && (
          <ProfileSetupPage
            user={currentUser}
            onComplete={handleProfileComplete}
          />
        )}

        {currentPage === 'dashboard' && currentUser && (
          <DashboardPage
            key={refreshKey}
            user={currentUser}
            onOpenEditBudget={() => setIsEditBudgetOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* ONE Single Shared Edit Budget Modal */}
      {currentUser && (
        <BudgetModal
          isOpen={isEditBudgetOpen}
          onClose={() => setIsEditBudgetOpen(false)}
          user={currentUser}
          onSave={(updated) => {
            saveUser(updated);
            handleUserUpdate(updated);
          }}
        />
      )}

      {/* Import Backup Confirmation Modal */}
      <ImportBackupModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setPendingBackup(null);
        }}
        backupData={pendingBackup}
        onConfirm={handleConfirmImport}
      />

      {/* Hidden file input for footer import trigger */}
      <input
        ref={footerFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportBackupFile(file);
          if (e.target) e.target.value = '';
        }}
        className="hidden"
        aria-label="Footer Import JSON backup"
      />

      {/* Footer (ZIP link removed, backup options and footer text preserved) */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Monthly Expense Tracker · Private local budget management</span>
          
          <div className="flex items-center gap-3">
            {currentUser && (
              <>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
                  title="Export complete JSON backup of your data"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export backup</span>
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => footerFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
                  title="Restore your data from a JSON backup file"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import backup</span>
                </button>
                <span>·</span>
              </>
            )}
            <span>Powered by Firebase Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
