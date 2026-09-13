import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Inbox,
  Clock,
  DollarSign,
  Star,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.getReports();
        if (res && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load admin statistics:', err);
        setError(err?.message || 'Failed to load platform reports.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage message="Loading platform analytics & dashboard..." />;
  }

  const { users, equipment, purchase_requests, transactions, reviews, recent_activity } = stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <ShieldCheck className="w-4 h-4" /> Platform Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">
            Administrator Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
            Monitor campus marketplace health, verify equipment listings, and track platform metrics.
          </p>
        </div>

        <Link to="/admin/reports">
          <Button variant="secondary" icon={TrendingUp} size="md">
            View Deep Analytics
          </Button>
        </Link>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Platform Summary - All 8 Required KPI Metrics */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Platform KPI Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Users */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{users?.total_users || 0}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {users?.total_active_users || 0} active accounts
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* 2. Buyers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Buyers</p>
              <p className="text-2xl font-black text-indigo-600 mt-0.5">{users?.total_buyers || 0}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Student buyers
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* 3. Sellers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sellers</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{users?.total_sellers || 0}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Active equipment sellers
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* 4. Equipment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Equipment</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{equipment?.total_equipment || 0}</p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                {equipment?.available_equipment || 0} available for sale
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* 5. Purchase Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purchase Requests</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{purchase_requests?.total_purchase_requests || 0}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {purchase_requests?.accepted_requests || 0} accepted offers
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Inbox className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* 6. Pending Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Requests</p>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{purchase_requests?.pending_requests || 0}</p>
              <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                Awaiting seller response
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* 7. Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Transactions</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{transactions?.total_transactions || 0}</p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {formatCurrency(transactions?.total_volume_amount || 0)} volume
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* 8. Completed Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed Transactions</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{transactions?.completed_transactions || 0}</p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                100% verified delivered
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Admin Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/admin/users"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">User Management</h4>
          <p className="text-[10px] text-slate-400">View & toggle accounts</p>
        </Link>

        <Link
          to="/admin/equipment"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Package className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Moderation Hub</h4>
          <p className="text-[10px] text-slate-400">Approve & verify listings</p>
        </Link>

        <Link
          to="/admin/categories"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Inbox className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Categories</h4>
          <p className="text-[10px] text-slate-400">Create & manage tags</p>
        </Link>

        <Link
          to="/admin/transactions"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Transactions</h4>
          <p className="text-[10px] text-slate-400">Audit all campus trades</p>
        </Link>
      </div>

      {/* Payment Gateway Monitoring Quick Banner */}
      <Link
        to="/admin/payments"
        className="block p-5 rounded-3xl bg-gradient-to-r from-pink-500/10 via-orange-500/10 to-indigo-500/10 border border-pink-200 hover:border-pink-300 hover:shadow-md transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-pink-200 flex items-center justify-center text-pink-600 shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Mobile Payment Monitoring (bKash & Nagad)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Monitor live student gateway settlements, TrxID verifications, and method breakdown.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 shrink-0">
            Open Payment Console <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </Link>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recent Campus Trades</h3>
            <Link to="/admin/transactions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>

          {recent_activity?.transactions?.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {recent_activity.transactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{tx.equipment_title || 'Equipment'}</p>
                    <p className="text-[11px] text-slate-400">
                      {tx.buyer_name} ↔ {tx.seller_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 block">{formatCurrency(tx.final_price)}</span>
                    <Badge type="status" value={tx.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No recent transactions.</p>
          )}
        </div>

        {/* Recent Student Registrations */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recent Student Registrations</h3>
            <Link to="/admin/users" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>

          {recent_activity?.registrations?.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {recent_activity.registrations.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{u.full_name}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold text-indigo-600 block">{u.department || 'Student'}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(u.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No recent student registrations.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
