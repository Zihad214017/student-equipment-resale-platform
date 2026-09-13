import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowLeft, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { equipmentApi } from '../../api/equipmentApi';
import { categoryApi } from '../../api/categoryApi';
import { EQUIPMENT_CONDITIONS } from '../../utils/constants';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorAlert from '../../components/common/ErrorAlert';

const AddEquipmentPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    condition: 'good',
    price: '',
    original_price: '',
    brand: '',
    model_year: '',
    is_negotiable: false,
  });

  const [imageUrls, setImageUrls] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoryApi.getCategories();
        if (res && res.data) {
          setCategories(res.data);
          if (res.data.length > 0) {
            setFormData((prev) => ({ ...prev, category_id: res.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [filePreviews]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleFileChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 5) {
      setError('You can upload a maximum of 5 equipment photos.');
      return;
    }

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setImageFiles((prev) => [...prev, ...files]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    URL.revokeObjectURL(filePreviews[index].url);
    setImageFiles((prev) => prev.filter((_, idx) => idx !== index));
    setFilePreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.category_id || formData.price === '') {
      setError('Please fill in all required fields (Title, Description, Category, Price).');
      return;
    }

    if (Number(formData.price) < 0) {
      setError('Price must be a valid non-negative amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (imageFiles.length > 0) {
        // Use FormData for file uploads
        const data = new FormData();
        data.append('title', formData.title.trim());
        data.append('description', formData.description.trim());
        data.append('category_id', formData.category_id);
        data.append('condition', formData.condition);
        data.append('price', Number(formData.price));
        if (formData.original_price) data.append('original_price', Number(formData.original_price));
        if (formData.brand) data.append('brand', formData.brand.trim());
        if (formData.model_year) data.append('model_year', formData.model_year.trim());
        data.append('is_negotiable', formData.is_negotiable);

        imageFiles.forEach((file) => {
          data.append('images', file);
        });

        await equipmentApi.createEquipment(data);
      } else {
        // Use JSON with optional image URLs array
        const urlArray = imageUrls
          .split('\n')
          .map((u) => u.trim())
          .filter((u) => u.length > 0);

        await equipmentApi.createEquipment({
          ...formData,
          price: Number(formData.price),
          original_price: formData.original_price ? Number(formData.original_price) : undefined,
          images: urlArray.length > 0 ? urlArray : undefined,
        });
      }

      navigate('/seller/listings');
    } catch (err) {
      setError(err?.message || 'Failed to create equipment listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          to="/seller/listings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Listings
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900">List Equipment for Sale</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Provide accurate details about your academic gear to connect with student buyers
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Title */}
        <Input
          label="Equipment Title"
          name="title"
          placeholder="e.g. Rigol DS1054Z Digital Oscilloscope (50MHz 4CH)"
          required
          value={formData.title}
          onChange={handleChange}
        />

        {/* Category & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            as="select"
            label="Equipment Category"
            name="category_id"
            required
            value={formData.category_id}
            onChange={handleChange}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Input>

          <Input
            as="select"
            label="Condition"
            name="condition"
            required
            value={formData.condition}
            onChange={handleChange}
          >
            {EQUIPMENT_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Input>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Selling Price ($)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 250.00"
            required
            value={formData.price}
            onChange={handleChange}
          />

          <Input
            label="Original Retail Price ($) - Optional"
            name="original_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 399.00"
            value={formData.original_price}
            onChange={handleChange}
          />
        </div>

        {/* Brand & Model Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Brand / Manufacturer (Optional)"
            name="brand"
            placeholder="e.g. Texas Instruments, Arduino, Keysight"
            value={formData.brand}
            onChange={handleChange}
          />

          <Input
            label="Model Year / Edition (Optional)"
            name="model_year"
            placeholder="e.g. 2023"
            value={formData.model_year}
            onChange={handleChange}
          />
        </div>

        {/* Negotiable Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="is_negotiable"
            name="is_negotiable"
            type="checkbox"
            checked={formData.is_negotiable}
            onChange={handleChange}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label htmlFor="is_negotiable" className="text-xs font-semibold text-slate-700 cursor-pointer">
            Price is negotiable (open to counter-offers from students)
          </label>
        </div>

        {/* Description */}
        <Input
          as="textarea"
          label="Equipment Description & Included Accessories"
          name="description"
          rows={5}
          placeholder="Describe condition, working status, included cables, manuals, sensors, and any defects or scratches..."
          required
          value={formData.description}
          onChange={handleChange}
        />

        {/* Image Uploads / URLs */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Upload Equipment Photos (Max 5 images)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          {/* Staged Image Previews */}
          {filePreviews.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                Selected Photos ({filePreviews.length}/5):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {filePreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-xs"
                  >
                    <div className="aspect-4/3 w-full overflow-hidden">
                      <img
                        src={preview.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-700 truncate max-w-[80px]">
                        {idx === 0 ? 'Primary' : `#${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Input
              as="textarea"
              label="Or Provide Image URLs (One URL per line)"
              rows={2}
              placeholder="https://images.unsplash.com/...&#10;https://..."
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link to="/seller/listings">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            icon={PlusCircle}
          >
            Publish Listing
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddEquipmentPage;
