import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, ShieldCheck, Check, X, Trash2, Eye, AlertCircle } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate, formatCondition } from '../../utils/formatters';
import { resolveImageUrl, DEFAULT_EQUIPMENT_IMAGE } from '../../utils/imageHelper';

const AdminEquipmentPage = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Moderation Modal
  const [moderateModalOpen, setModerateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [moderateAction, setModerateAction] = useState('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingMod, setSubmittingMod] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchEquipment = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.keyword = search.trim();
      if (approvalFilter !== 'all') params.admin_approval_status = approvalFilter;

      const res = await adminApi.getEquipment(params);
      if (res && res.data) {
        setEquipmentList(res.data);
        if (res.meta) {
          setPagination({
            currentPage: res.meta.currentPage,
            totalPages: res.meta.totalPages,
            totalItems: res.meta.totalItems,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load equipment:', err);
      setError(err?.message || 'Failed to load equipment records.');
    } finally {
      setLoading(false);
    }
  }, [search, approvalFilter]);

  useEffect(() => {
    fetchEquipment(pagination.currentPage);
  }, [pagination.currentPage, approvalFilter, fetchEquipment]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchEquipment(1);
  };

  const handleOpenModerate = (item, action) => {
    setSelectedItem(item);
    setModerateAction(action);
    setRejectionReason('');
    setModerateModalOpen(true);
  };

  const handleModerateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmittingMod(true);
    try {
      await adminApi.moderateEquipment(
        selectedItem.id,
        moderateAction,
        rejectionReason.trim() || undefined
      );

      setModerateModalOpen(false);
      setActionSuccess(`Listing "${selectedItem.title}" has been ${moderateAction}.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchEquipment(pagination.currentPage);
    } catch (err) {
      setError(err?.message || 'Failed to moderate listing.');
    } finally {
      setSubmittingMod(false);
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
      await adminApi.deleteEquipment(itemToDelete.id);
      setDeleteModalOpen(false);
      setActionSuccess(`Listing "${itemToDelete.title}" removed successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchEquipment(pagination.currentPage);
    } catch (err) {
      setError(err?.message || 'Failed to remove equipment listing.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleOpenDetails = (item) => {
    setViewingItem(item);
    setDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Equipment Moderation Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit campus equipment listings, approve new items, and remove prohibited materials
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search equipment title, seller, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={approvalFilter}
            onChange={(e) => {
              setApprovalFilter(e.target.value);
              setPagination((prev) => ({ ...prev, currentPage: 1 }));
            }}
            className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
          >
            <option value="all">All Approval Statuses</option>
            <option value="approved">Approved Only</option>
            <option value="pending">Pending Review Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading equipment listings..." />
          </div>
        ) : equipmentList.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Listing Title</th>
                    <th className="py-3.5 px-4">Seller</th>
                    <th className="py-3.5 px-4">Condition</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Availability</th>
                    <th className="py-3.5 px-4">Moderation</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipmentList.map((item) => {
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
                              <span className="font-bold text-slate-900 truncate block max-w-[200px]">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-slate-400">{item.category_name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{item.seller_name || 'Seller'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge type="condition" value={item.condition} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge type="status" value={item.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              item.admin_approval_status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.admin_approval_status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.admin_approval_status || 'approved'}
                          </span>
                        </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Equipment Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approve Button */}
                          {item.admin_approval_status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleOpenModerate(item, 'approved')}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Approve Listing"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reject Button */}
                          {item.admin_approval_status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleOpenModerate(item, 'rejected')}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Reject / Flag Listing"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove Inappropriate Listing"
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
            title="No equipment listings match your filter"
            description="All listings have been reviewed or match the selected filter."
          />
        )}
      </div>

      {/* Equipment Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Equipment Listing Details"
      >
        {viewingItem && (
          <div className="space-y-4 text-xs">
            {viewingItem.primary_image && (
              <div className="w-full h-44 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
                <img
                  src={resolveImageUrl(viewingItem.primary_image, viewingItem.updated_at || viewingItem.created_at)}
                  alt={viewingItem.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_EQUIPMENT_IMAGE;
                  }}
                />
              </div>
            )}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">{viewingItem.title}</h3>
                <span className="font-black text-indigo-600 text-sm">{formatCurrency(viewingItem.price)}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{viewingItem.description}</p>
              <div className="pt-2 grid grid-cols-2 gap-2 text-slate-700 border-t border-slate-200/60">
                <div><strong>Seller:</strong> {viewingItem.seller_name}</div>
                <div><strong>Category:</strong> {viewingItem.category_name}</div>
                <div><strong>Condition:</strong> <span className="capitalize">{viewingItem.condition}</span></div>
                <div><strong>Availability:</strong> <span className="capitalize">{viewingItem.status}</span></div>
                <div><strong>Approval:</strong> <span className="uppercase font-semibold text-emerald-600">{viewingItem.admin_approval_status || 'approved'}</span></div>
                <div><strong>Date Listed:</strong> {formatDate(viewingItem.created_at)}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Link to={`/equipment/${viewingItem.id}`} target="_blank">
                <Button variant="outline" size="sm">
                  View Public Page
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Moderate Listing Modal */}
      <Modal
        isOpen={moderateModalOpen}
        onClose={() => setModerateModalOpen(false)}
        title={moderateAction === 'approved' ? 'Approve Equipment Listing' : 'Reject Equipment Listing'}
      >
        {selectedItem && (
          <form onSubmit={handleModerateSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{selectedItem.title}</p>
              <p className="text-slate-500">Seller: {selectedItem.seller_name}</p>
              <p className="text-slate-900 font-extrabold">{formatCurrency(selectedItem.price)}</p>
            </div>

            <Input
              as="textarea"
              label={moderateAction === 'approved' ? 'Approval Note (Optional)' : 'Rejection / Moderation Reason *'}
              rows={3}
              required={moderateAction === 'rejected'}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={
                moderateAction === 'approved'
                  ? 'Verified academic equipment.'
                  : 'Specify why this item violates university marketplace guidelines...'
              }
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModerateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={moderateAction === 'approved' ? 'success' : 'danger'}
                loading={submittingMod}
              >
                Confirm {moderateAction === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove Inappropriate Listing"
      >
        {itemToDelete && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{itemToDelete.title}</p>
              <p className="text-slate-500">Seller: {itemToDelete.seller_name}</p>
              <p className="text-slate-900 font-semibold">Price: {formatCurrency(itemToDelete.price)}</p>
            </div>

            <p className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 leading-relaxed font-medium">
              Are you sure you want to permanently remove/archive this equipment listing? It will no longer appear on the public marketplace.
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
                Confirm Deletion
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminEquipmentPage;
