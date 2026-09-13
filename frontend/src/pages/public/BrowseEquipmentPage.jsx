import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, SlidersHorizontal } from 'lucide-react';
import { equipmentApi } from '../../api/equipmentApi';
import { categoryApi } from '../../api/categoryApi';
import EquipmentCard from '../../components/equipment/EquipmentCard';
import EquipmentFilter from '../../components/equipment/EquipmentFilter';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';

const BrowseEquipmentPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [equipmentList, setEquipmentList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 12,
  });

  // Extract initial filters from search URL parameters
  const currentFilters = {
    keyword: searchParams.get('keyword') || '',
    category: searchParams.get('category') || '',
    condition: searchParams.get('condition') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: parseInt(searchParams.get('page'), 10) || 1,
    limit: 12,
  };

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoryApi.getCategories();
        if (res && res.data) setCategories(res.data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch equipment matching current filters
  const fetchEquipment = useCallback(async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await equipmentApi.getEquipment(filters);
      if (res && res.data) {
        setEquipmentList(res.data);
        if (res.meta) {
          setPagination({
            totalItems: res.meta.totalItems,
            totalPages: res.meta.totalPages,
            currentPage: res.meta.currentPage,
            pageSize: res.meta.pageSize,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
      setError(err?.message || 'Failed to load equipment catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment(currentFilters);
  }, [searchParams, fetchEquipment]);

  const handleFilterChange = (newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== '' && val !== null) {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Browse Equipment Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore university lab tools, electronics, sensors, kits, and academic supplies
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar Filters */}
        <div className="w-full lg:w-72 shrink-0">
          <EquipmentFilter
            categories={categories}
            initialFilters={currentFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        </div>

        {/* Right Equipment Grid */}
        <div className="flex-1 min-w-0">
          {/* Results Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 mb-6 flex items-center justify-between shadow-xs">
            <span className="text-xs font-semibold text-slate-600">
              Showing <span className="text-indigo-600 font-bold">{pagination.totalItems}</span> available item(s)
            </span>

            {currentFilters.keyword && (
              <span className="text-xs text-slate-500">
                Search: <strong className="text-slate-800 font-medium">"{currentFilters.keyword}"</strong>
              </span>
            )}
          </div>

          <ErrorAlert message={error} onDismiss={() => setError(null)} className="mb-6" />

          {loading ? (
            <LoadingSpinner message="Searching marketplace equipment..." />
          ) : equipmentList.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {equipmentList.map((item) => (
                  <EquipmentCard key={item.id} equipment={item} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                className="mt-8"
              />
            </>
          ) : (
            <EmptyState
              icon={Package}
              title="No equipment found"
              description="Try adjusting your search terms, removing filters, or widening your price range."
              actionText="Reset All Filters"
              onAction={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseEquipmentPage;
