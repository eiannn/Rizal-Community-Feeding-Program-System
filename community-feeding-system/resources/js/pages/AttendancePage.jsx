import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import AppIcon from '../components/AppIcon';

const attendanceStatuses = ['Present', 'Late', 'Absent', 'Excused'];

const statusBadge = {
  Present: 'bg-green-100 text-green-700',
  Late: 'bg-amber-100 text-amber-700',
  Absent: 'bg-rose-100 text-rose-700',
  Excused: 'bg-blue-100 text-blue-700',
};

const formatDate = (value) => {
  if (!value) return '-';
  const raw = String(value).split('T')[0];
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : raw;
};

const formatTime = (value) => {
  if (!value) return '-';
  const [hourRaw, minute = '00'] = String(value).split(':');
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
};

const manilaDateFromLookup = (value) => {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : new Date().toISOString().slice(0, 10);
};

const scheduleLabel = (schedule) => {
  if (!schedule) return '-';
  const time = [schedule.start_time, schedule.end_time].filter(Boolean).map(formatTime).join(' - ');
  return `${schedule.label || schedule.title || 'Feeding Schedule'}${time ? ` (${time})` : ''}`;
};

export default function AttendancePage() {
  const [schedules, setSchedules] = useState([]);
  const [filters, setFilters] = useState({
    query: '',
    attendance_date: '',
    feeding_schedule_id: '',
    status: 'All Status',
  });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [scheduleContext, setScheduleContext] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState({ beneficiary: null, rows: [], loading: false });

  const notify = (type, message) => {
    setFeedback({ type, message });
    window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
  };

  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const loadLookups = useCallback(() => {
    setLoading(true);
    return axios
      .get('/app-data/lookups', { params: { _ts: Date.now() } })
      .then((response) => {
        const loadedSchedules = response.data.schedules || [];
        const manilaToday = manilaDateFromLookup(response.data.manila_now);
        setSchedules(loadedSchedules);
        setFilters((prev) => ({
          ...prev,
          attendance_date: prev.attendance_date || manilaToday,
          feeding_schedule_id: prev.feeding_schedule_id || (loadedSchedules[0]?.id ? String(loadedSchedules[0].id) : ''),
        }));
      })
      .catch(() => {
        notify('error', 'Failed to load attendance setup data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const loadRows = useCallback(() => {
    if (!filters.feeding_schedule_id) {
      setRows([]);
      setSummary({});
      setScheduleContext(null);
      return Promise.resolve();
    }

    setLoading(true);
    return axios
      .get(`/app-data/attendances/schedule/${filters.feeding_schedule_id}`, {
        params: {
          _ts: Date.now(),
          attendance_date: filters.attendance_date,
          query: filters.query,
          status: filters.status,
        },
      })
      .then((response) => {
        setRows(response.data.children || []);
        setSummary(response.data.summary || {});
        setScheduleContext(response.data.schedule || null);
        setDrafts({});
      })
      .catch(() => {
        notify('error', 'Unable to load attendance list.');
      })
      .finally(() => setLoading(false));
  }, [filters.attendance_date, filters.feeding_schedule_id, filters.query, filters.status]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (filters.feeding_schedule_id && filters.attendance_date) {
      loadRows();
    }
  }, [filters.feeding_schedule_id, filters.attendance_date, filters.query, filters.status, loadRows]);

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => String(schedule.id) === String(filters.feeding_schedule_id)),
    [schedules, filters.feeding_schedule_id]
  );

  const cards = [
    { label: 'Present', value: summary.present || 0, tone: 'bg-green-50 text-green-700' },
    { label: 'Late', value: summary.late || 0, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Absent', value: summary.absent || 0, tone: 'bg-rose-50 text-rose-700' },
    { label: 'Excused', value: summary.excused || 0, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Not Marked', value: summary.not_yet_marked || 0, tone: 'bg-slate-100 text-slate-700' },
  ];

  const rowDraft = (row) => drafts[row.beneficiary_id] || {};

  const updateDraft = (beneficiaryId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [beneficiaryId]: {
        ...(prev[beneficiaryId] || {}),
        [field]: value,
      },
    }));
  };

  const saveRow = (row) => {
    const draft = rowDraft(row);
    const attendanceStatus = draft.attendance_status ?? row.attendance_status ?? '';

    if (!attendanceStatus) {
      notify('error', 'Please select an attendance status before saving.');
      return;
    }

    const confirmed = window.confirm(`Save attendance for ${row.child_name || `${row.first_name} ${row.last_name}`}?`);
    if (!confirmed) return;

    setSaving((prev) => ({ ...prev, [row.beneficiary_id]: true }));

    axios
      .post('/app-data/attendances', {
        beneficiary_id: row.beneficiary_id,
        feeding_schedule_id: Number(filters.feeding_schedule_id),
        attendance_date: filters.attendance_date,
        attendance_status: attendanceStatus,
        remarks: draft.remarks ?? row.remarks ?? null,
        meal_received: ['Present', 'Late'].includes(attendanceStatus),
      })
      .then(() => {
        notify('success', 'Attendance saved successfully.');
        return loadRows();
      })
      .catch((error) => {
        const message = error?.response?.data?.errors?.attendance_date?.[0]
          || error?.response?.data?.message
          || 'Unable to save attendance.';
        notify('error', message);
      })
      .finally(() => {
        setSaving((prev) => ({ ...prev, [row.beneficiary_id]: false }));
      });
  };

  const openHistory = (row) => {
    setHistory({ beneficiary: { name: row.child_name, code: row.beneficiary_code }, rows: [], loading: true });
    axios
      .get(`/app-data/attendances/history/${row.beneficiary_id}`, { params: { _ts: Date.now() } })
      .then((response) => {
        setHistory({
          beneficiary: response.data.beneficiary || { name: row.child_name, code: row.beneficiary_code },
          rows: response.data.data || [],
          loading: false,
        });
      })
      .catch(() => {
        setHistory((prev) => ({ ...prev, loading: false }));
        notify('error', 'Unable to load attendance history.');
      });
  };

  return (
    <AdminLayout activePage="attendance" title="Attendance">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 p-8 text-white shadow-xl lg:p-10">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Attendance Management</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight lg:text-5xl">Daily Feeding Attendance</h2>
          </div>
          <button
            type="button"
            onClick={loadRows}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-green-800 shadow-lg transition hover:bg-slate-100"
          >
            <AppIcon name="refresh" className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      {feedback?.message && (
        <section className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          feedback.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-green-200 bg-green-50 text-green-700'
        }`}>
          {feedback.message}
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Search by Beneficiary Name</label>
            <div className="relative">
              <AppIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Search first name, last name, or code"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Date</label>
            <input
              type="date"
              value={filters.attendance_date}
              onChange={(event) => updateFilter('attendance_date', event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Feeding Schedule</label>
            <select
              value={filters.feeding_schedule_id}
              onChange={(event) => updateFilter('feeding_schedule_id', event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              {schedules.length === 0 && <option value="">No schedules</option>}
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>{scheduleLabel(schedule)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Attendance Status</label>
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option>All Status</option>
              {attendanceStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Current schedule: <span className="font-semibold text-slate-800">{scheduleLabel(selectedSchedule || scheduleContext)}</span>
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-2xl font-black ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Attendance List</h3>
          <p className="text-sm text-slate-500">Each row saves independently and checks the one-record-per-day rule.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {['First Name', 'Last Name', 'Feeding Schedule', 'Attendance Status', 'Remarks', 'Save Button', 'History Button'].map((head) => (
                  <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading attendance records...</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">No beneficiaries found for the selected filters.</td>
                </tr>
              )}
              {!loading && rows.map((row) => {
                const draft = rowDraft(row);
                const selectedStatus = draft.attendance_status ?? row.attendance_status ?? '';
                const remarks = draft.remarks ?? row.remarks ?? '';

                return (
                  <tr key={row.beneficiary_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.first_name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.last_name}</td>
                    <td className="px-4 py-3 text-slate-700">{scheduleContext?.title || selectedSchedule?.label || '-'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={selectedStatus}
                        onChange={(event) => updateDraft(row.beneficiary_id, 'attendance_status', event.target.value)}
                        className={`h-11 min-w-[150px] rounded-xl border border-slate-200 px-3 text-sm font-semibold ${selectedStatus ? statusBadge[selectedStatus] : 'bg-white text-slate-500'}`}
                      >
                        <option value="">Select Status</option>
                        {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={remarks}
                        onChange={(event) => updateDraft(row.beneficiary_id, 'remarks', event.target.value)}
                        placeholder="Optional remarks"
                        className="h-11 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        disabled={Boolean(saving[row.beneficiary_id])}
                        className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <AppIcon name="attendance" className="h-4 w-4" />
                        {saving[row.beneficiary_id] ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openHistory(row)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <AppIcon name="history" className="h-4 w-4" />
                        History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {history.beneficiary && createPortal(
        <section className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Attendance History</h3>
                <p className="text-sm text-slate-500">{history.beneficiary.name} {history.beneficiary.code ? `(${history.beneficiary.code})` : ''}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistory({ beneficiary: null, rows: [], loading: false })}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {['Full Name', 'Date', 'Time In', 'Feeding Schedule', 'Attendance Status', 'Remarks', 'Recorded By'].map((head) => (
                      <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.loading && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading history...</td></tr>
                  )}
                  {!history.loading && history.rows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No attendance history found.</td></tr>
                  )}
                  {!history.loading && history.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.full_name || history.beneficiary.name}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatTime(row.time_in)}</td>
                      <td className="px-4 py-3 text-slate-700">{row.feeding_schedule || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadge[row.attendance_status] || 'bg-slate-100 text-slate-700'}`}>
                          {row.attendance_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.remarks || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.recorded_by || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>,
        document.body
      )}
    </AdminLayout>
  );
}
