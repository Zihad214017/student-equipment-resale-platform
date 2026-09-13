import React from 'react';
import { getConditionBadgeClass, getStatusBadgeClass } from '../../utils/formatters';

const Badge = ({
  children,
  type = 'custom', // 'condition', 'status', 'custom'
  value,
  variant = 'default',
  size = 'md',
  dot = true,
  className = '',
}) => {
  let styleClasses = '';
  let dotColor = 'bg-current';

  if (type === 'condition') {
    styleClasses = getConditionBadgeClass(value || children);
  } else if (type === 'status') {
    styleClasses = getStatusBadgeClass(value || children);
  } else {
    const variants = {
      default: 'bg-slate-100 text-slate-700 border-slate-200',
      primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-800 border-amber-200',
      danger: 'bg-rose-50 text-rose-700 border-rose-200',
      info: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    styleClasses = variants[variant] || variants.default;
  }

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold gap-1.5',
    md: 'text-xs px-2.5 py-0.5 font-bold gap-1.5',
    lg: 'text-xs px-3 py-1 font-bold gap-2',
  };

  const val = children || value;

  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wider transition-colors select-none ${styleClasses} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
      )}
      <span>{val}</span>
    </span>
  );
};

export default Badge;
