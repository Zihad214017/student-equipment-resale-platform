import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  Cpu,
  BookOpen,
  Wrench,
  Package,
} from 'lucide-react';
import { equipmentApi } from '../../api/equipmentApi';
import { categoryApi } from '../../api/categoryApi';
import EquipmentCard from '../../components/equipment/EquipmentCard';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [featuredEquipment, setFeaturedEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [catRes, equipRes] = await Promise.all([
          categoryApi.getCategories(),
          equipmentApi.getEquipment({ limit: 8, sortBy: 'newest' }),
        ]);

        if (catRes && catRes.data) setCategories(catRes.data);
        if (equipRes && equipRes.data) setFeaturedEquipment(equipRes.data);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/equipment?keyword=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/equipment');
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-950 text-white py-20 px-4 sm:px-6 lg:px-8">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold backdrop-blur-sm">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Official University Student Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Buy & Sell University Equipment{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              On Campus
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300">
            Find affordable lab instruments, electronics, computing gear, and academic tools from fellow students. Verified, safe, and transparent.
          </p>

          {/* Search Bar in Hero */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-300" />
              <input
                type="text"
                placeholder="Search lab instruments, calculators, kits, laptops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-slate-400 rounded-xl border-none focus:outline-none focus:ring-0 text-sm"
              />
            </div>
            <Button type="submit" size="lg" variant="primary" className="shrink-0">
              Search Marketplace
            </Button>
          </form>

          {/* Quick stats banner */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-center border-t border-indigo-800/40">
            <div>
              <div className="text-2xl font-black text-indigo-300">100%</div>
              <div className="text-xs text-slate-400">Campus Verified</div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-300">5 Conditions</div>
              <div className="text-xs text-slate-400">New to Used</div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-300">0% Fees</div>
              <div className="text-xs text-slate-400">Student to Student</div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-300">Fast Handover</div>
              <div className="text-xs text-slate-400">Meet on Campus</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Popular Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Explore by Category</h2>
            <p className="text-sm text-slate-500">Discover equipment listed by your peers</p>
          </div>
          <Link
            to="/equipment"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            All Categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/equipment?category=${encodeURIComponent(cat.slug || cat.id)}`}
              className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {cat.equipment_count || 0} items available
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured & Recently Listed Equipment */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Latest Available Equipment</h2>
            <p className="text-sm text-slate-500">Recently verified student listings</p>
          </div>
          <Link
            to="/equipment"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View All Catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading marketplace equipment..." />
        ) : featuredEquipment.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredEquipment.map((item) => (
              <EquipmentCard key={item.id} equipment={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No equipment listings yet.</p>
            <Link to="/seller/equipment/new" className="mt-4 inline-block">
              <Button size="sm">Be the first to list an item</Button>
            </Link>
          </div>
        )}
      </section>

      {/* 4. Why CampusEquip Section */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 rounded-3xl max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold">Why Campus Students Love Us</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Tailored specifically for campus logistics, departmental equipment, and budget-friendly student exchanges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Campus Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every buyer and seller is authenticated with official university student credentials. Meet safely in campus study areas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Direct Purchase Requests</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Negotiate and propose prices directly. Once accepted, items are reserved automatically to avoid double selling.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Ratings & Reviews</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leave verified reviews only after physical transaction completion. Build your seller reputation across departments.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-indigo-100">
          <h2 className="text-3xl font-extrabold">Have Old Equipment Sitting in Your Dorm?</h2>
          <p className="mt-3 text-indigo-100 max-w-xl mx-auto text-sm">
            Turn your unused calculators, sensors, lab kits, and textbooks into cash while helping junior students save money.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/seller/equipment/new">
              <Button size="lg" variant="secondary">
                List Equipment for Sale
              </Button>
            </Link>
            <Link to="/equipment">
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
