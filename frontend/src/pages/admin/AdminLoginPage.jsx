import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Mail, Lock, LogIn, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorAlert from '../../components/common/ErrorAlert';

const AdminLoginPage = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
    if (fieldErrors.length) setFieldErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please provide both administrator email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors([]);

    try {
      const result = await login(formData.email.trim(), formData.password);
      if (result && result.user) {
        if (result.user.role !== 'admin') {
          // Non-admin attempting to access administrator console
          await logout();
          setError('Access Denied: This console is strictly reserved for authorized platform administrators.');
          return;
        }
        navigate(from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please verify administrator credentials.');
      if (err?.errors) setFieldErrors(err.errors);
    } finally {
      setLoading(false);
    }
  };

  const setAdminDemoCredentials = () => {
    setFormData({
      email: 'admin@university.edu',
      password: 'Password123!',
    });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Bar / Back to Marketplace */}
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-amber-400 shadow-xl shadow-amber-500/10 mb-4">
          <ShieldAlert className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Administrator Console
        </h2>
        <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto">
          Authorized Campus Staff & Platform Moderation Gateway
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold block text-amber-200">Restricted Administrative Area</strong>
              Unauthorized access attempts are logged with student IDs, IP addresses, and timestamps.
            </div>
          </div>

          <ErrorAlert
            message={error}
            errors={fieldErrors}
            onDismiss={() => {
              setError(null);
              setFieldErrors([]);
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Master Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating Admin...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate & Enter Console</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={setAdminDemoCredentials}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-800 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 transition-colors flex items-center justify-center gap-2"
            >
              <span>🔑 Auto-Fill Admin Credentials (Demo)</span>
            </button>
          </div>

          <div className="text-center text-xs text-slate-500 pt-1">
            Standard student user?{' '}
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Student Sign In Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
