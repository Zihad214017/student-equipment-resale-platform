import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ErrorAlert = ({
  title = 'An error occurred',
  message,
  errors = [],
  onDismiss,
  className = '',
}) => {
  if (!message && (!errors || errors.length === 0)) return null;

  return (
    <div className={`rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 ${className}`}>
      <div className="flex items-start">
        <div className="shrink-0 text-rose-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="ml-3 w-full">
          {title && <h4 className="text-sm font-semibold text-rose-900">{title}</h4>}
          {message && <div className="text-xs text-rose-700 mt-1">{message}</div>}
          {errors && errors.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-xs text-rose-700 space-y-0.5">
              {errors.map((err, i) => (
                <li key={i}>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
