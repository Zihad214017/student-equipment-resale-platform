import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building, GraduationCap, Star, Package, ArrowLeft, ShieldCheck } from 'lucide-react';
import { userApi } from '../../api/userApi';
import EquipmentCard from '../../components/equipment/EquipmentCard';
import StarRating from '../../components/common/StarRating';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatDate } from '../../utils/formatters';

const SellerPublicProfilePage = () => {
  const { id } = useParams();
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSeller = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await userApi.getSellerProfile(id);
        if (res && res.data) {
          setSellerData(res.data);
        }
      } catch (err) {
        console.error('Failed to load seller profile:', err);
        setError(err?.message || 'Seller profile not found.');
      } finally {
        setLoading(false);
      }
    };

    loadSeller();
  }, [id]);

  if (loading) {
    return <LoadingSpinner fullPage message="Loading seller profile..." />;
  }

  if (error || !sellerData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ErrorAlert message={error || 'Seller not found.'} />
        <Link to="/equipment" className="mt-6 inline-block">
          <Button variant="outline" icon={ArrowLeft}>
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const { full_name, department, avatar_url, seller_stats, active_listings = [], recent_reviews = [] } = sellerData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <Link
          to="/equipment"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Equipment Catalog
        </Link>
      </div>

      {/* Seller Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 font-extrabold text-2xl overflow-hidden shrink-0">
            {avatar_url ? (
              <img src={avatar_url} alt={full_name} className="w-full h-full object-cover" />
            ) : (
              full_name?.charAt(0).toUpperCase() || 'S'
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">{full_name}</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Student
              </span>
            </div>

            {department && (
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {department}
              </p>
            )}

            {/* Ratings Overview */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <div className="flex items-center gap-2">
                <StarRating rating={seller_stats?.average_rating || 0} size="md" showText />
                <span className="text-xs text-slate-400">
                  ({seller_stats?.total_reviews || 0} verified reviews)
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold text-slate-700">
                {active_listings.length} Active Listing(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Listings from this Seller */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Active Listings from {full_name}</h2>
        {active_listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {active_listings.map((item) => (
              <EquipmentCard key={item.id} equipment={{ ...item, seller: sellerData }} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No active equipment listings at this moment.
          </div>
        )}
      </div>

      {/* Verified Reviews Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Verified Buyer Reviews</h2>

        {recent_reviews.length > 0 ? (
          <div className="space-y-4 divide-y divide-slate-100">
            {recent_reviews.map((rev) => (
              <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {rev.reviewer_name || 'Student Buyer'}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDate(rev.created_at)}</span>
                </div>
                <StarRating rating={rev.rating} size="sm" />
                {rev.comment && (
                  <p className="text-xs text-slate-600 italic">"{rev.comment}"</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No buyer reviews received yet.</p>
        )}
      </div>
    </div>
  );
};

export default SellerPublicProfilePage;
