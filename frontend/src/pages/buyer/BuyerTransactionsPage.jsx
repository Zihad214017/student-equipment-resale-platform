import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, Star, ShoppingBag, MapPin, CreditCard } from 'lucide-react';
import { transactionApi } from '../../api/transactionApi';
import { reviewApi } from '../../api/reviewApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import StarRating from '../../components/common/StarRating';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import PaymentModal from '../../components/payment/PaymentModal';
import { formatCurrency, formatDate } from '../../utils/formatters';

const BuyerTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('all');

  // Complete Transaction Action State
  const [completingId, setCompletingId] = useState(null);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTx, setPaymentTx] = useState(null);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTx, setReviewTx] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

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

      const res = await transactionApi.getBuyerTransactions(params);
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
      console.error('Failed to load buyer transactions:', err);
      setError(err?.message || 'Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(pagination.currentPage, statusFilter);
  }, [pagination.currentPage, statusFilter, fetchTransactions]);

  const handleMarkCompleted = async (txId) => {
    if (!window.confirm('Confirm that you have received the equipment in satisfactory condition and handed over payment?')) {
      return;
    }

    setCompletingId(txId);
    try {
      await transactionApi.updateStatus(txId, { status: 'completed' });
      fetchTransactions(pagination.currentPage, statusFilter);
    } catch (err) {
      alert(err?.message || 'Failed to complete transaction.');
    } finally {
      setCompletingId(null);
    }
  };

  const handleOpenPaymentModal = (tx) => {
    setPaymentTx(tx);
    setPaymentModalOpen(true);
  };

  const handleOpenReviewModal = (tx) => {
    setReviewTx(tx);
    setRating(5);
    setComment('');
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setReviewError('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await reviewApi.submitReview({
        transaction_id: reviewTx.id,
        rating,
        comment: comment.trim() || undefined,
      });

      setReviewModalOpen(false);
      fetchTransactions(pagination.currentPage, statusFilter);
      alert('Thank you! Your verified seller review has been submitted.');
    } catch (err) {
      setReviewError(err?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Purchase Transactions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track confirmed equipment handovers, delivery completions, and leave seller ratings
          </p>
        </div>

        <Link to="/equipment">
          <Button variant="primary" icon={ShoppingBag} size="sm">
            Browse Equipment
          </Button>
        </Link>
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

      {/* Transactions List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading transactions..." />
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Equipment Details</th>
                    <th className="py-3.5 px-4">Seller</th>
                    <th className="py-3.5 px-4">Final Price</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Handover Location</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/equipment/${tx.equipment_id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 truncate block max-w-[200px]"
                        >
                          {tx.equipment_title || 'Equipment Item'}
                        </Link>
                        <span className="text-[10px] text-slate-400">{formatDate(tx.created_at)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{tx.seller_name || 'Seller'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {formatCurrency(tx.final_price || tx.proposed_price)}
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
                          <span className="text-slate-400">Campus handover</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {tx.payment_status === 'SUCCESS' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Paid ({tx.payment_method})
                            </span>
                          ) : tx.status === 'accepted' ? (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => handleOpenPaymentModal(tx)}
                              icon={CreditCard}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              Pay Now
                            </Button>
                          ) : null}

                          {tx.status === 'sold' ? (
                            <Button
                              size="xs"
                              variant="success"
                              onClick={() => handleMarkCompleted(tx.id)}
                              loading={completingId === tx.id}
                              icon={CheckCircle2}
                            >
                              Confirm Delivery
                            </Button>
                          ) : tx.status === 'completed' ? (
                            (tx.has_reviewed || tx.has_review || tx.review_id) ? (
                              <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                                <Star className="w-3 h-3 fill-emerald-600" /> Reviewed
                              </span>
                            ) : (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleOpenReviewModal(tx)}
                                icon={Star}
                              >
                                Leave Review
                              </Button>
                            )
                          ) : tx.status === 'accepted' ? null : (
                            <span className="text-[11px] text-slate-400">Awaiting seller</span>
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
            icon={Clock}
            title="No transactions found"
            description="When a seller accepts your purchase request, your transaction record will appear here."
            actionText="Browse Equipment Catalog"
            onAction={() => (window.location.href = '/equipment')}
          />
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentTx(null);
        }}
        transaction={paymentTx}
        onSuccess={() => {
          fetchTransactions(pagination.currentPage, statusFilter);
        }}
      />

      {/* Review Submission Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Leave Review for Seller"
      >
        <ErrorAlert message={reviewError} onDismiss={() => setReviewError(null)} className="mb-4" />

        {reviewTx && (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
              <p className="font-bold text-slate-900">{reviewTx.equipment_title}</p>
              <p className="text-slate-500">Seller: {reviewTx.seller_name}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Rating (1 to 5 Stars) *
              </label>
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRatingChange={(newRating) => setRating(newRating)}
              />
            </div>

            <Input
              as="textarea"
              label="Written Review (Optional)"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the equipment condition and meetup experience?"
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingReview}
                icon={Star}
              >
                Submit Review
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default BuyerTransactionsPage;
