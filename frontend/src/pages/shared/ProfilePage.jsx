import React, { useState, useEffect } from 'react';
import { User, Lock, Building, Phone, Mail, IdCard, Star, Save, ShieldCheck } from 'lucide-react';
import { userApi } from '../../api/userApi';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/common/StarRating';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { formatDate } from '../../utils/formatters';

const ProfilePage = () => {
  const { user, updateCurrentUser, refreshUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Profile Form State
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await userApi.getProfile();
        if (res && res.data) {
          setProfileData(res.data);
          setFullName(res.data.full_name || '');
          setDepartment(res.data.department || '');
          setPhone(res.data.phone || '');
          setAvatarUrl(res.data.avatar_url || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError(err?.message || 'Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    setProfileSuccess(null);

    try {
      const res = await userApi.updateProfile({
        full_name: fullName.trim(),
        department: department.trim() || undefined,
        phone: phone.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });

      if (res && res.data) {
        setProfileData((prev) => ({ ...prev, ...res.data }));
        updateCurrentUser(res.data);
        setProfileSuccess('Profile updated successfully.');
        setTimeout(() => setProfileSuccess(null), 3000);
      }
    } catch (err) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordError('Please enter both current and new passwords.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      await userApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err) {
      setPasswordError(err?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading profile information..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Account & Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal university credentials, contact details, and account security
        </p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Profile Overview Card */}
      {profileData && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 font-extrabold text-2xl overflow-hidden shrink-0">
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt={profileData.full_name} className="w-full h-full object-cover" />
            ) : (
              profileData.full_name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>

          <div className="text-center sm:text-left flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-extrabold text-slate-900">{profileData.full_name}</h2>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {profileData.role}
              </span>
            </div>

            <p className="text-xs text-slate-500">{profileData.email}</p>

            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                Student ID: <strong className="text-indigo-600">{profileData.student_id}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>Joined: {formatDate(profileData.created_at)}</span>
            </div>

            {(profileData.rating_summary || profileData.seller_stats) && (
              <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs text-slate-500">Seller Rating:</span>
                <StarRating rating={(profileData.rating_summary || profileData.seller_stats)?.average_rating || 0} size="sm" showText />
                <span className="text-xs text-slate-400">
                  ({(profileData.rating_summary || profileData.seller_stats)?.total_reviews || 0} reviews)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
          <p className="text-xs text-slate-500 mt-0.5">Update your display name and campus contact details</p>
        </div>

        {profileSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              icon={User}
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="Department / Major"
              icon={Building}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Electrical Engineering"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 123-4567"
            />

            <Input
              label="Avatar Image URL (Optional)"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={savingProfile}
              icon={Save}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Security & Password</h3>
          <p className="text-xs text-slate-500 mt-0.5">Ensure your account uses a strong password</p>
        </div>

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {passwordSuccess}
          </div>
        )}

        <ErrorAlert message={passwordError} onDismiss={() => setPasswordError(null)} />

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            icon={Lock}
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              icon={Lock}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />

            <Input
              label="Confirm New Password"
              type="password"
              icon={Lock}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              loading={savingPassword}
              icon={Lock}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
