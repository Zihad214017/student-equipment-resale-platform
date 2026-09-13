import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, DollarSign, MapPin } from 'lucide-react';
import { transactionApi } from '../../api/transactionApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const SellerTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mark as Sold Modal State
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [meetingLocation, setMeetingLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingSold, setSubmittingSold] = useState(false);

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

      const res = await transactionApi.getSellerTransactions(params);
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
      console.error('Failed to load seller transactions:', err);
      setError(err?.message || 'Failed to load sales history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(pagination.currentPage, statusFilter);
  }, [pagination.currentPage, statusFilter, fetchTransactions]);

  const handleOpenMarkSold = (tx) => {
    setSelectedTx(tx);
    setMeetingLocation(tx.meeting_location || '');
    setNotes(tx.notes || '');
    setSoldModalOpen(true);
  };

  const handleSoldSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    setSubmittingSold(true);
    try {
      await transactionApi.updateStatus(selectedTx.id, {
        status: 'sold',
        meeting_location: meetingLocation.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSoldModalOpen(false);
      fetchTransactions(pagination.currentPage, statusFilter);
      alert('Transaction updated to Sold. The buyer will confirm delivery receipt.');
    } catch (err) {
      alert(err?.message || 'Failed to update transaction status.');
    } finally {
      setSubmittingSold(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sales & Transactions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your sales lifecycle from offer acceptance to equipment handover
          </p>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {['all', 'accepted', 'sold', 'completed', 'rejected'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setStatusFilter(status);
              setPagination((prev) => ({ ...prev, currentPage: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
              statusFilter === status
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading sales records..." />
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Equipment Details</th>
                    <th className="py-3.5 px-4">Buyer</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Handover Location</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
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
                        <span className="text-[10px] text-slate-400">Date: {formatDate(tx.created_at)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{tx.buyer_name || 'Buyer'}</span>
                        <span className="block text-[10px] text-slate-400">{tx.buyer_department}</span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {formatCurrency(tx.final_price || tx.proposed_price)}
                        {tx.payment_status === 'SUCCESS' ? (
                          <span className="block mt-1 text-[10px] font-bold text-emerald-700">
                            ✓ Paid via {tx.payment_method}
                          </span>
                        ) : tx.status === 'accepted' ? (
                          <span className="block mt-1 text-[10px] font-medium text-amber-600">
                            Payment Pending
                          </span>
                        ) : null}
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
                          <span className="text-slate-400">Not specified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {tx.status === 'accepted' ? (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleOpenMarkSold(tx)}
                            icon={DollarSign}
                          >
                            Mark as Sold
                          </Button>
                        ) : tx.status === 'sold' ? (
                          <span className="text-[11px] font-medium text-amber-600">
                            Awaiting buyer receipt
                          </span>
                        ) : tx.status === 'completed' ? (
                          <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 capitalize">{tx.status}</span>
                        )}
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
            title="No sales transactions found"
            description="Accepted purchase offers will appear here for handover and status tracking."
          />
        )}
      </div>

      {/* Mark Sold Modal */}
      <Modal
        isOpen={soldModalOpen}
        onClose={() => setSoldModalOpen(false)}
        title="Confirm Equipment Handover & Sale"
      >
        {selectedTx && (
          <form onSubmit={handleSoldSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{selectedTx.equipment_title}</p>
              <p className="text-slate-500">Buyer: {selectedTx.buyer_name}</p>
              <p className="text-slate-900 font-extrabold text-sm">
                Agreed Price: {formatCurrency(selectedTx.final_price || selectedTx.proposed_price)}
              </p>
            </div>

            <p className="text-slate-600">
              Marking this item as <strong>Sold</strong> indicates you have met with the student and handed over the equipment.
            </p>

            <Input
              label="Campus Handover Location (Optional)"
              placeholder="e.g. Student Union Lobby or Engineering Quad"
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
            />

            <Input
              as="textarea"
              label="Transaction Notes (Optional)"
              rows={2}
              placeholder="e.g. Payment received in full, extra cables provided."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSoldModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingSold}
                icon={CheckCircle}
              >
                Confirm Sale
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default SellerTransactionsPage;
