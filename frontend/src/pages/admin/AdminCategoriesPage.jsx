import React, { useState, useEffect } from 'react';
import { Grid, PlusCircle, Edit3, Trash2, Tag, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getCategories();
      if (res && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(err?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIcon('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setIcon(cat.icon || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          icon: icon.trim() || undefined,
        });
        setActionSuccess(`Category "${name.trim()}" updated successfully.`);
      } else {
        await adminApi.createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
          icon: icon.trim() || undefined,
        });
        setActionSuccess(`Category "${name.trim()}" created successfully.`);
      }

      setModalOpen(false);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCategories();
    } catch (err) {
      setFormError(err?.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (cat) => {
    setCategoryToDelete(cat);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setSubmittingDelete(true);
    try {
      await adminApi.deleteCategory(categoryToDelete.id);
      setDeleteModalOpen(false);
      setActionSuccess(`Category "${categoryToDelete.name}" deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCategories();
    } catch (err) {
      setError(err?.message || 'Failed to delete category. Ensure no active equipment is assigned to it.');
      setDeleteModalOpen(false);
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Category Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize university marketplace equipment categories, slugs, and academic departments
          </p>
        </div>

        <Button
          variant="primary"
          icon={PlusCircle}
          size="sm"
          onClick={handleOpenCreate}
        >
          Create Category
        </Button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Categories Grid / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading marketplace categories..." />
          </div>
        ) : categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Category Name</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Equipment Listed</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <span className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        {cat.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{cat.slug}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500">
                      {cat.description || 'No description provided'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">
                      {cat.equipment_count || 0} items
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Category"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDelete(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Grid}
            title="No categories exist"
            description="Create your first equipment category using the button above."
          />
        )}
      </div>

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Equipment Category'}
      >
        <ErrorAlert message={formError} onDismiss={() => setFormError(null)} className="mb-4" />

        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Robotics & Microcontrollers"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            as="textarea"
            label="Description (Optional)"
            rows={3}
            placeholder="Describe what equipment belongs in this category..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Icon Identifier (Optional)"
            placeholder="e.g. cpu, wrench, bot, laptop"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Equipment Category"
      >
        {categoryToDelete && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{categoryToDelete.name}</p>
              <p className="text-slate-500 font-mono">Slug: {categoryToDelete.slug}</p>
              <p className="text-indigo-600 font-semibold">{categoryToDelete.equipment_count || 0} associated items</p>
            </div>

            <p className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 leading-relaxed font-medium">
              Are you sure you want to delete this category? Categories with existing equipment listings cannot be deleted until listings are reassigned.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={submittingDelete}
                onClick={handleConfirmDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminCategoriesPage;
