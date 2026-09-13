import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Inbox,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { requestApi } from '../../api/requestApi';
import { transactionApi } from '../../api/transactionApi';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const BuyerDashboardPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBuyerData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reqRes, txRes] = await Promise.all([
          requestApi.getBuyerRequests({ limit: 5 }),
          transactionApi.getBuyerTransactions({ limit: 5 }),
        ]);

        if (reqRes && reqRes.data) setRequests(reqRes.data);
        if (txRes && txRes.data) setTransactions(txRes.data);
      } catch (err) {
        console.error('Failed to load buyer dashboard data:', err);
        setError(err?.message || 'Failed to load buyer dashboard information.');
      } finally {
        setLoading(false);
      }
    };

    loadBuyerData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading buyer dashboard..." />;
  }

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;
  const activeTransactionsCount = transactions.filter((t) => t.status === 'accepted' || t.status === 'sold').length;
  const completedTransactionsCount = transactions.filter((t) => t.status === 'completed').length;
  const unpaidCount = transactions.filter((t) => t.status === 'accepted' && t.payment_status !== 'SUCCESS').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Buyer Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-md">
            Track your equipment purchase offers, mobile wallet payments, and transaction handovers.
          </p>
        </div>

        <Link to="/equipment">
          <Button variant="secondary" icon={ShoppingBag} size="md">
            Browse Equipment
          </Button>
        </Link>
      </div>

      {unpaidCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-indigo-500/10 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Payment Required for Accepted Offer{unpaidCount > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-slate-600">
                You have {unpaidCount} accepted request{unpaidCount > 1 ? 's' : ''} awaiting payment. Pay via bKash or Nagad to secure the equipment.
              </p>
            </div>
          </div>
          <Link to="/buyer/transactions">
            <Button size="sm" variant="primary" className="shrink-0 bg-indigo-600 hover:bg-indigo-700">
              Pay Now →
            </Button>
          </Link>
        </div>
      )}

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Offers</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{pendingRequestsCount}</p>
            <Link to="/buyer/requests" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-block">
              View offers →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deals</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeTransactionsCount}</p>
            <Link to="/buyer/transactions" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-block">
              View meetups →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchases Completed</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{completedTransactionsCount}</p>
            <span className="text-xs text-emerald-600 font-semibold mt-2 inline-block">
              Verified Deals
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Sent Purchase Requests */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Purchase Requests</h2>
            <p className="text-xs text-slate-500">Your latest offers submitted to equipment sellers</p>
          </div>
          <Link to="/buyer/requests" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            View All ({requests.length}) →
          </Link>
        </div>

        {requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-3">Equipment</th>
                  <th className="py-3 px-3">Seller</th>
                  <th className="py-3 px-3">Offer Price</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <Link to={`/equipment/${req.equipment_id}`} className="hover:text-indigo-600 truncate block max-w-[200px]">
                        {req.equipment_title || 'Equipment Listing'}
                      </Link>
                    </td>
                    <td className="py-3 px-3">{req.seller_name || 'Seller'}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{formatCurrency(req.proposed_price)}</td>
                    <td className="py-3 px-3">
                      <Badge type="status" value={req.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-400">{formatDate(req.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            You haven't submitted any purchase requests yet.{' '}
            <Link to="/equipment" className="text-indigo-600 font-semibold hover:underline">
              Browse equipment catalog
            </Link>
          </div>
        )}
      </div>

      {/* Ongoing Active Transactions */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active Campus Transactions</h2>
            <p className="text-xs text-slate-500">Coordinate handovers with sellers</p>
          </div>
          <Link to="/buyer/transactions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            Transaction History →
          </Link>
        </div>

        {transactions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {tx.equipment_title || 'Equipment Purchase'}
                    </h4>
                    <p className="text-[11px] text-slate-500">Seller: {tx.seller_name || 'Seller'}</p>
                  </div>
                  <Badge type="status" value={tx.status} size="sm" />
                </div>

                <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Agreed Price:</span>
                  <strong className="text-slate-900 font-bold">{formatCurrency(tx.final_price || tx.proposed_price)}</strong>
                </div>

                {tx.meeting_location && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded-lg font-medium">
                    📍 Meeting: {tx.meeting_location}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No transactions currently active.
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboardPage;
