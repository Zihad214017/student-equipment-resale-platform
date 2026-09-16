import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Heart, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Platform Brand */}
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white">CampusEquip</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              University old equipment tracking and resale platform. Connecting student buyers and sellers for affordable, verified academic resources.
            </p>
          </div>

          {/* Col 2: Marketplace Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Marketplace</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/equipment" className="hover:text-white transition-colors">
                  Browse Catalog
                </Link>
              </li>
              <li>
                <Link to="/equipment?condition=Good" className="hover:text-white transition-colors">
                  Good Condition Deals
                </Link>
              </li>
              <li>
                <Link to="/equipment?maxPrice=100" className="hover:text-white transition-colors">
                  Under $100 Equipment
                </Link>
              </li>
              <li>
                <Link to="/seller/equipment/new" className="hover:text-white transition-colors">
                  Sell Old Equipment
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Student Hub */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Student Hub</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/buyer/dashboard" className="hover:text-white transition-colors">
                  Buyer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/buyer/requests" className="hover:text-white transition-colors">
                  My Purchase Requests
                </Link>
              </li>
              <li>
                <Link to="/seller/dashboard" className="hover:text-white transition-colors">
                  Seller Portal
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition-colors">
                  Profile & Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Safety */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Trust & Safety</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified University Students</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Admin Moderated Listings</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2">
                All transactions occur on campus. Inspect equipment thoroughly prior to completing payment.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CampusEquip. Smart Student Equipment Tracking & Resale Platform.</p>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin Console</span>
            </Link>
            <span>•</span>
            <span>Built with care for university pair programming</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
