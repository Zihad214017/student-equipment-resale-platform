import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Power, Edit3, Shield, UserCheck, UserX, Eye, ShieldAlert, CheckCircle, UserPlus } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatDate } from '../../utils/formatters';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // View User Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Status Toggle Confirmation Modal
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [submittingToggle, setSubmittingToggle] = useState(false);

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    student_id: '',
    full_name: '',
    email: '',
    password: '',
    department: '',
    phone: '',
    role: 'student',
    is_active: true,
  });
  const [createErrors, setCreateErrors] = useState([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';

      const res = await adminApi.getUsers(params);
      if (res && res.data) {
        setUsers(res.data);
        if (res.meta) {
          setPagination({
            currentPage: res.meta.currentPage,
            totalPages: res.meta.totalPages,
            totalItems: res.meta.totalItems,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err?.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, activeFilter]);

  useEffect(() => {
    fetchUsers(pagination.currentPage);
  }, [pagination.currentPage, roleFilter, activeFilter, fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchUsers(1);
  };

  const handleOpenDetails = (user) => {
    setSelectedUser(user);
    setDetailsModalOpen(true);
  };

  const handleOpenToggle = (user) => {
    setUserToToggle(user);
    setToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!userToToggle) return;

    setSubmittingToggle(true);
    try {
      const nextStatus = !userToToggle.is_active;
      await adminApi.toggleUserStatus(userToToggle.id, nextStatus);

      setToggleModalOpen(false);
      setActionSuccess(
        `Account for ${userToToggle.full_name} has been ${nextStatus ? 'reactivated' : 'deactivated'}.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers(pagination.currentPage);
    } catch (err) {
      setError(err?.message || 'Failed to toggle user status.');
    } finally {
      setSubmittingToggle(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditDepartment(user.department || '');
    setEditPhone(user.phone || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmittingEdit(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        full_name: editFullName.trim(),
        department: editDepartment.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });

      setEditModalOpen(false);
      setActionSuccess(`User information for ${editingUser.full_name} updated successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers(pagination.currentPage);
    } catch (err) {
      setError(err?.message || 'Failed to update user details.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmittingCreate(true);
    setCreateErrors([]);
    try {
      await adminApi.createUser({
        student_id: createFormData.student_id.trim(),
        full_name: createFormData.full_name.trim(),
        email: createFormData.email.trim(),
        password: createFormData.password,
        department: createFormData.department.trim() || undefined,
        phone: createFormData.phone.trim() || undefined,
        role: createFormData.role,
        is_active: createFormData.is_active,
      });

      setCreateModalOpen(false);
      setCreateFormData({
        student_id: '',
        full_name: '',
        email: '',
        password: '',
        department: '',
        phone: '',
        role: 'student',
        is_active: true,
      });
      setActionSuccess(`New ${createFormData.role} account created successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers(1);
    } catch (err) {
      setCreateErrors(err?.errors || [err?.message || 'Failed to create user account.']);
    } finally {
      setSubmittingCreate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit registered student accounts, toggle active status, and maintain platform security
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => {
              setCreateErrors([]);
              setCreateModalOpen(true);
            }}
          >
            Create Account
          </Button>
        </div>
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search name, email, student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPagination((prev) => ({ ...prev, currentPage: 1 }));
            }}
            className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="admin">Administrators</option>
          </select>

          {/* Active Status Filter */}
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPagination((prev) => ({ ...prev, currentPage: 1 }));
            }}
            className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="deactivated">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading user directory..." />
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Student / User</th>
                    <th className="py-3.5 px-4">Student ID</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{u.full_name}</span>
                        <span className="text-[11px] text-slate-400">{u.email}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{u.student_id}</td>
                      <td className="py-3.5 px-4">{u.department || 'General'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(u.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View User Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit User Info"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Status Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenToggle(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_active
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.is_active ? 'Deactivate Account' : 'Reactivate Account'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-100">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="No users match your criteria"
            description="Try clearing your search query or reset role filters."
          />
        )}
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="User Account Details"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900">{selectedUser.full_name}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${selectedUser.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {selectedUser.is_active ? 'Active' : 'Deactivated'}
                </span>
              </div>
              <p className="text-slate-500">{selectedUser.email}</p>
              <div className="pt-2 grid grid-cols-2 gap-2 text-slate-700">
                <div><strong>Student ID:</strong> {selectedUser.student_id}</div>
                <div><strong>Department:</strong> {selectedUser.department || 'N/A'}</div>
                <div><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</div>
                <div><strong>Role:</strong> <span className="uppercase font-semibold text-indigo-600">{selectedUser.role}</span></div>
                <div className="col-span-2"><strong>Account Created:</strong> {formatDate(selectedUser.created_at)}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivation / Reactivation Confirmation Modal */}
      <Modal
        isOpen={toggleModalOpen}
        onClose={() => setToggleModalOpen(false)}
        title={userToToggle?.is_active ? 'Deactivate User Account' : 'Reactivate User Account'}
      >
        {userToToggle && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">{userToToggle.full_name}</p>
              <p className="text-slate-500">{userToToggle.email} ({userToToggle.student_id})</p>
            </div>

            {userToToggle.is_active ? (
              <p className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 leading-relaxed font-medium">
                Deactivating this user will revoke their login access immediately and prevent them from submitting purchase offers or posting equipment listings.
              </p>
            ) : (
              <p className="text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100 leading-relaxed font-medium">
                Reactivating this user will restore their ability to log in, browse the marketplace, and participate in campus exchanges.
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setToggleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant={userToToggle.is_active ? 'danger' : 'success'}
                loading={submittingToggle}
                onClick={handleConfirmToggle}
              >
                Confirm {userToToggle.is_active ? 'Deactivation' : 'Reactivation'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Administrative Edit User Profile"
      >
        {editingUser && (
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-900">{editingUser.email}</p>
              <p className="text-slate-500 font-mono">ID: {editingUser.student_id}</p>
            </div>

            <Input
              label="Full Name"
              required
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
            />

            <Input
              label="Department"
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
            />

            <Input
              label="Phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create User / Admin Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create University Account"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
          <p className="text-slate-500 leading-relaxed text-[11px]">
            Manually register a verified student or create a new system administrator with administrative privileges.
          </p>

          <ErrorAlert
            errors={createErrors}
            onDismiss={() => setCreateErrors([])}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Student / Staff ID"
              required
              placeholder="e.g. STU-2026-0042 or ADMIN-002"
              value={createFormData.student_id}
              onChange={(e) => setCreateFormData({ ...createFormData, student_id: e.target.value })}
            />

            <Input
              label="Full Name"
              required
              placeholder="e.g. Jane Doe"
              value={createFormData.full_name}
              onChange={(e) => setCreateFormData({ ...createFormData, full_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="University Email"
              type="email"
              required
              placeholder="e.g. user@university.edu"
              value={createFormData.email}
              onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
            />

            <Input
              label="Initial Password"
              type="password"
              required
              placeholder="Min. 6 characters"
              value={createFormData.password}
              onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Department"
              placeholder="e.g. Computer Science"
              value={createFormData.department}
              onChange={(e) => setCreateFormData({ ...createFormData, department: e.target.value })}
            />

            <Input
              label="Phone Number"
              placeholder="e.g. +1 (555) 019-2831"
              value={createFormData.phone}
              onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Account Role
              </label>
              <select
                value={createFormData.role}
                onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 py-2 px-3 bg-white text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="student">Student (Buyer / Seller)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Initial Account Status
              </label>
              <select
                value={createFormData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setCreateFormData({ ...createFormData, is_active: e.target.value === 'active' })}
                className="w-full text-xs rounded-xl border border-slate-200 py-2 px-3 bg-white text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="active">Active (Can Sign In Immediately)</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {createFormData.role === 'admin' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              <strong className="font-semibold block">⚠️ Caution: Administrator Privileges</strong>
              This user will have full access to platform reports, listings moderation, user suspension, and financial transaction audits.
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submittingCreate}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
