import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Check, X, Eye, Package, MessageSquare } from 'lucide-react';
import { requestApi } from '../../api/requestApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const SellerRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Response Modal State
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [respondStatus, setRespondStatus] = useState('accepted');
  const [responseNote, setResponseNote] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

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

      const res = await requestApi.getSellerRequests(params);
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
      console.error('Failed to load received requests:', err);
      setError(err?.message || 'Failed to load purchase requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(pagination.currentPage, statusFilter);
  }, [pagination.currentPage, statusFilter, fetchRequests]);

  const handleOpenRespond = (req, action) => {
    setSelectedRequest(req);
    setRespondStatus(action);
    setResponseNote('');
    setRespondModalOpen(true);
  };

  const handleRespondSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setSubmittingResponse(true);
    try {
      await requestApi.respondRequest(selectedRequest.id, {
        status: respondStatus,
        response_note: responseNote.trim() || undefined,
      });

      setRespondModalOpen(false);
      fetchRequests(pagination.currentPage, statusFilter);
      alert(`Request has been ${respondStatus}.`);
    } catch (err) {
      alert(err?.message || 'Failed to respond to request.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Received Purchase Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming student offers for your equipment listings and accept deals
          </p>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {['all', 'pending', 'accepted', 'rejected', 'cancelled'].map((status) => (
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

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading incoming requests..." />
          </div>
        ) : requests.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Equipment Title</th>
                    <th className="py-3.5 px-4">Prospective Buyer</th>
                    <th className="py-3.5 px-4">Offer Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          to={`/equipment/${req.equipment_id}`}
                          className="hover:text-indigo-600 truncate block max-w-[200px]"
                        >
                          {req.equipment_title || 'Equipment Item'}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{req.buyer_name || 'Buyer'}</span>
                        <span className="block text-[10px] text-slate-400">{req.buyer_department}</span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {formatCurrency(req.proposed_price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge type="status" value={req.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(req.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => handleOpenRespond(req, 'accepted')}
                              icon={Check}
                            >
                              Accept
                            </Button>
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={() => handleOpenRespond(req, 'rejected')}
                              icon={X}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 capitalize">{req.status}</span>
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
            icon={Inbox}
            title="No requests received"
            description="You haven't received any purchase offers matching this filter."
          />
        )}
      </div>

      {/* Accept / Reject Modal */}
      <Modal
        isOpen={respondModalOpen}
        onClose={() => setRespondModalOpen(false)}
        title={respondStatus === 'accepted' ? 'Accept Purchase Request' : 'Reject Purchase Request'}
      >
        {selectedRequest && (
          <form onSubmit={handleRespondSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{selectedRequest.equipment_title}</p>
              <p className="text-slate-500">Buyer: {selectedRequest.buyer_name} ({selectedRequest.buyer_department || 'Student'})</p>
              <p className="text-slate-900 font-semibold">
                Offered Price: {formatCurrency(selectedRequest.proposed_price)}
              </p>
            </div>

            {selectedRequest.message && (
              <div>
                <span className="block font-semibold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Buyer Note:
                </span>
                <p className="p-3 rounded-xl bg-slate-50 text-slate-700 italic">
                  "{selectedRequest.message}"
                </p>
              </div>
            )}

            <Input
              as="textarea"
              label={respondStatus === 'accepted' ? 'Meeting / Handover Instructions (Optional)' : 'Reason for Rejection (Optional)'}
              rows={3}
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder={
                respondStatus === 'accepted'
                  ? 'e.g. Let us meet tomorrow at 4 PM in front of the Computer Lab.'
                  : 'e.g. Sorry, price is non-negotiable.'
              }
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRespondModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={respondStatus === 'accepted' ? 'success' : 'danger'}
                loading={submittingResponse}
              >
                Confirm {respondStatus === 'accepted' ? 'Acceptance' : 'Rejection'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default SellerRequestsPage;
