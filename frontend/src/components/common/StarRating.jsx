import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({
  rating = 0,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showText = false,
  totalReviews,
  className = '',
}) => {
  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const starSize = sizes[size] || sizes.md;
  const numRating = Number(rating) || 0;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[...Array(maxStars)].map((_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= numRating;
          const isHalf = !isFilled && starValue - 0.5 <= numRating;

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onRatingChange && onRatingChange(starValue)}
              className={`${
                interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
              } text-amber-400 focus:outline-none`}
            >
              <Star
                className={`${starSize} ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400'
                    : isHalf
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'fill-slate-100 text-slate-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showText && (
        <span className="text-xs font-semibold text-slate-700 ml-1">
          {numRating.toFixed(1)}
          {totalReviews !== undefined && (
            <span className="text-slate-400 font-normal ml-0.5">({totalReviews})</span>
          )}
        </span>
      )}
    </div>
  );
};

export default StarRating;
