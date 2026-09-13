import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Tag,
  Building,
  Calendar,
  Layers,
  ArrowLeft,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { equipmentApi } from '../../api/equipmentApi';
import { requestApi } from '../../api/requestApi';
import { useAuth } from '../../context/AuthContext';
import ImageGallery from '../../components/equipment/ImageGallery';
import Badge from '../../components/common/Badge';
import StarRating from '../../components/common/StarRating';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatCurrency, formatDate, formatCondition } from '../../utils/formatters';

const EquipmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Purchase Request Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    const loadEquipmentDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await equipmentApi.getEquipmentById(id);
        if (res && res.data) {
          setEquipment(res.data);
          setProposedPrice(res.data.price || '');
        }
      } catch (err) {
        console.error('Failed to load equipment details:', err);
        setError(err?.message || 'Equipment item not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };

    loadEquipmentDetails();
  }, [id]);

  const handleOpenRequestModal = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/equipment/${id}` } } });
      return;
    }
    setModalOpen(true);
    setRequestError(null);
    setRequestSuccess(false);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!proposedPrice || isNaN(Number(proposedPrice)) || Number(proposedPrice) < 0) {
      setRequestError('Please enter a valid non-negative offer price.');
      return;
    }

    setSubmittingRequest(true);
    setRequestError(null);

    try {
      await requestApi.submitRequest({
        equipment_id: id,
        proposed_price: Number(proposedPrice),
        message: message.trim() || undefined,
      });

      setRequestSuccess(true);
      setTimeout(() => {
        setModalOpen(false);
        navigate('/buyer/requests');
      }, 1500);
    } catch (err) {
      setRequestError(err?.message || 'Failed to submit purchase request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading equipment details..." />;
  }

  if (error || !equipment) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ErrorAlert message={error || 'Equipment not found.'} />
        <Link to="/equipment" className="mt-6 inline-block">
          <Button variant="outline" icon={ArrowLeft}>
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const isOwner = user && user.id === equipment.seller_id;
  const isAvailable = equipment.status === 'available';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <div>
        <Link
          to="/equipment"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace Catalog
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Photos Gallery */}
        <div className="lg:col-span-7">
          <ImageGallery
            images={equipment.images}
            title={equipment.title}
            updatedAt={equipment.updated_at || equipment.created_at}
          />
        </div>

        {/* Right Col: Specifications, Pricing & Purchase CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Category & Status Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                {equipment.category?.name || 'Academic Equipment'}
              </span>
              <div className="flex items-center gap-2">
                <Badge type="condition" value={equipment.condition} />
                <Badge type="status" value={equipment.status} />
              </div>
            </div>

            {/* Title & Brand */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                {equipment.title}
              </h1>
              {equipment.brand && (
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Brand / Manufacturer: <span className="text-slate-800 font-semibold">{equipment.brand}</span>
                  {equipment.model_year && ` (${equipment.model_year})`}
                </p>
              )}
            </div>

            {/* Pricing Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900">
                  {formatCurrency(equipment.price)}
                </span>
                {equipment.original_price && Number(equipment.original_price) > Number(equipment.price) && (
                  <span className="ml-2 text-sm text-slate-400 line-through">
                    {formatCurrency(equipment.original_price)}
                  </span>
                )}
              </div>

              {equipment.is_negotiable && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Tag className="w-3.5 h-3.5" />
                  Price Negotiable
                </span>
              )}
            </div>

            {/* Buyer / Owner Action */}
            <div>
              {isOwner ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 text-center font-medium">
                    This is your active equipment listing.
                  </p>
                  <Link to={`/seller/equipment/${equipment.id}/edit`}>
                    <Button variant="secondary" className="w-full">
                      Edit Listing Details
                    </Button>
                  </Link>
                </div>
              ) : isAvailable ? (
                <Button
                  onClick={handleOpenRequestModal}
                  variant="primary"
                  size="xl"
                  icon={Send}
                  className="w-full shadow-lg shadow-indigo-100"
                >
                  Send Purchase Request / Make Offer
                </Button>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-center text-xs font-medium">
                  This item is currently <strong className="capitalize">{equipment.status}</strong> and not accepting new requests.
                </div>
              )}
            </div>

            {/* Seller Information Card */}
            {equipment.seller && (
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Seller Information
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-base overflow-hidden shrink-0">
                    {equipment.seller.avatar_url ? (
                      <img
                        src={equipment.seller.avatar_url}
                        alt={equipment.seller.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      equipment.seller.full_name?.charAt(0).toUpperCase() || 'S'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/sellers/${equipment.seller.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                    >
                      {equipment.seller.full_name}
                    </Link>
                    <p className="text-xs text-slate-500 truncate">
                      {equipment.seller.department || 'University Student'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StarRating
                        rating={equipment.seller.seller_rating || 0}
                        totalReviews={equipment.seller.reviews_count || 0}
                        size="sm"
                        showText
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description & Full Details */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900">Equipment Description & Specifications</h3>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 whitespace-pre-line">
          {equipment.description}
        </div>

        <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
          <div>
            <span className="block text-slate-400">Listing Created</span>
            <strong className="text-slate-800 font-semibold">{formatDate(equipment.created_at)}</strong>
          </div>
          <div>
            <span className="block text-slate-400">Condition Grade</span>
            <strong className="text-slate-800 font-semibold">{formatCondition(equipment.condition)}</strong>
          </div>
          <div>
            <span className="block text-slate-400">Campus Delivery</span>
            <strong className="text-slate-800 font-semibold">In-person Handover</strong>
          </div>
          <div>
            <span className="block text-slate-400">Listing Status</span>
            <strong className="text-slate-800 font-semibold capitalize">{equipment.status}</strong>
          </div>
        </div>
      </div>

      {/* Purchase Request Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Purchase Request"
      >
        <ErrorAlert message={requestError} onDismiss={() => setRequestError(null)} className="mb-4" />

        {requestSuccess ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">Request Sent Successfully!</h4>
            <p className="text-xs text-slate-500">
              The seller will review your offer. You will receive a notification when they respond.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              Listing Price: <strong className="text-slate-900">{formatCurrency(equipment.price)}</strong>
            </div>

            <Input
              label="Your Proposed Offer Price ($)"
              type="number"
              min="0"
              step="0.01"
              required
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              placeholder="e.g. 250.00"
            />

            <Input
              as="textarea"
              label="Note / Meeting Preference for Seller (Optional)"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Can meet after 2 PM at the Engineering Library."
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingRequest}
                icon={Send}
              >
                Send Offer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default EquipmentDetailPage;
