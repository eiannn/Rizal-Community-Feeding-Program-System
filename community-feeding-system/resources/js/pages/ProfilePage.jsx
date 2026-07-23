import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  FiCamera,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiSave,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import AdminLayout from '../components/AdminLayout';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

function firstError(errors, field) {
  const value = errors?.[field];
  if (!value) return '';
  return Array.isArray(value) ? value[0] : String(value);
}

function readMeta(name) {
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
}

export default function ProfilePage({ authUser = null }) {
  const initialUser = {
    id: authUser?.id || null,
    name: authUser?.name || readMeta('auth-user-name') || 'System User',
    email: authUser?.email || readMeta('auth-user-email') || '',
    username: authUser?.username || readMeta('auth-user-username') || '',
    role: String(authUser?.role || readMeta('auth-user-role') || 'staff').toLowerCase(),
    status: String(authUser?.status || readMeta('auth-user-status') || 'active').toLowerCase(),
    profile_photo_url: authUser?.profile_photo_url || readMeta('auth-user-photo') || '',
  };

  const [currentUser, setCurrentUser] = useState(initialUser);
  const [profileForm, setProfileForm] = useState({
    name: initialUser.name,
    email: initialUser.email,
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const photoInputRef = useRef(null);
  const profileFormRef = useRef(null);

  const canEdit = currentUser.role === 'admin';
  const canUploadPhoto = true;
  const displayRole = currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Staff';
  const displayStatus = currentUser.status ? currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1) : 'Active';
  const identifier = currentUser.email || currentUser.username || 'No email or username available';

  const notify = (type, message) => {
    window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
  };

  const syncAuthenticatedUserDomData = (nextUser) => {
    const metaMap = {
      'auth-user-name': nextUser?.name || 'System User',
      'auth-user-email': nextUser?.email || '',
      'auth-user-username': nextUser?.username || '',
      'auth-user-role': nextUser?.role || currentUser.role,
      'auth-user-status': nextUser?.status || currentUser.status,
      'auth-user-photo': nextUser?.profile_photo_url || '',
    };

    Object.entries(metaMap).forEach(([name, value]) => {
      const meta = document.querySelector(`meta[name="${name}"]`);
      if (meta) meta.setAttribute('content', String(value));
    });

    const appRoot = document.getElementById('app');
    if (!appRoot?.dataset?.props) return;

    try {
      const parsed = JSON.parse(appRoot.dataset.props || '{}');
      parsed.authUser = {
        ...(parsed.authUser || {}),
        ...nextUser,
      };
      appRoot.dataset.props = JSON.stringify(parsed);
    } catch (error) {
      // The visible React state is already updated.
    }
  };

  const applyUserUpdate = (nextUser) => {
    const normalized = {
      ...currentUser,
      ...nextUser,
      role: String(nextUser?.role || currentUser.role).toLowerCase(),
      status: String(nextUser?.status || currentUser.status).toLowerCase(),
    };
    setCurrentUser(normalized);
    setProfileForm({
      name: normalized.name || '',
      email: normalized.email || '',
    });
    syncAuthenticatedUserDomData(normalized);
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !canUploadPhoto) return;

    if (!file.type.startsWith('image/')) {
      notify('error', 'Please select a valid image file.');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('profile_photo', file);
    setUploadingPhoto(true);

    axios
      .post('/app-data/users/profile-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((response) => {
        applyUserUpdate(response.data?.user || {});
        notify('success', 'Profile picture updated.');
      })
      .catch((error) => notify('error', error?.response?.data?.message || 'Unable to update profile picture.'))
      .finally(() => {
        setUploadingPhoto(false);
        if (photoInputRef.current) photoInputRef.current.value = '';
      });
  };

  const handleEditProfileClick = () => {
    if (!canEdit) return;

    profileFormRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleProfileSave = (event) => {
    event.preventDefault();
    if (!canEdit) return;

    setSavingProfile(true);
    setProfileErrors({});

    axios
      .patch('/app-data/profile', profileForm)
      .then((response) => {
        applyUserUpdate(response.data?.user || {});
        notify('success', 'Profile information updated.');
      })
      .catch((error) => {
        setProfileErrors(error?.response?.data?.errors || {});
        notify('error', error?.response?.data?.message || 'Unable to update profile.');
      })
      .finally(() => setSavingProfile(false));
  };

  const handlePasswordSave = (event) => {
    event.preventDefault();
    if (!canEdit) return;

    setSavingPassword(true);
    setPasswordErrors({});

    axios
      .put('/app-data/password', passwordForm)
      .then(() => {
        setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
        notify('success', 'Password updated.');
      })
      .catch((error) => {
        setPasswordErrors(error?.response?.data?.errors || {});
        notify('error', error?.response?.data?.message || 'Unable to update password.');
      })
      .finally(() => setSavingPassword(false));
  };

  const PasswordInput = ({ label, field, visibleKey, autoComplete }) => (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">{label}</label>
      <div className="relative">
        <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={showPasswordFields[visibleKey] ? 'text' : 'password'}
          value={passwordForm[field]}
          onChange={(event) => setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }))}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={() => setShowPasswordFields((prev) => ({ ...prev, [visibleKey]: !prev[visibleKey] }))}
          className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition hover:text-emerald-700"
          aria-label={showPasswordFields[visibleKey] ? 'Hide password' : 'Show password'}
        >
          {showPasswordFields[visibleKey] ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
        </button>
      </div>
      {firstError(passwordErrors, field) ? <p className="mt-1 text-xs text-rose-600">{firstError(passwordErrors, field)}</p> : null}
    </div>
  );

  return (
    <AdminLayout activePage="profile" title="Profile" authUser={currentUser}>
      <div className="text-slate-800">
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 p-8 text-white shadow-xl lg:p-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/15 text-xl font-black text-white">
                    {currentUser.profile_photo_url ? (
                      <img src={currentUser.profile_photo_url} alt={`${currentUser.name} profile`} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(currentUser.name)
                    )}
                  </span>
                  {canUploadPhoto ? (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Upload profile picture"
                      title="Upload profile picture"
                    >
                      <FiCamera className="h-4 w-4" />
                    </button>
                  ) : null}
                  <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onChange={handlePhotoUpload} className="hidden" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Signed in account</p>
                  <h2 className="mt-3 truncate text-3xl font-black tracking-tight lg:text-5xl">{currentUser.name}</h2>
                  <p className="mt-3 truncate text-base text-white/85">{identifier}</p>
                </div>
              </div>

              <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/75">Profile Mode</p>
                <p className="mt-1 text-lg font-black">{canEdit ? 'Admin Editable' : 'Staff View Only'}</p>
                {canEdit ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                    <button
                      type="button"
                      onClick={handleEditProfileClick}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                    >
                      <FiEdit3 className="h-4 w-4" />
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FiCamera className="h-4 w-4" />
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="max-w-xs text-sm text-emerald-50/80">
                      Your Staff account details are managed by an Admin.
                    </p>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FiCamera className="h-4 w-4" />
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {!canEdit ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="max-w-3xl">
                <h3 className="text-xl font-black text-slate-900">Account Details</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  This Staff profile is view-only. Your role and account information are managed by an Admin, and Staff accounts cannot change profile details, password, or account status from this page.
                </p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Complete Name</p>
                  <p className="mt-1 font-black text-slate-900">{currentUser.name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Account Identifier</p>
                  <p className="mt-1 font-black text-slate-900">{identifier}</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-2">
              <form ref={profileFormRef} onSubmit={handleProfileSave} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm scroll-mt-24">
                <div className="mb-5">
                  <h3 className="text-xl font-black text-slate-900">Profile Information</h3>
                  <p className="mt-1 text-sm text-slate-500">Update your Admin account name and email address.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">Complete Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                    {firstError(profileErrors, 'name') ? <p className="mt-1 text-xs text-rose-600">{firstError(profileErrors, 'name')}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                    {firstError(profileErrors, 'email') ? <p className="mt-1 text-xs text-rose-600">{firstError(profileErrors, 'email')}</p> : null}
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FiSave className="h-4 w-4" />
                    {savingProfile ? 'Saving Profile...' : 'Save Profile'}
                  </button>
                </div>
              </form>

              <form onSubmit={handlePasswordSave} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-xl font-black text-slate-900">Update Password</h3>
                  <p className="mt-1 text-sm text-slate-500">Only Admin accounts can change passwords from this profile page.</p>
                </div>
                <div className="space-y-4">
                  <PasswordInput label="Current Password" field="current_password" visibleKey="current" autoComplete="current-password" />
                  <PasswordInput label="New Password" field="password" visibleKey="next" autoComplete="new-password" />
                  <PasswordInput label="Confirm New Password" field="password_confirmation" visibleKey="confirm" autoComplete="new-password" />
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FiLock className="h-4 w-4" />
                    {savingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
