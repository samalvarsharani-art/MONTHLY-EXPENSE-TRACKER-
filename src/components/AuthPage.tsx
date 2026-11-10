import React, { useState } from 'react';
import { User } from '../types';
import {
  findUserByEmail,
  saveUser,
  setActiveSessionUserId,
} from '../services/storage';
import { loginWithGoogle } from '../services/firebase';
import {
  Wallet,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Cloud,
} from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Loading & error states
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Email format validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      saveUser(user);
      setActiveSessionUserId(user.id);
      setSuccessMsg(`Welcome, ${user.name}! Connected with Firebase.`);
      setTimeout(() => {
        onAuthSuccess(user);
      }, 300);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed. Please try again.');
      } else {
        setErrorMsg(err?.message || 'Could not sign in with Google. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrimmed = loginEmail.trim();

    if (!emailTrimmed) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com).');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const existingUser = findUserByEmail(emailTrimmed);
    if (!existingUser) {
      setErrorMsg('No account found with this email. Would you like to Sign Up?');
      return;
    }

    if (existingUser.password !== loginPassword) {
      setErrorMsg('Incorrect password. Please verify and try again.');
      return;
    }

    // Success
    setActiveSessionUserId(existingUser.id);
    onAuthSuccess(existingUser);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nameTrimmed = signupName.trim();
    const emailTrimmed = signupEmail.trim();

    if (!nameTrimmed) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!emailTrimmed) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com).');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match. Please check again.');
      return;
    }

    // Check if email already registered
    const existing = findUserByEmail(emailTrimmed);
    if (existing) {
      setErrorMsg('An account with this email already exists. Please log in.');
      return;
    }

    // Create new user (profileCompleted: false)
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      name: nameTrimmed,
      email: emailTrimmed,
      password: signupPassword,
      monthlyBudget: 0,
      currency: 'INR',
      profileCompleted: false,
      createdAt: new Date().toISOString(),
    };

    saveUser(newUser);
    setActiveSessionUserId(newUser.id);
    setSuccessMsg('Account created successfully! Preparing your profile...');

    setTimeout(() => {
      onAuthSuccess(newUser);
    }, 400);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50/60">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden">
        
        {/* Left Side: Illustration & Branding Feature Column */}
        <div className="lg:col-span-5 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-teal-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/30 border border-teal-300/30 text-teal-100 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 text-teal-200" />
              <span>Firebase Cloud Backed</span>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-inner">
              <Wallet className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 leading-tight">
              Monthly Expense Tracker
            </h1>
            <p className="text-teal-100 text-sm sm:text-base leading-relaxed">
              Track your spending. Stay within your budget.
            </p>
          </div>

          {/* Calm Visual Feature Card */}
          <div className="relative z-10 my-8 p-5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-teal-100">Monthly Spending Target</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-500/40 text-white">
                On Track
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight mb-2 tabular-nums">
              ₹ 24,800 <span className="text-xs font-normal text-teal-200">/ ₹ 50,000</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden mb-2">
              <div className="h-full bg-teal-300 rounded-full w-[49%]" />
            </div>
            <div className="flex justify-between text-xs text-teal-200">
              <span>Used 49.6%</span>
              <span>₹ 25,200 remaining</span>
            </div>
          </div>

          <div className="relative z-10 space-y-2 text-xs text-teal-100">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-teal-300 shrink-0" />
              <span>Real-time persistence powered by Google Cloud Firestore</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" />
              <span>Secure user data isolation with zero-trust security rules</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-teal-300 shrink-0" />
              <span>Visual progress alerts before budget limits are reached</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Log In & Sign Up Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">

          {/* Google Sign In Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-sm rounded-xl transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative inline-block px-3 bg-white text-xs text-slate-400 font-medium">
                or sign in with email
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
                tab === 'login'
                  ? 'text-teal-700 border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              } flex-1 text-center`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
                tab === 'signup'
                  ? 'text-teal-700 border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              } flex-1 text-center`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'login' ? (
            /* Log In Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-sm rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Log In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-slate-400 font-normal">(min. 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3.5 py-2 pr-10 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-sm rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Profile Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Cloud Storage Notice */}
          <div className="mt-6 p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 text-[11px] text-teal-800 flex items-start gap-2">
            <Cloud className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
            <span>
              <strong>Firebase Cloud Storage:</strong> Data is synchronized directly with your Firebase Firestore cloud database. You can also export or import JSON backup files anytime.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
