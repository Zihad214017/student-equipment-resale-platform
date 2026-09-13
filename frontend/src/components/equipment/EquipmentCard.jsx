import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ShieldCheck, Tag } from 'lucide-react';
import Badge from '../common/Badge';
import StarRating from '../common/StarRating';
import { formatCurrency, formatCondition } from '../../utils/formatters';
import { getEquipmentPrimaryImageUrl } from '../../utils/imageHelper';

const EquipmentCard = ({ equipment }) => {
  const {
    id,
    title,
    price,
    original_price,
    condition,
    status,
    brand,
    is_negotiable,
    category,
    seller,
  } = equipment;

  const primaryImage = getEquipmentPrimaryImageUrl(equipment);

  const discountPercent =
    original_price && Number(original_price) > Number(price)
      ? Math.round(((Number(original_price) - Number(price)) / Number(original_price)) * 100)
      : null;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col h-full">
      {/* Image Thumbnail Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        <img
          src={primaryImage}
          alt={title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600';
          }}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <Badge type="condition" value={condition} size="sm" />
          {status !== 'available' && (
            <Badge type="status" value={status} size="sm" />
          )}
        </div>

        {discountPercent && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm">
            {discountPercent}% OFF
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Brand */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-semibold text-indigo-600 truncate max-w-[60%]">
              {category?.name || 'Equipment'}
            </span>
            {brand && <span className="text-slate-400 truncate">{brand}</span>}
          </div>

          {/* Title */}
          <Link to={`/equipment/${id}`}>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-indigo-600 transition-colors">
              {title}
            </h3>
          </Link>
        </div>

        {/* Pricing & Footer Information */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-900">
                {formatCurrency(price)}
              </span>
              {original_price && Number(original_price) > Number(price) && (
                <span className="text-xs text-slate-400 line-through">
                  {formatCurrency(original_price)}
                </span>
              )}
            </div>

            {is_negotiable && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <Tag className="w-2.5 h-2.5" />
                Negotiable
              </span>
            )}
          </div>

          {/* Seller / Rating Info */}
          {seller && (
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
              <span className="truncate max-w-[120px] font-medium text-slate-700">
                {seller.full_name?.split(' ')[0] || 'Student Seller'}
              </span>
              {seller.seller_rating ? (
                <StarRating rating={seller.seller_rating} size="sm" showText />
              ) : (
                <span className="text-[10px] text-slate-400">New Seller</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentCard;
