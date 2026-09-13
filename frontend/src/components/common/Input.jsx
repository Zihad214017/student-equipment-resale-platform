import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  name,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  icon: Icon,
  as = 'input',
  rows = 4,
  children,
  ...props
}, ref) => {
  const inputBaseStyles = `block w-full rounded-xl border text-xs sm:text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed bg-white ${
    error
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900 placeholder-rose-300'
      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 text-slate-900 placeholder-slate-400 hover:border-slate-300'
  } ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 shadow-2xs`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {as === 'textarea' ? (
          <textarea
            ref={ref}
            id={name}
            name={name}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={inputBaseStyles}
            {...props}
          />
        ) : as === 'select' ? (
          <select
            ref={ref}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={inputBaseStyles}
            {...props}
          >
            {children}
          </select>
        ) : (
          <input
            ref={ref}
            id={name}
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={inputBaseStyles}
            {...props}
          />
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
          <span>•</span> {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
