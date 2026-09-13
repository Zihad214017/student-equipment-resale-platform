import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit3, ArrowLeft, Save, Trash2, Upload, Star, Plus, Check } from 'lucide-react';
import { equipmentApi } from '../../api/equipmentApi';
import { categoryApi } from '../../api/categoryApi';
import { EQUIPMENT_CONDITIONS } from '../../utils/constants';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { resolveImageUrl } from '../../utils/imageHelper';

const EditEquipmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    status: 'available',
  });

  // Image Management State
  const [existingImages, setExistingImages] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [primaryImageId, setPrimaryImageId] = useState(null);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [itemUpdatedAt, setItemUpdatedAt] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catRes, equipRes] = await Promise.all([
          categoryApi.getCategories(),
          equipmentApi.getEquipmentById(id),
        ]);

        if (catRes && catRes.data) setCategories(catRes.data);
        if (equipRes && equipRes.data) {
          const item = equipRes.data;
          setFormData({
            title: item.title || '',
            description: item.description || '',
            category_id: item.category_id || (catRes.data[0]?.id || ''),
            condition: item.condition || 'good',
            price: item.price !== undefined ? item.price : '',
            original_price: item.original_price || '',
            brand: item.brand || '',
            model_year: item.model_year || '',
            is_negotiable: !!item.is_negotiable,
            status: item.status || 'available',
          });

          setItemUpdatedAt(item.updated_at || item.created_at);

          if (Array.isArray(item.images)) {
            setExistingImages(item.images);
            const primary = item.images.find((img) => img.is_primary);
            if (primary) {
              setPrimaryImageId(primary.id);
            } else if (item.images.length > 0) {
              setPrimaryImageId(item.images[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load listing for editing:', err);
        setError(err?.message || 'Failed to load listing data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newImagePreviews]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleFileSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const activeExistingCount = existingImages.filter(
      (img) => !deletedImageIds.includes(img.id)
    ).length;
    const totalCount = activeExistingCount + newImageFiles.length + files.length;

    if (totalCount > 5) {
      setError('An equipment listing can have a maximum of 5 images total.');
      return;
    }

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const handleRemoveExistingImage = (imageId) => {
    setDeletedImageIds((prev) => [...prev, imageId]);
    if (primaryImageId === imageId) {
      // Pick next available active image if one exists
      const remaining = existingImages.filter(
        (img) => img.id !== imageId && !deletedImageIds.includes(img.id)
      );
      if (remaining.length > 0) {
        setPrimaryImageId(remaining[0].id);
      } else {
        setPrimaryImageId(null);
      }
    }
  };

  const handleRestoreExistingImage = (imageId) => {
    setDeletedImageIds((prev) => prev.filter((id) => id !== imageId));
    if (!primaryImageId) {
      setPrimaryImageId(imageId);
    }
  };

  const handleRemoveNewImage = (index) => {
    URL.revokeObjectURL(newImagePreviews[index].url);
    setNewImageFiles((prev) => prev.filter((_, idx) => idx !== index));
    setNewImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSetPrimary = (imageId) => {
    setPrimaryImageId(imageId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.category_id || formData.price === '') {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const activeExistingIds = existingImages
        .filter((img) => !deletedImageIds.includes(img.id))
        .map((img) => img.id);

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
      data.append('status', formData.status);

      // Keep image IDs & deleted image IDs
      activeExistingIds.forEach((id) => data.append('keep_image_ids', id));
      deletedImageIds.forEach((id) => data.append('deleted_image_ids', id));

      if (primaryImageId && !deletedImageIds.includes(primaryImageId)) {
        data.append('primary_image_id', primaryImageId);
      }

      // Append newly staged files
      newImageFiles.forEach((file) => {
        data.append('images', file);
      });

      await equipmentApi.updateEquipment(id, data);

      navigate('/seller/listings');
    } catch (err) {
      setError(err?.message || 'Failed to update equipment listing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading equipment details..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          to="/seller/listings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Listings
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900">Edit Equipment Listing</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Update specifications, condition, pricing, or listing availability
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Title */}
        <Input
          label="Equipment Title"
          name="title"
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

        {/* Pricing & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Selling Price ($)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            value={formData.price}
            onChange={handleChange}
          />

          <Input
            label="Original Retail Price ($)"
            name="original_price"
            type="number"
            min="0"
            step="0.01"
            value={formData.original_price}
            onChange={handleChange}
          />

          <Input
            as="select"
            label="Availability Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="unavailable">Unavailable</option>
          </Input>
        </div>

        {/* Brand & Model Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Brand / Manufacturer"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
          />

          <Input
            label="Model Year / Edition"
            name="model_year"
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
          required
          value={formData.description}
          onChange={handleChange}
        />

        {/* Equipment Photos & Image Management */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Equipment Photos & Image Gallery
            </label>
            <p className="text-xs text-slate-500">
              Manage existing photos, set the primary thumbnail, or upload replacements (Max 5 images total).
            </p>
          </div>

          {/* Existing Photos Grid */}
          {existingImages.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                Existing Listing Images:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingImages.map((img) => {
                  const isDeleted = deletedImageIds.includes(img.id);
                  const isPrimary = primaryImageId === img.id && !isDeleted;
                  const resolvedSrc = resolveImageUrl(img.image_url, itemUpdatedAt);

                  return (
                    <div
                      key={img.id}
                      className={`relative rounded-2xl border overflow-hidden transition-all ${
                        isDeleted
                          ? 'border-rose-300 bg-rose-50/50 opacity-60'
                          : isPrimary
                          ? 'border-indigo-600 ring-2 ring-indigo-200 bg-slate-50'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="aspect-4/3 w-full overflow-hidden">
                        <img
                          src={resolvedSrc}
                          alt="Equipment"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';
                          }}
                        />
                      </div>

                      {/* Badges / Overlay */}
                      <div className="p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          {isDeleted ? (
                            <span className="text-[10px] font-bold text-rose-600 uppercase">
                              Marked for deletion
                            </span>
                          ) : isPrimary ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              <Star className="w-3 h-3 fill-indigo-600" /> Primary Photo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(img.id)}
                              className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600"
                            >
                              Set as Primary
                            </button>
                          )}

                          {isDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreExistingImage(img.id)}
                              className="text-[10px] font-semibold text-indigo-600 hover:underline"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(img.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Staged New Images Grid */}
          {newImagePreviews.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                New Photos to Upload:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {newImagePreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl border border-emerald-300 bg-emerald-50/30 overflow-hidden shadow-xs"
                  >
                    <div className="aspect-4/3 w-full overflow-hidden">
                      <img
                        src={preview.url}
                        alt={`New upload ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-emerald-700 truncate max-w-[100px]">
                        New ({preview.name})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove newly staged photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Photos Upload Input */}
          {existingImages.filter((img) => !deletedImageIds.includes(img.id)).length +
            newImageFiles.length <
            5 && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Add / Upload More Photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
          )}
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
            icon={Save}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditEquipmentPage;
