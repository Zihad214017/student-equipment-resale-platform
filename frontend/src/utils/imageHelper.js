/**
 * Image URL Resolution and Cache-Busting Utility
 * Smart Student Old Equipment Tracking and Resale Platform
 */

export const DEFAULT_EQUIPMENT_IMAGE = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';

/**
 * Resolves an image URL with support for string URLs, image objects, relative paths, and deterministic cache-busting.
 * @param {string | object} imageInput - string URL or image object { image_url, ... }
 * @param {string | number | Date} [version] - optional timestamp / updated_at for cache-busting
 * @returns {string} resolved image URL
 */
export const resolveImageUrl = (imageInput, version = null) => {
  if (!imageInput) return DEFAULT_EQUIPMENT_IMAGE;

  let rawUrl = '';
  if (typeof imageInput === 'string') {
    rawUrl = imageInput.trim();
  } else if (typeof imageInput === 'object') {
    rawUrl = (imageInput.image_url || imageInput.url || imageInput.path || '').trim();
  }

  if (!rawUrl) return DEFAULT_EQUIPMENT_IMAGE;

  // External URLs (e.g. Unsplash or absolute HTTP)
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    // If it points to local uploads or backend server, append version query if provided
    if (version && (rawUrl.includes('/uploads/') || (typeof window !== 'undefined' && rawUrl.includes(window.location.host)))) {
      const vTimestamp = typeof version === 'number' ? version : new Date(version).getTime();
      if (!isNaN(vTimestamp) && vTimestamp > 0) {
        const separator = rawUrl.includes('?') ? '&' : '?';
        return `${rawUrl}${separator}v=${vTimestamp}`;
      }
    }
    return rawUrl;
  }

  // Normalize relative paths (e.g. "uploads/..." -> "/uploads/...")
  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  // Apply deterministic cache-busting query parameter when version / updated_at is provided
  if (version) {
    const vTimestamp = typeof version === 'number' ? version : new Date(version).getTime();
    if (!isNaN(vTimestamp) && vTimestamp > 0) {
      const separator = normalizedPath.includes('?') ? '&' : '?';
      return `${normalizedPath}${separator}v=${vTimestamp}`;
    }
  }

  return normalizedPath;
};

/**
 * Extracts and resolves the primary image URL for an equipment item
 * @param {object} equipment
 * @returns {string}
 */
export const getEquipmentPrimaryImageUrl = (equipment) => {
  if (!equipment) return DEFAULT_EQUIPMENT_IMAGE;

  const version = equipment.updated_at || equipment.created_at;

  // 1. Check images array if available
  if (Array.isArray(equipment.images) && equipment.images.length > 0) {
    const primaryObj = equipment.images.find((img) => typeof img === 'object' && img?.is_primary);
    if (primaryObj) {
      return resolveImageUrl(primaryObj, version);
    }
    const firstImg = equipment.images[0];
    if (firstImg) {
      return resolveImageUrl(firstImg, version);
    }
  }

  // 2. Check primary_image property
  if (equipment.primary_image) {
    return resolveImageUrl(equipment.primary_image, version);
  }

  return DEFAULT_EQUIPMENT_IMAGE;
};
