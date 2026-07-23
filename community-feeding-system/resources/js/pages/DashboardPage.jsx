import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import AppIcon from '../components/AppIcon';

export default function DashboardPage({ authUser = null, dashboardRole = null }) {
  const [stats, setStats] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const notify = (type, message) => {
    window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
  };

  const loadDashboard = () => {
    setLoading(true);

    return axios
      .get('/app-data/dashboard')
      .then((response) => {
        setStats(response.data.stats);
        setUpdatedAt(new Date());
      })
      .catch((error) => {
        setStats(null);
        throw error;
      })
      .finally(() => setLoading(false));
  };

  const handleRefreshList = () => {
    loadDashboard()
      .then(() => notify('success', 'Dashboard refreshed.'))
      .catch(() => notify('error', 'Unable to refresh dashboard.'));
  };

  useEffect(() => {
    loadDashboard().catch(() => {});
  }, []);

  const cards = useMemo(() => {
    const totalBeneficiaries = Number(stats?.total_beneficiaries ?? 0);
    const activeBeneficiaries = Number(stats?.active_beneficiaries ?? 0);
    const activeRate = totalBeneficiaries > 0 ? Math.round((activeBeneficiaries / totalBeneficiaries) * 100) : 0;

    const attendanceTotal = Number(stats?.attendance_total ?? 0);
    const presentToday = Number(stats?.present_today ?? 0);
    const dailyAttendanceRate = attendanceTotal > 0 ? Math.round((presentToday / attendanceTotal) * 100) : 0;

    const todaySchedules = Number(stats?.today_schedules ?? 0);
    const upcomingSchedules = Number(stats?.upcoming_schedules ?? 0);
    const scheduleReadiness = todaySchedules + upcomingSchedules > 0
      ? Math.round((todaySchedules / (todaySchedules + upcomingSchedules)) * 100)
      : 0;

    const nutritionRecords = Number(stats?.nutrition_records ?? 0);
    const nutritionCoverage = activeBeneficiaries > 0 ? Math.round((nutritionRecords / activeBeneficiaries) * 100) : 0;

    return [
      {
        title: 'Active Beneficiaries',
        value: activeBeneficiaries,
        note: `${activeRate}% of total records are active`,
        icon: 'beneficiaries',
        iconBg: 'bg-lime-50',
        iconText: 'text-lime-700',
        progress: activeRate,
      },
      {
        title: 'Present Today',
        value: presentToday,
        note: `${dailyAttendanceRate}% against total attendance logs`,
        icon: 'attendance',
        iconBg: 'bg-emerald-50',
        iconText: 'text-emerald-700',
        progress: dailyAttendanceRate,
      },
      {
        title: 'Schedules Today',
        value: todaySchedules,
        note: `${scheduleReadiness}% of active schedule pipeline`,
        icon: 'calendar',
        iconBg: 'bg-green-50',
        iconText: 'text-green-700',
        progress: scheduleReadiness,
      },
      {
        title: 'Nutrition Records',
        value: nutritionRecords,
        note: `${nutritionCoverage}% coverage vs active beneficiaries`,
        icon: 'nutrition',
        iconBg: 'bg-amber-50',
        iconText: 'text-amber-700',
        progress: nutritionCoverage > 100 ? 100 : nutritionCoverage,
      },
    ];
  }, [stats]);

  const insights = useMemo(() => {
    const total = Number(stats?.total_beneficiaries ?? 0);
    const active = Number(stats?.active_beneficiaries ?? 0);
    const presentToday = Number(stats?.present_today ?? 0);
    const nutritionRecords = Number(stats?.nutrition_records ?? 0);

    return [
      {
        label: 'Beneficiary Activation',
        value: total > 0 ? `${Math.round((active / total) * 100)}%` : '0%',
        desc: `${active} active out of ${total} total beneficiaries`,
        tone: 'bg-lime-50 text-lime-700',
      },
      {
        label: 'Attendance Pulse',
        value: `${presentToday}`,
        desc: 'Children marked present for today',
        tone: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Nutrition Coverage',
        value: active > 0 ? `${Math.round((nutritionRecords / active) * 100)}%` : '0%',
        desc: `${nutritionRecords} nutrition assessments recorded`,
        tone: 'bg-amber-50 text-amber-700',
      },
    ];
  }, [stats]);

  const quickActions = [
    { label: 'Encode Attendance', href: '/attendance', icon: 'attendance', detail: 'Mark daily child attendance' },
    { label: 'Manage Beneficiaries', href: '/beneficiaries', icon: 'beneficiaries', detail: 'Update child profiles and status' },
    { label: 'Plan Schedules', href: '/schedules', icon: 'schedules', detail: 'Create and adjust sessions' },
  ];

  const nowLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  const profile = useMemo(() => {
    const readMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
    const role = String(authUser?.role || dashboardRole || readMeta('auth-user-role') || 'staff').trim().toLowerCase();

    return {
      name: authUser?.name || readMeta('auth-user-name') || 'System User',
      email: authUser?.email || readMeta('auth-user-email') || '',
      username: authUser?.username || readMeta('auth-user-username') || '',
      role,
      displayRole: authUser?.display_role || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff'),
      profilePhotoUrl: authUser?.profile_photo_url || readMeta('auth-user-photo') || '',
    };
  }, [authUser, dashboardRole]);

  const profileInitials = useMemo(() => (
    profile.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'SU'
  ), [profile.name]);

  const profileIdentifier = profile.email || profile.username || 'No identifier available';

  return (
    <AdminLayout activePage="dashboard" title="Analytics Overview" authUser={authUser}>
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 text-white p-8 lg:p-10 shadow-xl">
        <div className="absolute -top-14 -right-8 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-lime-200/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Operations Dashboard</p>
            <h2 className="mt-3 text-3xl lg:text-5xl font-black tracking-tight">Welcome, {profile.name}</h2>
            <p className="mt-3 text-white/85 text-base max-w-2xl">
              Monitor attendance, schedule execution, and nutrition coverage from one clear view.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">{nowLabel}</span>
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">
                {loading ? 'Updating live stats...' : `Last updated ${updatedAt ? updatedAt.toLocaleTimeString() : 'just now'}`}
              </span>
            </div>
          </div>

          <div className="w-full max-w-md rounded-lg border border-white/20 bg-white/12 p-4 shadow-lg backdrop-blur-md xl:w-[360px]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/15 text-sm font-black text-white">
                {profile.profilePhotoUrl ? (
                  <img src={profile.profilePhotoUrl} alt={`${profile.name} profile`} className="h-full w-full object-cover" />
                ) : (
                  profileInitials
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{profile.name}</p>
                <p className="truncate text-sm text-emerald-50/85">{profileIdentifier}</p>
                <span className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-lime-100">
                  {profile.displayRole}
                </span>
              </div>
            </div>
            <button
              onClick={handleRefreshList}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-green-800 shadow-lg transition hover:bg-slate-100"
            >
              <AppIcon name="refresh" className="w-4 h-4" />
              Refresh List
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[28px] bg-white border border-slate-200 shadow-sm p-6 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.16em]">{card.title}</p>
                <h3 className="mt-3 text-3xl font-black text-slate-900">{card.value}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.iconBg} ${card.iconText}`}>
                <AppIcon name={card.icon} className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-700"
                  style={{ width: `${Math.max(5, card.progress || 0)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-500">{card.note}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 rounded-[28px] bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Program Insights</h3>
              <p className="text-sm text-slate-500">Quick interpretation of your current operations.</p>
            </div>
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Live</span>
          </div>

          <div className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.label} className="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{insight.label}</p>
                  <p className="text-sm text-slate-500">{insight.desc}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${insight.tone}`}>{insight.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-[28px] bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">Quick Actions</h3>
          <p className="text-sm text-slate-500 mt-1">Jump directly to frequent workflows.</p>

          <div className="mt-5 space-y-3">
            {quickActions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-green-50 hover:border-green-200"
              >
                <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-green-700 flex items-center justify-center group-hover:bg-green-100">
                  <AppIcon name={action.icon} className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.detail}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {loading && (
        <section className="rounded-[24px] bg-white border border-slate-200 p-4 text-sm text-slate-500">
          Loading dashboard data...
        </section>
      )}

      {!loading && !stats && (
        <section className="rounded-[24px] bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          Unable to load dashboard statistics right now. Please check your server/database connection and try refresh.
        </section>
      )}
    </AdminLayout>
  );
}
