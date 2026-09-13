/**
 * Formats a number as USD currency
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Formats ISO date string to human readable format
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
};

/**
 * Returns human-friendly relative time (e.g. "2 hours ago")
 */
export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
};

/**
 * Formats condition enum to display label
 */
export const formatCondition = (condition) => {
  if (!condition) return 'Unknown';
  const map = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    used: 'Used',
  };
  return map[condition.toLowerCase()] || condition;
};

/**
 * Returns badge styling classes for equipment condition
 */
export const getConditionBadgeClass = (condition) => {
  const map = {
    new: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    like_new: 'bg-teal-100 text-teal-800 border-teal-200',
    good: 'bg-blue-100 text-blue-800 border-blue-200',
    fair: 'bg-amber-100 text-amber-800 border-amber-200',
    used: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return map[(condition || '').toLowerCase()] || 'bg-slate-100 text-slate-700 border-slate-200';
};

/**
 * Returns badge styling classes for equipment / request / transaction status
 */
export const getStatusBadgeClass = (status) => {
  const map = {
    available: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    reserved: 'bg-amber-100 text-amber-800 border-amber-200',
    sold: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    accepted: 'bg-blue-100 text-blue-800 border-blue-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
    unavailable: 'bg-slate-100 text-slate-700 border-slate-200',
    archived: 'bg-slate-100 text-slate-700 border-slate-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return map[(status || '').toLowerCase()] || 'bg-slate-100 text-slate-700 border-slate-200';
};
