import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Eye, XCircle, ShoppingBag, AlertCircle } from 'lucide-react';
import { requestApi } from '../../api/requestApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const BuyerRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchRequests = useCallback(async (page = 1, status = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (status !== 'all') params.status = status;

      const res = await requestApi.getBuyerRequests(params);
      if (res && res.data) {
        setRequests(res.data);
        if (res.meta) {
          setPagination({
            currentPage: res.meta.currentPage,
            totalPages: res.meta.totalPages,
            totalItems: res.meta.totalItems,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch purchase requests:', err);
      setError(err?.message || 'Failed to load purchase requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(pagination.currentPage, statusFilter);
  }, [pagination.currentPage, statusFilter, fetchRequests]);

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this purchase request?')) return;
    setCancellingId(id);
    try {
      await requestApi.cancelRequest(id);
      fetchRequests(pagination.currentPage, statusFilter);
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch (err) {
      alert(err?.message || 'Failed to cancel request.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Purchase Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your outgoing equipment purchase offers and track seller approvals
          </p>
        </div>

        <Link to="/equipment">
          <Button variant="primary" icon={ShoppingBag} size="sm">
            Browse More Equipment
          </Button>
        </Link>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {['all', 'pending', 'accepted', 'rejected', 'cancelled'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => handleStatusFilterChange(status)}
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

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading your purchase requests..." />
          </div>
        ) : requests.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Equipment Title</th>
                    <th className="py-3.5 px-4">Seller</th>
                    <th className="py-3.5 px-4">Proposed Offer</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date Submitted</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          to={`/equipment/${req.equipment_id}`}
                          className="hover:text-indigo-600 truncate block max-w-[220px]"
                        >
                          {req.equipment_title || 'Equipment Item'}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">{req.seller_name || 'Seller'}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(req.proposed_price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge type="status" value={req.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(req.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(req)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Request Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(req.id)}
                              disabled={cancellingId === req.id}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                              title="Cancel Offer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
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
            icon={Inbox}
            title="No purchase requests found"
            description={
              statusFilter === 'all'
                ? "You haven't submitted any offers on equipment yet."
                : `No purchase requests with status "${statusFilter}".`
            }
            actionText="Browse Available Equipment"
            onAction={() => (window.location.href = '/equipment')}
          />
        )}
      </div>

      {/* View Request Details Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Purchase Request Details"
      >
        {selectedRequest && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {selectedRequest.equipment_title}
                  </h4>
                  <p className="text-slate-500">Seller: {selectedRequest.seller_name}</p>
                </div>
                <Badge type="status" value={selectedRequest.status} />
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
                <span className="text-slate-500">Proposed Offer:</span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatCurrency(selectedRequest.proposed_price)}
                </span>
              </div>
            </div>

            {selectedRequest.message && (
              <div>
                <span className="block font-semibold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Your Note to Seller:
                </span>
                <p className="p-3 rounded-xl bg-slate-50 text-slate-700 italic">
                  "{selectedRequest.message}"
                </p>
              </div>
            )}

            {selectedRequest.response_note && (
              <div>
                <span className="block font-semibold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Seller Response:
                </span>
                <p className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium">
                  "{selectedRequest.response_note}"
                </p>
              </div>
            )}

            <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Submitted: {formatDate(selectedRequest.created_at)}</span>
              {selectedRequest.status === 'pending' && (
                <Button
                  size="xs"
                  variant="danger"
                  onClick={() => handleCancelRequest(selectedRequest.id)}
                  loading={cancellingId === selectedRequest.id}
                >
                  Cancel Offer
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BuyerRequestsPage;
