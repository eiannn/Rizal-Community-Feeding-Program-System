import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  FiCamera,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import AdminLayout from '../components/AdminLayout';

const emptyCreateForm = {
  name: '',
  email_or_username: '',
  password: '',
  password_confirmation: '',
};

const statusTone = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-amber-50 text-amber-700 border-amber-200',
  blocked: 'bg-rose-50 text-rose-700 border-rose-200',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

function getFirstError(errors, field) {
  const value = errors?.[field];
  if (!value) return '';
  return Array.isArray(value) ? value[0] : String(value);
}

export default function UsersPage({ authUser = null, openCreateStaff = false }) {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All Status');
  const [form, setForm] = useState(emptyCreateForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(authUser?.id || null);
  const [currentAuthUser, setCurrentAuthUser] = useState(() => ({
    id: authUser?.id || null,
    name: authUser?.name || 'System User',
    email: authUser?.email || '',
    username: authUser?.username || '',
    role: authUser?.role || 'admin',
    display_role: authUser?.display_role || 'Admin',
    profile_photo_url: authUser?.profile_photo_url || '',
  }));
  const photoInputRef = useRef(null);

  const notify = (type, message) => {
    window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
  };

  useEffect(() => {
    setCurrentAuthUser({
      id: authUser?.id || null,
      name: authUser?.name || 'System User',
      email: authUser?.email || '',
      username: authUser?.username || '',
      role: authUser?.role || 'admin',
      display_role: authUser?.display_role || 'Admin',
      profile_photo_url: authUser?.profile_photo_url || '',
    });
    setCurrentUserId(authUser?.id || null);
  }, [authUser]);

  const syncAuthenticatedUserDomData = (nextUser) => {
    const metaMap = {
      'auth-user-name': nextUser?.name || 'System User',
      'auth-user-email': nextUser?.email || '',
      'auth-user-username': nextUser?.username || '',
      'auth-user-role': nextUser?.role || 'admin',
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
      // Keep the visible profile updated even if serialized props cannot be rewritten.
    }
  };

  const loadAccounts = () => {
    setLoadingAccounts(true);
    return axios
      .get('/app-data/users', {
        params: {
          query,
          status,
        },
      })
      .then((response) => {
        setAccounts(response.data?.data || []);
        setCurrentUserId(response.data?.current_user_id || null);
        if (response.data?.auth_user) {
          setCurrentAuthUser(response.data.auth_user);
          syncAuthenticatedUserDomData(response.data.auth_user);
        }
      })
      .finally(() => setLoadingAccounts(false));
  };

  useEffect(() => {
    loadAccounts().catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAccounts().catch(() => {});
    }, 220);

    return () => clearTimeout(timeout);
  }, [query, status]);

  const stats = useMemo(() => {
    const staff = accounts.filter((account) => account.role === 'staff').length;

    return [
      { label: 'Total Accounts', value: accounts.length, icon: FiUsers },
      { label: 'Active Staff', value: staff, icon: FiShield },
    ];
  }, [accounts]);

  const displayName = currentAuthUser?.name || 'System User';
  const displayIdentifier = currentAuthUser?.email || currentAuthUser?.username || 'No identifier available';

  const handleUploadProfilePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('error', 'Please select a valid image file.');
      event.target.value = '';
      return;
    }

    setUploadingProfilePhoto(true);

    const formData = new FormData();
    formData.append('profile_photo', file);

    axios
      .post('/app-data/users/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        const nextUser = response.data?.user || currentAuthUser;
        setCurrentAuthUser(nextUser);
        syncAuthenticatedUserDomData(nextUser);
        notify('success', 'Profile picture updated.');
      })
      .catch((error) => {
        notify('error', error?.response?.data?.message || 'Unable to update profile picture.');
      })
      .finally(() => {
        setUploadingProfilePhoto(false);
        if (photoInputRef.current) {
          photoInputRef.current.value = '';
        }
      });
  };

  const validateCreateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Complete name is required.';
    if (!form.email_or_username.trim()) nextErrors.email_or_username = 'Email or username is required.';
    if (!form.password) nextErrors.password = 'Temporary password is required.';
    if (!form.password_confirmation) nextErrors.password_confirmation = 'Please confirm the temporary password.';
    if (form.password && form.password_confirmation && form.password !== form.password_confirmation) {
      nextErrors.password_confirmation = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateStaff = (event) => {
    event.preventDefault();
    if (!validateCreateForm()) return;

    setSavingStaff(true);
    setErrors({});

    axios
      .post('/app-data/users', form)
      .then(() => {
        setForm(emptyCreateForm);
        setShowPassword(false);
        setShowConfirmPassword(false);
        notify('success', 'Staff account created successfully.');
        loadAccounts().catch(() => {});
      })
      .catch((error) => {
        const responseErrors = error?.response?.data?.errors || {};
        setErrors(responseErrors);
        notify('error', error?.response?.data?.message || 'Unable to create Staff account.');
      })
      .finally(() => setSavingStaff(false));
  };

  const handleStatusChange = (account, nextStatus) => {
    axios
      .patch(`/app-data/users/${account.id}/status`, { status: nextStatus })
      .then(() => {
        notify('success', 'User status updated.');
        loadAccounts().catch(() => {});
      })
      .catch((error) => {
        notify('error', error?.response?.data?.message || 'Unable to update user status.');
      });
  };

  const handleDeleteAccount = (account) => {
    if (account.id === currentUserId) {
      notify('error', 'You cannot delete your own account.');
      return;
    }

    if (!window.confirm(`Delete ${account.name} permanently? This cannot be undone.`)) {
      return;
    }

    setDeletingAccountId(account.id);

    axios
      .delete(`/app-data/users/${account.id}`)
      .then(() => {
        notify('success', 'Staff account deleted permanently.');
        loadAccounts().catch(() => {});
      })
      .catch((error) => {
        notify('error', error?.response?.data?.message || 'Unable to delete staff account.');
      })
      .finally(() => {
        setDeletingAccountId(null);
      });
  };

  return (
    <AdminLayout activePage="users" title="User Management" authUser={currentAuthUser}>
      <div className="text-slate-800">
        <div className="space-y-8">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 p-8 text-white shadow-xl lg:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Admin Dashboard</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight lg:text-5xl">User Management</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-lg border border-white/15 bg-white/10 p-4">
                      <Icon className="h-5 w-5 text-lime-100" />
                      <p className="mt-3 text-2xl font-black">{item.value}</p>
                      <p className="text-xs font-semibold text-emerald-50/80">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
                  {currentAuthUser?.profile_photo_url ? (
                    <img src={currentAuthUser.profile_photo_url} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(displayName)
                  )}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingProfilePhoto}
                    className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
                    aria-label="Change profile picture"
                    title="Change profile picture"
                  >
                    <FiCamera className="h-3.5 w-3.5" />
                  </button>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Signed in account</p>
                  <h3 className="truncate text-xl font-black text-slate-900">{displayName}</h3>
                  <p className="truncate text-sm text-slate-500">{displayIdentifier}</p>
                  <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {currentAuthUser?.display_role || 'Admin'}
                  </span>
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handleUploadProfilePhoto}
                className="hidden"
              />
              {uploadingProfilePhoto ? <p className="mt-4 text-sm text-slate-500">Uploading profile picture...</p> : null}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <form id={openCreateStaff ? 'create-staff' : undefined} onSubmit={handleCreateStaff} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <FiUserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Create Staff Account</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Complete Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Juan Dela Cruz"
                    autoComplete="name"
                  />
                  {getFirstError(errors, 'name') ? <p className="mt-1 text-xs text-rose-600">{getFirstError(errors, 'name')}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Email or Username</label>
                  <div className="relative">
                    <FiMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.email_or_username}
                      onChange={(event) => setForm((prev) => ({ ...prev, email_or_username: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 pl-10 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      placeholder="name@gmail.com"
                      autoComplete="username"
                    />
                  </div>
                  {getFirstError(errors, 'email_or_username') ? <p className="mt-1 text-xs text-rose-600">{getFirstError(errors, 'email_or_username')}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
                  <div className="relative">
                    <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition hover:text-emerald-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                  {getFirstError(errors, 'password') ? <p className="mt-1 text-xs text-rose-600">{getFirstError(errors, 'password')}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.password_confirmation}
                      onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition hover:text-emerald-700"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                  {getFirstError(errors, 'password_confirmation') ? <p className="mt-1 text-xs text-rose-600">{getFirstError(errors, 'password_confirmation')}</p> : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-400">Role</p>
                    <p className="text-sm font-black text-slate-800">Staff</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-400">Status</p>
                    <p className="text-sm font-black text-slate-800">Active</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingStaff}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FiUserPlus className="h-4 w-4" />
                  {savingStaff ? 'Creating Staff...' : 'Create Staff Account'}
                </button>
              </div>
            </form>

            <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Authorized Personnel</h3>
                    <p className="text-sm text-slate-500">Only Admin and Staff accounts can access the system.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadAccounts().then(() => notify('success', 'Users list refreshed.')).catch(() => notify('error', 'Unable to refresh users list.'))}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="relative">
                    <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 pl-10 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Search name, email, or username"
                    />
                  </div>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option>All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingAccounts ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-6 text-center text-slate-500">Loading authorized personnel...</td>
                      </tr>
                    ) : null}

                    {!loadingAccounts && accounts.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-6 text-center text-slate-500">No user accounts found.</td>
                      </tr>
                    ) : null}

                    {!loadingAccounts && accounts.map((account) => {
                      const isCurrent = Number(currentUserId) === Number(account.id);
                      const identifier = account.email || account.username || 'No identifier';

                      return (
                        <tr key={account.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                                {account.profile_photo_url ? (
                                  <img src={account.profile_photo_url} alt={`${account.name} profile`} className="h-full w-full object-cover" />
                                ) : (
                                  getInitials(account.name)
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-black text-slate-900">
                                  {account.name}
                                  {isCurrent ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">You</span> : null}
                                </p>
                                <p className="truncate text-xs text-slate-500">{identifier}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              {account.display_role || 'Staff'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusTone[account.status] || statusTone.inactive}`}>
                              {account.display_status || 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(account)}
                              disabled={isCurrent || deletingAccountId === account.id}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              title={isCurrent ? 'You cannot delete your own account.' : 'Delete staff account permanently'}
                            >
                              <FiTrash className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
