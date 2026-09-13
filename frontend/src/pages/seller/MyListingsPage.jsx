import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, PlusCircle, Edit3, Trash2, Power, Eye, AlertCircle } from 'lucide-react';
import { equipmentApi } from '../../api/equipmentApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate, formatCondition } from '../../utils/formatters';
import { resolveImageUrl, DEFAULT_EQUIPMENT_IMAGE } from '../../utils/imageHelper';

const MyListingsPage = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchListings = useCallback(async (page = 1, status = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (status !== 'all') params.status = status;

      const res = await equipmentApi.getMyListings(params);
      if (res && res.data) {
        setListings(res.data);
        if (res.meta) {
          setPagination({
            currentPage: res.meta.currentPage,
            totalPages: res.meta.totalPages,
            totalItems: res.meta.totalItems,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load seller listings:', err);
      setError(err?.message || 'Failed to load your equipment listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(pagination.currentPage, statusFilter);
  }, [pagination.currentPage, statusFilter, fetchListings]);

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'available' ? 'unavailable' : 'available';
    try {
      await equipmentApi.updateStatus(item.id, nextStatus);
      setActionSuccess(`Listing status changed to "${nextStatus}".`);
      setTimeout(() => setActionSuccess(null), 3000);
      fetchListings(pagination.currentPage, statusFilter);
    } catch (err) {
      setError(err?.message || 'Failed to update listing status.');
    }
  };

  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setSubmittingDelete(true);
    try {
      await equipmentApi.deleteEquipment(itemToDelete.id);
      setDeleteModalOpen(false);
      setActionSuccess(`Listing "${itemToDelete.title}" was removed successfully.`);
      setTimeout(() => setActionSuccess(null), 3000);
      fetchListings(pagination.currentPage, statusFilter);
    } catch (err) {
      setError(err?.message || 'Failed to delete listing.');
      setDeleteModalOpen(false);
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Equipment Listings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your items for sale, update availability, or add new university equipment
          </p>
        </div>

        <Link to="/seller/equipment/new">
          <Button variant="primary" icon={PlusCircle} size="sm">
            Add Equipment
          </Button>
        </Link>
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {['all', 'available', 'reserved', 'sold', 'unavailable', 'archived'].map((status) => (
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

      {/* Listings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading your inventory..." />
          </div>
        ) : listings.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Equipment Item</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Condition</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Requests</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listings.map((item) => {
                    const thumbUrl = resolveImageUrl(item.primary_image, item.updated_at || item.created_at);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                              <img
                                src={thumbUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = DEFAULT_EQUIPMENT_IMAGE;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/equipment/${item.id}`}
                                className="font-bold text-slate-900 hover:text-indigo-600 truncate block max-w-[200px]"
                              >
                                {item.title}
                              </Link>
                              <span className="text-[10px] text-slate-400">Listed: {formatDate(item.created_at)}</span>
                            </div>
                          </div>
                        </td>
                      <td className="py-3.5 px-4">{item.category_name || 'Equipment'}</td>
                      <td className="py-3.5 px-4">
                        <Badge type="condition" value={item.condition} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge type="status" value={item.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {item.pending_requests_count > 0 ? (
                          <span className="text-amber-600 font-bold">
                            {item.pending_requests_count} pending
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Available / Unavailable */}
                          {(item.status === 'available' || item.status === 'unavailable') && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.status === 'available'
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={item.status === 'available' ? 'Mark Unavailable' : 'Mark Available'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Listing */}
                          <Link
                            to={`/seller/equipment/${item.id}/edit`}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Listing"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* Delete Listing */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
            icon={Package}
            title="No equipment listings found"
            description="You don't have any listings in this category yet."
            actionText="Add New Equipment Listing"
            onAction={() => navigate('/seller/equipment/new')}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Equipment Listing"
      >
        {itemToDelete && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{itemToDelete.title}</p>
              <p className="text-slate-500">Category: {itemToDelete.category_name}</p>
              <p className="text-slate-900 font-extrabold">Price: {formatCurrency(itemToDelete.price)}</p>
            </div>

            <p className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 leading-relaxed font-medium">
              Are you sure you want to delete this equipment listing? If no active purchases or transactions exist, it will be deleted from the university marketplace.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={submittingDelete}
                onClick={handleConfirmDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyListingsPage;
