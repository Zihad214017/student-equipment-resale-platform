import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, ThumbsUp, MessageSquare } from 'lucide-react';
import { reviewApi } from '../../api/reviewApi';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/common/StarRating';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatDate } from '../../utils/formatters';

const SellerReviewsPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadReviews = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await reviewApi.getSellerReviews(user.id);
        if (res) {
          if (res.data) setReviews(res.data);
          if (res.meta?.rating_summary) {
            setSummary(res.meta.rating_summary);
          } else if (res.rating_summary) {
            setSummary(res.rating_summary);
          }
        }
      } catch (err) {
        console.error('Failed to load seller reviews:', err);
        setError(err?.message || 'Failed to load seller reviews.');
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user?.id]);

  if (loading) {
    return <LoadingSpinner fullPage message="Loading your seller ratings and buyer reviews..." />;
  }

  const avgRating = Number(summary?.average_rating || user?.rating_summary?.average_rating || 0);
  const totalReviews = Number(summary?.total_reviews || user?.rating_summary?.total_reviews || reviews.length);
  const distribution = summary?.distribution || summary?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Seller Ratings & Reviews</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verified feedback and reputation scores received from campus buyers after completed transactions
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Ratings Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Main Average Score */}
          <div className="text-center md:text-left space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Overall Campus Reputation
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-5xl font-black text-slate-900">{avgRating.toFixed(1)}</span>
              <span className="text-slate-400 text-sm font-semibold">/ 5.0</span>
            </div>
            <StarRating rating={avgRating} size="lg" />
            <p className="text-xs text-slate-500">
              Based on <strong className="text-slate-900">{totalReviews}</strong> verified student transaction{totalReviews === 1 ? '' : 's'}
            </p>
          </div>

          {/* Rating Breakdown Distribution */}
          <div className="md:col-span-2 space-y-2 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Rating Distribution
            </h4>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = Number(distribution[stars] || 0);
              const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-medium text-slate-600 shrink-0">{stars} stars</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stars >= 4 ? 'bg-amber-400' : stars === 3 ? 'bg-amber-300' : 'bg-slate-300'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-slate-400 font-mono text-[11px] shrink-0">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Verified Buyer Reviews ({reviews.length})</h2>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Verified Deals
          </span>
        </div>

        {reviews.length > 0 ? (
          <div className="space-y-6 divide-y divide-slate-100">
            {reviews.map((rev) => (
              <div key={rev.id} className="pt-6 first:pt-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {rev.reviewer_name || 'Verified Buyer'}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      Buyer
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{formatDate(rev.created_at)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating rating={rev.rating} size="sm" />
                  <span className="text-xs font-bold text-slate-700">{rev.rating}.0</span>
                </div>

                {rev.comment ? (
                  <p className="text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 italic leading-relaxed">
                    "{rev.comment}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No written comment provided.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No buyer reviews yet"
            description="Reviews and ratings will appear here as soon as buyers complete purchases of your equipment."
          />
        )}
      </div>
    </div>
  );
};

export default SellerReviewsPage;
