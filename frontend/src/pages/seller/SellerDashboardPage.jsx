import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  Inbox,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { equipmentApi } from '../../api/equipmentApi';
import { requestApi } from '../../api/requestApi';
import { transactionApi } from '../../api/transactionApi';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate } from '../../utils/formatters';

const SellerDashboardPage = () => {
  const { user } = useAuth();

  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick Accept/Reject Modal State
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [respondAction, setRespondAction] = useState('accepted');
  const [responseNote, setResponseNote] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const loadSellerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listingsRes, reqRes, txRes] = await Promise.all([
        equipmentApi.getMyListings({ limit: 5 }),
        requestApi.getSellerRequests({ limit: 5 }),
        transactionApi.getSellerTransactions({ limit: 5 }),
      ]);

      if (listingsRes && listingsRes.data) setListings(listingsRes.data);
      if (reqRes && reqRes.data) setRequests(reqRes.data);
      if (txRes && txRes.data) setTransactions(txRes.data);
    } catch (err) {
      console.error('Failed to load seller dashboard:', err);
      setError(err?.message || 'Failed to load seller information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  const handleOpenRespondModal = (req, action) => {
    setActiveRequest(req);
    setRespondAction(action);
    setResponseNote('');
    setRespondModalOpen(true);
  };

  const handleRespondSubmit = async (e) => {
    e.preventDefault();
    if (!activeRequest) return;

    setSubmittingResponse(true);
    try {
      await requestApi.respondRequest(activeRequest.id, {
        status: respondAction,
        response_note: responseNote.trim() || undefined,
      });

      setRespondModalOpen(false);
      loadSellerData();
      alert(`Purchase request ${respondAction} successfully.`);
    } catch (err) {
      alert(err?.message || 'Failed to respond to request.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading seller hub..." />;
  }

  const activeListingsCount = listings.filter((l) => l.status === 'available').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;
  const totalSalesRevenue = transactions
    .filter((t) => t.status === 'sold' || t.status === 'completed')
    .reduce((acc, t) => acc + Number(t.final_price || t.proposed_price || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Seller Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Seller Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
            Manage your equipment inventory, respond to buyer offers, and track campus sales revenue.
          </p>
        </div>

        <Link to="/seller/equipment/new">
          <Button variant="primary" icon={PlusCircle} size="md">
            Add Equipment Listing
          </Button>
        </Link>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Seller Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Inventory</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeListingsCount}</p>
            <Link to="/seller/listings" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-block">
              Manage inventory →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Offers</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{pendingRequestsCount}</p>
            <Link to="/seller/requests" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-block">
              Review requests →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Inbox className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Sales</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalSalesRevenue)}</p>
            <Link to="/seller/transactions" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold mt-2 inline-block">
              Sales history →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Received Purchase Requests */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Incoming Buyer Offers</h2>
            <p className="text-xs text-slate-500">Respond to students requesting your equipment</p>
          </div>
          <Link to="/seller/requests" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            View All ({requests.length}) →
          </Link>
        </div>

        {requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-3">Equipment</th>
                  <th className="py-3 px-3">Buyer</th>
                  <th className="py-3 px-3">Proposed Price</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <span className="truncate block max-w-[200px]">
                        {req.equipment_title || 'Equipment Item'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{req.buyer_name || 'Student'}</span>
                      <span className="block text-[10px] text-slate-400">{req.buyer_department}</span>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-slate-900">
                      {formatCurrency(req.proposed_price)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge type="status" value={req.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="success"
                            onClick={() => handleOpenRespondModal(req, 'accepted')}
                            icon={Check}
                          >
                            Accept
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => handleOpenRespondModal(req, 'rejected')}
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
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No incoming purchase requests at this time.
          </div>
        )}
      </div>

      {/* Active Listings Overview */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Equipment Listings</h2>
            <p className="text-xs text-slate-500">Your listed items on the university marketplace</p>
          </div>
          <Link to="/seller/listings" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            Full Inventory →
          </Link>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate flex-1">{item.title}</h4>
                  <Badge type="status" value={item.status} size="sm" />
                </div>
                <div className="flex items-baseline justify-between text-xs pt-1">
                  <span className="text-slate-500">Price:</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(item.price)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <Badge type="condition" value={item.condition} size="sm" />
                  <Link
                    to={`/seller/equipment/${item.id}/edit`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            You don't have any equipment listed for sale.{' '}
            <Link to="/seller/equipment/new" className="text-indigo-600 font-semibold hover:underline">
              Create your first listing
            </Link>
          </div>
        )}
      </div>

      {/* Accept / Reject Response Modal */}
      <Modal
        isOpen={respondModalOpen}
        onClose={() => setRespondModalOpen(false)}
        title={respondAction === 'accepted' ? 'Accept Purchase Offer' : 'Reject Purchase Offer'}
      >
        {activeRequest && (
          <form onSubmit={handleRespondSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{activeRequest.equipment_title}</p>
              <p className="text-slate-500">Buyer: {activeRequest.buyer_name}</p>
              <p className="text-slate-900 font-semibold">
                Offered Price: {formatCurrency(activeRequest.proposed_price)}
              </p>
            </div>

            {respondAction === 'accepted' ? (
              <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 font-medium">
                Accepting this request will automatically mark your equipment item as <strong>Reserved</strong> and initiate a transaction record.
              </p>
            ) : (
              <p className="text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-medium">
                Rejecting this request will notify the buyer that their offer was declined.
              </p>
            )}

            <Input
              as="textarea"
              label={respondAction === 'accepted' ? 'Meeting / Handover Preference Note (Optional)' : 'Reason / Note (Optional)'}
              rows={3}
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder={
                respondAction === 'accepted'
                  ? 'e.g. Can meet tomorrow at 3 PM outside Science Hall.'
                  : 'e.g. Price is too low, looking for closer to listed price.'
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
                variant={respondAction === 'accepted' ? 'success' : 'danger'}
                loading={submittingResponse}
              >
                Confirm {respondAction === 'accepted' ? 'Acceptance' : 'Rejection'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default SellerDashboardPage;
