import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Clock, Inbox, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatTimeAgo } from '../../utils/formatters';

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time updates regarding purchase requests, offer approvals, and handovers
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={markAllAsRead}
            icon={CheckCheck}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notifications Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading notifications..." />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 flex items-start gap-4 transition-colors ${
                !notif.is_read ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  !notif.is_read
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {notif.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {formatTimeAgo(notif.created_at)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {notif.message}
                </p>

                {/* Direct Action Link if related */}
                <div className="pt-2 flex items-center gap-3">
                  {notif.type?.includes('request') ? (
                    <Link
                      to="/buyer/requests"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      View Purchase Requests <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : notif.type?.includes('transaction') ? (
                    <Link
                      to="/buyer/transactions"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      View Transactions <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : null}

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notif.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors ml-auto"
                    >
                      Mark as read
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteNotification(notif.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={Bell}
            title="All caught up!"
            description="You don't have any notifications at the moment."
          />
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
