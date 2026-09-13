import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Package,
  Inbox,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AdminReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getReports();
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err?.message || 'Failed to generate platform report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage message="Generating platform analytics & reports..." />;
  }

  const { users, equipment, purchase_requests, transactions, reviews, category_breakdown = [] } = stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Platform Analytics & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive platform statistics, inventory turnover, user engagement, and marketplace volume
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadReports}
          >
            Refresh Data
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={() => window.print()}
          >
            Print / Export Report
          </Button>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* 8 Core KPI Summary Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Executive Platform KPIs
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Users</span>
            <strong className="text-2xl font-black text-slate-900 mt-0.5 block">{users?.total_users || 0}</strong>
            <span className="text-[10px] text-slate-400">{users?.total_active_users || 0} active</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Buyers</span>
            <strong className="text-2xl font-black text-indigo-600 mt-0.5 block">{users?.total_buyers || 0}</strong>
            <span className="text-[10px] text-slate-400">Active buyers</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sellers</span>
            <strong className="text-2xl font-black text-slate-900 mt-0.5 block">{users?.total_sellers || 0}</strong>
            <span className="text-[10px] text-slate-400">Active sellers</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Equipment Listed</span>
            <strong className="text-2xl font-black text-emerald-600 mt-0.5 block">{equipment?.total_equipment || 0}</strong>
            <span className="text-[10px] text-emerald-700 font-semibold">{equipment?.available_equipment || 0} available</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Purchase Requests</span>
            <strong className="text-2xl font-black text-slate-900 mt-0.5 block">{purchase_requests?.total_purchase_requests || 0}</strong>
            <span className="text-[10px] text-slate-400">{purchase_requests?.accepted_requests || 0} accepted</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pending Requests</span>
            <strong className="text-2xl font-black text-amber-600 mt-0.5 block">{purchase_requests?.pending_requests || 0}</strong>
            <span className="text-[10px] text-amber-700 font-semibold">Awaiting review</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Transactions</span>
            <strong className="text-2xl font-black text-slate-900 mt-0.5 block">{transactions?.total_transactions || 0}</strong>
            <span className="text-[10px] text-slate-400">{formatCurrency(transactions?.total_volume_amount || 0)}</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Completed Trades</span>
            <strong className="text-2xl font-black text-emerald-600 mt-0.5 block">{transactions?.completed_transactions || 0}</strong>
            <span className="text-[10px] text-emerald-700 font-semibold">100% verified</span>
          </div>
        </div>
      </div>

      {/* Domain Metrics Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. User Demographics Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">User Demographics</h3>
              <p className="text-[11px] text-slate-400">Total verified campus accounts</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Total Registered</span>
              <strong className="text-xl font-black text-slate-900">{users?.total_users || 0}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Active Accounts</span>
              <strong className="text-xl font-black text-emerald-600">{users?.total_active_users || 0}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Student Accounts</span>
              <strong className="text-lg font-bold text-slate-800">{users?.total_students || 0}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Administrator Accounts</span>
              <strong className="text-lg font-bold text-amber-700">{users?.total_admins || 0}</strong>
            </div>
          </div>
        </div>

        {/* 2. Equipment Inventory Status */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Equipment Inventory</h3>
              <p className="text-[11px] text-slate-400">Marketplace listings distribution</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Total Catalog Items</span>
              <strong className="text-xl font-black text-slate-900">{equipment?.total_equipment || 0}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Available for Sale</span>
              <strong className="text-xl font-black text-emerald-600">{equipment?.available_equipment || 0}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Reserved for Deals</span>
              <strong className="text-lg font-bold text-amber-600">{equipment?.reserved_equipment || 0}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Sold & Delivered</span>
              <strong className="text-lg font-bold text-purple-600">{equipment?.sold_equipment || 0}</strong>
            </div>
          </div>
        </div>

        {/* 3. Purchase Request Pipeline */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Purchase Request Pipeline</h3>
              <p className="text-[11px] text-slate-400">Buyer offer funnel states</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block">Total Offers</span>
              <strong className="text-lg font-bold text-slate-900">{purchase_requests?.total_purchase_requests || 0}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 text-center">
              <span className="text-[11px] text-amber-700 block">Pending</span>
              <strong className="text-lg font-bold text-amber-800">{purchase_requests?.pending_requests || 0}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
              <span className="text-[11px] text-emerald-700 block">Accepted</span>
              <strong className="text-lg font-bold text-emerald-800">{purchase_requests?.accepted_requests || 0}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 text-center">
              <span className="text-[11px] text-rose-700 block">Rejected</span>
              <strong className="text-lg font-bold text-rose-800">{purchase_requests?.rejected_requests || 0}</strong>
            </div>
          </div>
        </div>

        {/* 4. Transaction Volume & Completion */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Transaction & Settlement</h3>
              <p className="text-[11px] text-slate-400">Trading volume and verification</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Total Trade Volume</span>
              <strong className="text-xl font-black text-indigo-600">
                {formatCurrency(transactions?.total_volume_amount || 0)}
              </strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Completed Trades</span>
              <strong className="text-xl font-black text-emerald-600">
                {transactions?.completed_transactions || 0}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900">Inventory Distribution by Category</h3>

        <div className="space-y-4">
          {category_breakdown.map((cat) => {
            const count = parseInt(cat.equipment_count || 0, 10);
            const totalEq = parseInt(equipment?.total_equipment || 1, 10);
            const percent = totalEq > 0 ? Math.round((count / totalEq) * 100) : 0;

            return (
              <div key={cat.id} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-800">{cat.name}</span>
                  <span className="text-slate-500">
                    {count} items ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
