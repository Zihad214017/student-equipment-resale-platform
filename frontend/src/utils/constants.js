export const USER_ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
};

export const EQUIPMENT_CONDITIONS = [
  { value: 'new', label: 'New', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'like_new', label: 'Like New', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'good', label: 'Good', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'fair', label: 'Fair', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'used', label: 'Used', badgeColor: 'bg-slate-100 text-slate-800 border-slate-200' },
];

export const EQUIPMENT_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
  UNAVAILABLE: 'unavailable',
  ARCHIVED: 'archived',
};

export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  SOLD: 'sold',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Listed' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'title_asc', label: 'Title: A-Z' },
  { value: 'popular', label: 'Most Popular' },
];
