import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingBag,
  Inbox,
  Clock,
  Bell,
  User,
  Star,
  ShieldCheck,
  Users,
  Grid,
  FileText,
  CreditCard,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const Sidebar = ({ type = 'buyer' }) => {
  const { unreadCount } = useNotifications();

  const buyerLinks = [
    { to: '/buyer/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/equipment', label: 'Browse Equipment', icon: ShoppingBag },
    { to: '/buyer/requests', label: 'Purchase Requests', icon: Inbox },
    { to: '/buyer/transactions', label: 'Transaction History', icon: Clock },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { to: '/profile', label: 'My Profile', icon: User },
  ];

  const sellerLinks = [
    { to: '/seller/dashboard', label: 'Seller Dashboard', icon: LayoutDashboard },
    { to: '/seller/listings', label: 'My Listings', icon: Package },
    { to: '/seller/equipment/new', label: 'Add New Equipment', icon: PlusCircle },
    { to: '/seller/requests', label: 'Received Requests', icon: Inbox },
    { to: '/seller/transactions', label: 'Sales & Transactions', icon: Clock },
    { to: '/seller/reviews', label: 'Reviews & Ratings', icon: Star },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { to: '/profile', label: 'My Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/equipment', label: 'Equipment Moderation', icon: Package },
    { to: '/admin/categories', label: 'Category Management', icon: Grid },
    { to: '/admin/transactions', label: 'Transaction Monitoring', icon: Clock },
    { to: '/admin/payments', label: 'Payment Monitoring', icon: CreditCard },
    { to: '/admin/reports', label: 'Platform Reports & Analytics', icon: FileText },
  ];

  const links =
    type === 'admin'
      ? adminLinks
      : type === 'seller'
      ? sellerLinks
      : buyerLinks;

  return (
    <aside className="w-full md:w-64 shrink-0 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm h-fit">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
        <span>{type === 'admin' ? 'Admin Portal' : type === 'seller' ? 'Seller Navigation' : 'Buyer Navigation'}</span>
        {type === 'admin' && <ShieldCheck className="w-4 h-4 text-amber-600" />}
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/buyer/dashboard' || link.to === '/seller/dashboard' || link.to === '/admin/dashboard'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? type === 'admin'
                      ? 'bg-amber-50 text-amber-800 font-semibold shadow-xs'
                      : 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </div>
              {link.badge > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
