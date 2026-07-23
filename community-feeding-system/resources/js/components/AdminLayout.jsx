import React, { useEffect, useRef, useState } from 'react';
import AppIcon from './AppIcon';

const navigation = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { key: 'beneficiaries', label: 'Beneficiaries', href: '/beneficiaries', icon: 'beneficiaries' },
  { key: 'schedules', label: 'Schedules', href: '/schedules', icon: 'schedules' },
  { key: 'attendance', label: 'Attendance', href: '/attendance', icon: 'attendance' },
  { key: 'nutrition', label: 'Nutrition', href: '/nutrition', icon: 'nutrition' },
  { key: 'reports', label: 'Reports', href: '/reports', icon: 'reports' },
  { key: 'users', label: 'User Management', href: '/users', icon: 'users', adminOnly: true },
];

export default function AdminLayout({ activePage, children, authUser = null }) {
  const systemName = 'Community Feeding Program Monitoring System in Barangay Rizal Bansalan';
  const loggedInUser = (() => {
    if (typeof document === 'undefined') {
      return {
        name: 'System User',
        email: '',
        profilePhotoUrl: '',
      };
    }

    let propsUserName = '';
    let propsUserEmail = '';
    let propsUserPhoto = '';
    let propsUserRole = '';
    let propsUserUsername = '';
    try {
      const appRoot = document.getElementById('app');
      const rawProps = appRoot?.dataset?.props;
      if (rawProps) {
        const parsed = JSON.parse(rawProps);
        propsUserName = String(parsed?.authUser?.name || '').trim();
        propsUserEmail = String(parsed?.authUser?.email || '').trim();
        propsUserPhoto = String(parsed?.authUser?.profile_photo_url || '').trim();
        propsUserRole = String(parsed?.authUser?.role || '').trim().toLowerCase();
        propsUserUsername = String(parsed?.authUser?.username || '').trim();
      }
    } catch (error) {
      propsUserName = '';
      propsUserEmail = '';
      propsUserPhoto = '';
      propsUserRole = '';
      propsUserUsername = '';
    }

    const metaUserName = String(document.querySelector('meta[name="auth-user-name"]')?.getAttribute('content') || '').trim();
    const metaUserEmail = String(document.querySelector('meta[name="auth-user-email"]')?.getAttribute('content') || '').trim();
    const metaUserUsername = String(document.querySelector('meta[name="auth-user-username"]')?.getAttribute('content') || '').trim();
    const metaUserRole = String(document.querySelector('meta[name="auth-user-role"]')?.getAttribute('content') || '').trim().toLowerCase();
    const metaUserPhoto = String(document.querySelector('meta[name="auth-user-photo"]')?.getAttribute('content') || '').trim();
    const propUserName = String(authUser?.name || '').trim();
    const propUserEmail = String(authUser?.email || '').trim();
    const propUserUsername = String(authUser?.username || '').trim();
    const propUserRole = String(authUser?.role || '').trim().toLowerCase();
    const propUserPhoto = String(authUser?.profile_photo_url || '').trim();
    const role = propUserRole || propsUserRole || metaUserRole || 'staff';

    return {
      name: propUserName || propsUserName || metaUserName || 'System User',
      email: propUserEmail || propsUserEmail || metaUserEmail || '',
      username: propUserUsername || propsUserUsername || metaUserUsername || '',
      role,
      displayRole: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff',
      profilePhotoUrl: propUserPhoto || propsUserPhoto || metaUserPhoto || '',
    };
  })();
  const loggedInInitials = (loggedInUser.name || 'System User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'SU';
  const [notification, setNotification] = useState(null);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hideTimerRef = useRef(null);
  const navigationTimerRef = useRef(null);
  const prefetchedRef = useRef(new Set());
  const usersMenuRef = useRef(null);
  const canManageUsers = loggedInUser.role === 'admin';
  const mainNavigation = navigation.filter((item) => item.key !== 'users' && (canManageUsers || !item.adminOnly));
  const usersNavigation = canManageUsers ? navigation.find((item) => item.key === 'users') : null;
  const layoutTheme = {
    '--sidebar-base': '#05231c',
    '--sidebar-mid': '#083328',
    '--sidebar-edge': '#031811',
  };

  const showNotification = (detail = {}) => {
    const type = detail.type || 'success';

    setNotification({
      type,
      title: detail.title || (type === 'error' ? 'Action failed' : 'Success'),
      message: detail.message || 'Done.',
    });

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 2800);
  };

  const prefetchRoute = (href) => {
    if (!href || prefetchedRef.current.has(href)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
    prefetchedRef.current.add(href);
  };

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReduceMotion(motionQuery.matches);
    syncMotionPreference();
    motionQuery.addEventListener('change', syncMotionPreference);

    const runPrefetch = () => {
      navigation.forEach((item) => prefetchRoute(item.href));
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runPrefetch);
    } else {
      setTimeout(runPrefetch, 300);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
      motionQuery.removeEventListener('change', syncMotionPreference);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (event) => {
      if (usersMenuRef.current && !usersMenuRef.current.contains(event.target)) {
        setUsersMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    const onNotify = (event) => {
      showNotification(event?.detail || {});
    };

    window.addEventListener('app:notify', onNotify);

    let loginSuccessMessage = '';
    try {
      loginSuccessMessage = window.sessionStorage.getItem('app:login-success') || '';
      window.sessionStorage.removeItem('app:login-success');
    } catch (error) {
      loginSuccessMessage = '';
    }

    if (!loginSuccessMessage) {
      try {
        const appRoot = document.getElementById('app');
        const props = appRoot?.dataset?.props ? JSON.parse(appRoot.dataset.props) : {};
        loginSuccessMessage = props?.flash?.signed_in_success || '';
      } catch (error) {
        loginSuccessMessage = '';
      }
    }

    if (loginSuccessMessage) {
      showNotification({ type: 'success', title: 'Success', message: loginSuccessMessage });
    }

    return () => window.removeEventListener('app:notify', onNotify);
  }, []);

  const handleNavigate = (event, href) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    const current = `${window.location.pathname}${window.location.search}`;
    const target = new URL(href, window.location.origin);
    const next = `${target.pathname}${target.search}`;

    if (current === next) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
    }

    if (reduceMotion) {
      window.location.assign(href);
      return;
    }

    setIsNavigatingAway(true);
    navigationTimerRef.current = setTimeout(() => {
      window.location.assign(href);
    }, 140);
  };

  const handleSidebarToggle = (mobile = false) => {
    if (mobile) {
      setMobileNavOpen(false);
      return;
    }

    setSidebarCollapsed((prev) => !prev);
    setUsersMenuOpen(false);
  };

  const handleManageAccounts = (event, mobile = false) => {
    if (!usersNavigation?.href) {
      return;
    }

    if (mobile) {
      setMobileNavOpen(false);
    }

    setUsersMenuOpen(false);
    handleNavigate(event, usersNavigation.href);
  };

  const renderSidebar = (mobile = false) => {
    const collapsed = !mobile && sidebarCollapsed;

    return (
      <>
        <div
          className={`${
            collapsed
              ? 'px-2 py-4'
              : `px-4 py-4 ${mobile ? 'pr-12' : ''}`
          } border-b border-emerald-900/55`}
        >
          <div className={`w-full flex ${collapsed ? 'justify-center' : 'items-start gap-3'}`}>
            {collapsed ? (
              <button
                type="button"
                onClick={() => handleSidebarToggle(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)] transition hover:scale-105"
                aria-label="Expand sidebar"
              >
                <img src="/images/system-logo.png" alt="System logo" className="h-full w-full object-contain object-center" />
              </button>
            ) : (
              <>
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]">
                  <img src="/images/system-logo.png" alt="System logo" className="h-full w-full object-contain object-center" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="break-words text-[13px] font-bold leading-snug text-emerald-50">
                    {systemName}
                  </p>
                </div>
                {!mobile && (
                  <button
                    type="button"
                    onClick={() => handleSidebarToggle(false)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-emerald-100 transition hover:text-white"
                    aria-label="Collapse sidebar"
                  >
                    <AppIcon name="panel" className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className={`${collapsed ? 'px-2' : 'px-2'} flex-1 overflow-y-auto py-4`}>
          {!collapsed && <p className="px-3 mb-2 text-[11px] font-semibold tracking-[0.14em] text-emerald-200/45 uppercase">Main Menu</p>}
          <nav className="space-y-0.5">
            {mainNavigation.map((item) => {
              const active = item.key === activePage;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
                  onClick={(event) => {
                    if (mobile) {
                      setMobileNavOpen(false);
                    }
                    handleNavigate(event, item.href);
                  }}
                  className={`group flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600/35 via-emerald-700/30 to-emerald-900/5 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-zinc-200 hover:bg-emerald-500/10 hover:text-emerald-50'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <AppIcon
                    name={item.icon}
                    className={`h-5 w-5 transition ${
                      active ? 'text-emerald-100' : 'text-zinc-300 group-hover:text-emerald-100'
                    }`}
                  />
                  {!collapsed && <span className="text-base font-medium">{item.label}</span>}
                </a>
              );
            })}
          </nav>
        </div>

        <div className={`${collapsed ? 'px-2' : 'px-3'} pb-3 pt-2 border-t border-emerald-900/45`} ref={usersMenuRef}>
            {collapsed ? (
              <button
                type="button"
                onClick={() => setUsersMenuOpen((prev) => !prev)}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/12 text-emerald-100 transition hover:bg-emerald-500/20"
                title={loggedInUser.name}
              >
                <AppIcon name="userProfile" className="h-5 w-5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setUsersMenuOpen((prev) => !prev)}
                  className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                    activePage === 'users'
                      ? 'bg-emerald-500/16 text-emerald-50'
                      : 'text-zinc-200 hover:bg-emerald-500/10 hover:text-emerald-50'
                  }`}
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-300/30 bg-emerald-500/20 text-xs font-bold text-emerald-50 shadow-[0_10px_20px_rgba(16,185,129,0.25)]">
                    {loggedInUser.profilePhotoUrl ? (
                      <img
                        src={loggedInUser.profilePhotoUrl}
                        alt={`${loggedInUser.name} profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      loggedInInitials
                    )}
                  </span>
                  <div className="leading-tight flex-1">
                    <p className="truncate text-sm font-semibold text-emerald-50">{loggedInUser.name}</p>
                    <p className="truncate text-[12px] text-emerald-100/75">
                      {loggedInUser.displayRole} {loggedInUser.email ? `- ${loggedInUser.email}` : ''}
                    </p>
                  </div>
                  <AppIcon
                    name="chevronDown"
                    className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${usersMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {usersMenuOpen && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-emerald-700/30 bg-black/30 backdrop-blur-sm">
                    <a
                      href="/profile"
                      onClick={(event) => handleNavigate(event, '/profile')}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-emerald-100 transition hover:bg-emerald-500/10"
                    >
                      <AppIcon name="userProfile" className="h-3.5 w-3.5" />
                      Profile
                    </a>
                    <form method="POST" action="/logout">
                      <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.content || ''} />
                      <button
                        type="submit"
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/10"
                      >
                        <AppIcon name="logout" className="h-3.5 w-3.5" />
                        Logout
                      </button>
                    </form>
                  </div>
                )}

                {usersNavigation && (
                  <a
                    href={usersNavigation.href}
                    onMouseEnter={() => prefetchRoute(usersNavigation.href)}
                    onFocus={() => prefetchRoute(usersNavigation.href)}
                    onClick={(event) => handleManageAccounts(event, mobile)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/8 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/16"
                  >
                    <AppIcon name="users" className="h-4 w-4" />
                    Manage accounts
                  </a>
                )}
              </>
            )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800" style={layoutTheme}>
      <aside className={`hidden lg:flex fixed top-0 left-0 h-screen ${sidebarCollapsed ? 'w-20' : 'w-[305px]'} bg-gradient-to-b from-[var(--sidebar-base)] via-[var(--sidebar-mid)] to-[var(--sidebar-edge)] border-r border-emerald-900/45 shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex-col transition-all duration-300`}>
        {renderSidebar(false)}
      </aside>

      <div className={`flex-1 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-[305px]'} relative transition-all duration-300`}>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className={`${mobileNavOpen ? 'hidden' : 'inline-flex'} lg:hidden fixed left-4 top-4 z-40 h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/35 bg-[#06241d]/95 text-emerald-100 shadow-lg backdrop-blur-sm transition hover:bg-[#083328]`}
          aria-label="Open sidebar navigation"
        >
          <AppIcon name="menu" className="h-5 w-5" />
        </button>

        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-black/60"
              aria-label="Close navigation overlay"
            />
            <aside className="relative h-full w-[90%] max-w-[305px] bg-gradient-to-b from-[var(--sidebar-base)] via-[var(--sidebar-mid)] to-[var(--sidebar-edge)] border-r border-emerald-900/45 flex flex-col">
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex items-center justify-center rounded-md border border-emerald-500/35 bg-emerald-500/10 p-1.5 text-emerald-100"
                  aria-label="Close navigation"
                >
                  <AppIcon name="x" className="h-4 w-4" />
                </button>
              </div>
              {renderSidebar(true)}
            </aside>
          </div>
        )}

        <main
          className={`relative z-10 pt-16 pb-8 lg:pt-0 transition-[opacity,transform] duration-200 ease-out ${
            reduceMotion
              ? ''
              : isNavigatingAway
                ? 'opacity-85 translate-y-1 pointer-events-none'
                : 'opacity-100 translate-y-0'
          }`}
        >
          <div className={`px-4 pt-6 lg:px-10 lg:pt-8 space-y-8 ${reduceMotion ? '' : 'page-fade-light'}`}>
            {children}
          </div>
        </main>
      </div>

      {notification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 pointer-events-none">
          <div
            className={`rounded-2xl border px-5 py-3.5 shadow-lg min-w-[260px] max-w-[380px] pointer-events-auto ${
              notification.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <p className="text-sm font-semibold">{notification.title || (notification.type === 'error' ? 'Action failed' : 'Success')}</p>
            <p className="text-sm mt-1">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
