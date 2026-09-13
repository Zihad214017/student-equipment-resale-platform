import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Eye,
  TrendingUp,
  DollarSign,
  Filter,
} from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Detail Modal
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (methodFilter !== 'all') params.method = methodFilter;
      if (search.trim()) params.search = search.trim();

      const [paymentsRes, statsRes] = await Promise.all([
        paymentApi.adminGetAllPayments(params),
        paymentApi.adminGetPaymentStats(),
      ]);

      if (paymentsRes && paymentsRes.data) {
        setPayments(paymentsRes.data);
        if (paymentsRes.meta) {
          setPagination({
            currentPage: paymentsRes.meta.currentPage,
            totalPages: paymentsRes.meta.totalPages,
            totalItems: paymentsRes.meta.totalItems,
          });
        }
      }

      if (statsRes && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin payments data:', err);
      setError(err?.message || 'Failed to load platform payment monitoring data.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, search]);

  useEffect(() => {
    loadData(pagination.currentPage);
  }, [loadData, pagination.currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    loadData(1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <XCircle className="w-3 h-3" /> FAILED
          </span>
        );
      case 'INITIATED':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Payment Monitoring & Audits</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor real-time bKash and Nagad payment gateway settlements, volumes, and audit logs
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* 1. Metric Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Settled Volume
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(stats.total_volume)}
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                {stats.successful_payments} transactions
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600">
                bKash Volume
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">
                {stats.breakdown?.bkash?.count || 0} Paid
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(stats.breakdown?.bkash?.volume || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                Nagad Volume
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                {stats.breakdown?.nagad?.count || 0} Paid
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(stats.breakdown?.nagad?.volume || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Settlement Rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {stats.success_rate_percent}%
              </span>
              <span className="text-xs text-slate-400">
                ({stats.total_payments} attempts)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by equipment, student, or TrxID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPagination((prev) => ({ ...prev, currentPage: 1 }));
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Methods</option>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, currentPage: 1 }));
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="INITIATED">Initiated / Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* 3. Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading platform payment records..." />
          </div>
        ) : payments.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Equipment & Date</th>
                    <th className="py-3.5 px-4">Buyer / Payer</th>
                    <th className="py-3.5 px-4">Seller / Payee</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Gateway</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Provider TrxID</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 truncate block max-w-[180px]">
                          {p.equipment_title || 'Equipment Item'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(p.created_at)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{p.buyer_name}</span>
                        <span className="block text-[10px] text-slate-400">{p.buyer_email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{p.seller_name}</span>
                        <span className="block text-[10px] text-slate-400">{p.seller_email}</span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            p.payment_method === 'BKASH'
                              ? 'bg-pink-50 text-pink-700 border border-pink-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}
                        >
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(p.payment_status)}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        {p.provider_transaction_id || (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(p)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Payment Audit Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-100">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="No payment records found"
            description="No payments match your selected search or filter criteria."
          />
        )}
      </div>

      {/* Payment Detail Modal */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Payment Audit Details"
      >
        {selectedPayment && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Equipment</span>
                  <h4 className="font-bold text-sm text-slate-900">
                    {selectedPayment.equipment_title}
                  </h4>
                </div>
                {getStatusBadge(selectedPayment.payment_status)}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-black text-sm text-slate-900">
                  {formatCurrency(selectedPayment.amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Buyer (Payer)</span>
                <strong className="text-slate-800">{selectedPayment.buyer_name}</strong>
                <span className="block text-[10px] text-slate-500">{selectedPayment.buyer_email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Seller (Payee)</span>
                <strong className="text-slate-800">{selectedPayment.seller_name}</strong>
                <span className="block text-[10px] text-slate-500">{selectedPayment.seller_email}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Provider Method:</span>
                <strong className="text-slate-800">{selectedPayment.payment_method}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Provider TrxID:</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedPayment.provider_transaction_id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway Reference:</span>
                <span className="font-mono text-slate-700">
                  {selectedPayment.provider_reference || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Initiated At:</span>
                <span className="text-slate-700">{formatDate(selectedPayment.created_at)}</span>
              </div>
              {selectedPayment.paid_at && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Paid At:</span>
                  <span className="text-emerald-700 font-medium">
                    {formatDate(selectedPayment.paid_at)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedPayment(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPaymentsPage;
