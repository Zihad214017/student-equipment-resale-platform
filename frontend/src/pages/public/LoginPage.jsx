import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { GraduationCap, Mail, Lock, LogIn, Info, ShieldCheck, ShoppingBag, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorAlert from '../../components/common/ErrorAlert';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preferredPortal, setPreferredPortal] = useState('buyer'); // 'buyer' | 'seller'

  const isExpired = searchParams.get('expired') === 'true';
  const from = location.state?.from?.pathname;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
    if (fieldErrors.length) setFieldErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both your university email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors([]);

    try {
      const result = await login(formData.email.trim(), formData.password);
      if (result && result.user) {
        if (result.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (from) {
          navigate(from);
        } else if (preferredPortal === 'seller') {
          navigate('/seller/dashboard');
        } else {
          navigate('/buyer/dashboard');
        }
      }
    } catch (err) {
      setError(err?.message || 'Login failed. Please verify your university credentials.');
      if (err?.errors) setFieldErrors(err.errors);
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role) => {
    if (role === 'buyer') {
      setPreferredPortal('buyer');
      setFormData({
        email: 'buyer.sarah@university.edu',
        password: 'Password123!',
      });
    } else if (role === 'seller') {
      setPreferredPortal('seller');
      setFormData({
        email: 'seller.alex@university.edu',
        password: 'Password123!',
      });
    } else if (role === 'admin') {
      setFormData({
        email: 'admin@university.edu',
        password: 'Password123!',
      });
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <GraduationCap className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign In to CampusEquip
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Access your student equipment requests, listings, and transactions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {isExpired && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Your session has expired. Please sign in again to continue.</span>
            </div>
          )}

          <ErrorAlert
            message={error}
            errors={fieldErrors}
            onDismiss={() => {
              setError(null);
              setFieldErrors([]);
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="University Email"
              name="email"
              type="email"
              placeholder="e.g. student@university.edu"
              icon={Mail}
              required
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              required
              value={formData.password}
              onChange={handleChange}
            />

            {/* Target Portal Mode Selector for Students */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Dashboard on Sign In:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreferredPortal('buyer')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    preferredPortal === 'buyer'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Buyer Hub
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredPortal('seller')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    preferredPortal === 'seller'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Seller Hub
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon={LogIn}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Credentials Panel */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
              Quick One-Click Demo Credentials
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setDemoCredentials('buyer')}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors text-center"
              >
                🛍️ Buyer
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('seller')}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors text-center"
              >
                📦 Seller
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('admin')}
                className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-colors text-center"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100 space-y-2">
            <div>
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Create Student Account
              </Link>
            </div>
            <div className="pt-1">
              <Link to="/admin/login" className="text-[11px] font-medium text-slate-400 hover:text-amber-600 transition-colors inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>University Staff & Admin Console</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
