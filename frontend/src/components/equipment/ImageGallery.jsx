import React, { useState } from 'react';
import { resolveImageUrl, DEFAULT_EQUIPMENT_IMAGE } from '../../utils/imageHelper';

const ImageGallery = ({ images = [], title = 'Equipment Image', updatedAt = null }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const displayImages = Array.isArray(images) && images.length > 0 ? images : [DEFAULT_EQUIPMENT_IMAGE];
  const activeImage = displayImages[activeIdx] || displayImages[0] || DEFAULT_EQUIPMENT_IMAGE;
  const currentImageUrl = resolveImageUrl(activeImage, updatedAt);

  return (
    <div className="space-y-4">
      {/* Main Feature Image */}
      <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
        <img
          src={currentImageUrl}
          alt={`${title} - Photo ${activeIdx + 1}`}
          className="w-full h-full object-cover object-center transition-all duration-300"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_EQUIPMENT_IMAGE;
          }}
        />
      </div>

      {/* Thumbnail Bar */}
      {displayImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {displayImages.map((img, idx) => {
            const thumbUrl = resolveImageUrl(img, updatedAt);
            return (
              <button
                key={img?.id || idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`relative shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  activeIdx === idx
                    ? 'border-indigo-600 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_EQUIPMENT_IMAGE;
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
