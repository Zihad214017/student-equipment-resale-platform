import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { EQUIPMENT_CONDITIONS, SORT_OPTIONS } from '../../utils/constants';
import Button from '../common/Button';
import Input from '../common/Input';

const EquipmentFilter = ({
  categories = [],
  initialFilters = {},
  onFilterChange,
  onReset,
}) => {
  const [keyword, setKeyword] = useState(initialFilters.keyword || '');
  const [category, setCategory] = useState(initialFilters.category || '');
  const [condition, setCondition] = useState(initialFilters.condition || '');
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice || '');
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'newest');

  // Sync internal state when external initialFilters change
  useEffect(() => {
    setKeyword(initialFilters.keyword || '');
    setCategory(initialFilters.category || '');
    setCondition(initialFilters.condition || '');
    setMinPrice(initialFilters.minPrice || '');
    setMaxPrice(initialFilters.maxPrice || '');
    setSortBy(initialFilters.sortBy || 'newest');
  }, [initialFilters]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    onFilterChange({
      keyword: keyword.trim(),
      category,
      condition,
      minPrice: minPrice !== '' ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== '' ? Number(maxPrice) : undefined,
      sortBy,
      page: 1, // Reset to page 1 on new filter
    });
  };

  const handleReset = () => {
    setKeyword('');
    setCategory('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    onReset();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filter Equipment</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Keyword Search */}
      <Input
        label="Search Keywords"
        name="keyword"
        placeholder="e.g. Oscilloscope, Arduino, Lab..."
        icon={Search}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      {/* Category Dropdown */}
      <Input
        as="select"
        label="Category"
        name="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.slug || cat.id}>
            {cat.name} ({cat.equipment_count || 0})
          </option>
        ))}
      </Input>

      {/* Condition Selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
          Condition
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setCondition('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
              condition === ''
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Conditions
          </button>
          {EQUIPMENT_CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                condition.toLowerCase() === c.value.toLowerCase() ||
                condition.toLowerCase() === c.label.toLowerCase()
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
          Price Range ($)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min ($)"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max ($)"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      {/* Sort Options */}
      <Input
        as="select"
        label="Sort By"
        name="sortBy"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Input>

      {/* Action Buttons */}
      <div className="pt-2">
        <Button type="submit" variant="primary" className="w-full">
          Apply Filters
        </Button>
      </div>
    </form>
  );
};

export default EquipmentFilter;
