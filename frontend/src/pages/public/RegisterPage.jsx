import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  IdCard,
  Building,
  Phone,
  UserPlus,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorAlert from '../../components/common/ErrorAlert';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
  });

  const [intent, setIntent] = useState('buyer'); // 'buyer' | 'seller'
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
    if (fieldErrors.length) setFieldErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.student_id || !formData.full_name || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors([]);

    try {
      await register({
        student_id: formData.student_id.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        department: formData.department.trim() || undefined,
      });

      if (intent === 'seller') {
        navigate('/seller/dashboard');
      } else {
        navigate('/buyer/dashboard');
      }
    } catch (err) {
      setError(err?.message || 'Registration failed. Please check your information.');
      if (err?.errors) setFieldErrors(err.errors);
    } finally {
      setLoading(false);
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
          Create Student Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Join the campus equipment exchange to buy, sell, and request gear
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <ErrorAlert
            message={error}
            errors={fieldErrors}
            onDismiss={() => {
              setError(null);
              setFieldErrors([]);
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Primary Goal Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Primary Initial Goal:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIntent('buyer')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    intent === 'buyer'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Looking to Buy
                </button>
                <button
                  type="button"
                  onClick={() => setIntent('seller')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    intent === 'seller'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Looking to Sell
                </button>
              </div>
            </div>

            <Input
              label="Student ID"
              name="student_id"
              placeholder="e.g. STU-2024-001"
              icon={IdCard}
              required
              value={formData.student_id}
              onChange={handleChange}
            />

            <Input
              label="Full Name"
              name="full_name"
              placeholder="e.g. Sarah Jenkins"
              icon={User}
              required
              value={formData.full_name}
              onChange={handleChange}
            />

            <Input
              label="University Email"
              name="email"
              type="email"
              placeholder="e.g. sarah.jenkins@university.edu"
              icon={Mail}
              required
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              label="Department / Major"
              name="department"
              placeholder="e.g. Computer Science"
              icon={Building}
              value={formData.department}
              onChange={handleChange}
            />

            <Input
              label="Phone Number (Optional)"
              name="phone"
              type="tel"
              placeholder="e.g. +1 (555) 123-4567"
              icon={Phone}
              value={formData.phone}
              onChange={handleChange}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              icon={Lock}
              required
              value={formData.password}
              onChange={handleChange}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon={UserPlus}
              className="w-full mt-2"
            >
              Complete Registration
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
