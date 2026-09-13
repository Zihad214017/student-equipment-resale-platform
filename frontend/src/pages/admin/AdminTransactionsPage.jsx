import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, ShieldCheck, MapPin, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AdminTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Status Override Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [newStatus, setNewStatus] = useState('completed');
  const [adminNote, setAdminNote] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingTx, setViewingTx] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchTransactions = useCallback(async (page = 1, status = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (status !== 'all') params.status = status;
      if (search.trim()) params.search = search.trim();

      const res = await adminApi.getTransactions(params);
      if (res && res.data) {
        setTransactions(res.data);
        if (res.meta) {
          setPagination({
            currentPage: res.meta.currentPage,
            totalPages: res.meta.totalPages,
            totalItems: res.meta.totalItems,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load admin transactions:', err);
      setError(err?.message || 'Failed to load transaction records.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTransactions(pagination.currentPage, statusFilter);
  }, [pagination.currentPage, statusFilter, fetchTransactions]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchTransactions(1, statusFilter);
  };

  const handleOpenDetails = (tx) => {
    setViewingTx(tx);
    setDetailsModalOpen(true);
  };

  const handleOpenOverride = (tx) => {
    setSelectedTx(tx);
    setNewStatus(tx.status);
    setAdminNote('');
    setOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    setSubmittingOverride(true);
    try {
      await adminApi.updateTransactionStatus(selectedTx.id, {
        status: newStatus,
        notes: adminNote.trim() ? `[Admin Override]: ${adminNote.trim()}` : undefined,
      });

      setOverrideModalOpen(false);
      setActionSuccess(`Transaction status updated to "${newStatus}".`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchTransactions(pagination.currentPage, statusFilter);
    } catch (err) {
      setError(err?.message || 'Failed to update transaction status.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Transaction Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit campus equipment trades, inspect buyer-seller pairings, and manage transaction states
          </p>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search equipment, buyer, seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </form>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['all', 'accepted', 'sold', 'completed', 'rejected', 'pending'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setStatusFilter(status);
                setPagination((prev) => ({ ...prev, currentPage: 1 }));
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading all platform transactions..." />
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Equipment Item</th>
                    <th className="py-3.5 px-4">Buyer ↔ Seller</th>
                    <th className="py-3.5 px-4">Agreed Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Handover Spot</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          to={`/equipment/${tx.equipment_id}`}
                          className="hover:text-indigo-600 truncate block max-w-[200px]"
                        >
                          {tx.equipment_title || 'Equipment Item'}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          Buyer: {tx.buyer_name || 'Student Buyer'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Seller: {tx.seller_name || 'Student Seller'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {formatCurrency(tx.final_price || tx.proposed_price || tx.agreed_price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge type="status" value={tx.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {tx.meeting_location ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            <MapPin className="w-3 h-3" /> {tx.meeting_location}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not recorded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(tx.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(tx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenOverride(tx)}
                          >
                            Override
                          </Button>
                        </div>
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
            icon={Clock}
            title="No transactions found"
            description="No transaction records match the selected status filter or search query."
          />
        )}
      </div>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Transaction Record Audit Details"
      >
        {viewingTx && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">{viewingTx.equipment_title}</h3>
                <span className="font-black text-indigo-600 text-sm">
                  {formatCurrency(viewingTx.final_price || viewingTx.proposed_price || viewingTx.agreed_price)}
                </span>
              </div>
              <div className="pt-2 grid grid-cols-2 gap-2 text-slate-700 border-t border-slate-200/60">
                <div><strong>Buyer:</strong> {viewingTx.buyer_name} ({viewingTx.buyer_department || 'Student'})</div>
                <div><strong>Seller:</strong> {viewingTx.seller_name} ({viewingTx.seller_department || 'Student'})</div>
                <div><strong>Current Status:</strong> <Badge type="status" value={viewingTx.status} size="sm" /></div>
                <div><strong>Handover Spot:</strong> {viewingTx.meeting_location || 'Not specified'}</div>
                <div className="col-span-2"><strong>Transaction ID:</strong> <span className="font-mono text-slate-500">{viewingTx.id}</span></div>
                <div className="col-span-2"><strong>Initiated:</strong> {formatDate(viewingTx.created_at)}</div>
              </div>
              {viewingTx.notes && (
                <div className="pt-2 border-t border-slate-200/60">
                  <strong className="block text-slate-500 mb-1">Notes / Instructions:</strong>
                  <p className="bg-white p-2.5 rounded-xl border border-slate-200 italic">{viewingTx.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Override Status Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Administrative Transaction Override"
      >
        {selectedTx && (
          <form onSubmit={handleOverrideSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{selectedTx.equipment_title}</p>
              <p className="text-slate-500">
                Buyer: {selectedTx.buyer_name} · Seller: {selectedTx.seller_name}
              </p>
              <p className="text-slate-900 font-extrabold text-sm">
                Amount: {formatCurrency(selectedTx.final_price || selectedTx.proposed_price || selectedTx.agreed_price)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Set Transaction Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white text-slate-900"
              >
                <option value="accepted">Accepted (Reserved)</option>
                <option value="sold">Sold (Handed Over)</option>
                <option value="completed">Completed (Verified)</option>
                <option value="rejected">Rejected (Cancelled)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOverrideModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingOverride}
              >
                Apply Override
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminTransactionsPage;
