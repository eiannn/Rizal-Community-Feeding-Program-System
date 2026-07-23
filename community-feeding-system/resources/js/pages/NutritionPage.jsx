import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import AppIcon from '../components/AppIcon';

const badgeClass = {
  Normal: 'bg-green-100 text-green-700',
  Underweight: 'bg-amber-100 text-amber-700',
  Overweight: 'bg-blue-100 text-blue-700',
  'Severely Underweight': 'bg-rose-100 text-rose-700',
};

const displayValue = (value) => (value === null || value === undefined || value === '' ? '-' : value);

export default function NutritionPage() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, normal: 0, underweight: 0, overweight: 0, severely_underweight: 0 });
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [savingRemarkId, setSavingRemarkId] = useState(null);

  const notify = (type, message) => {
    window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
  };

  const loadRows = () => {
    return axios
      .get('/app-data/nutrition-records', {
        params: { query },
      })
      .then((response) => {
        setRows(response.data.data || []);
        setStats(response.data.stats || { total: 0, normal: 0, underweight: 0, overweight: 0, severely_underweight: 0 });
      });
  };

  const handleRefreshList = () => {
    loadRows()
      .then(() => notify('success', 'Nutrition list refreshed.'))
      .catch(() => notify('error', 'Unable to refresh nutrition list.'));
  };

  useEffect(() => {
    loadRows().catch(() => {});
  }, [query]);

  const startEditingRemarks = (row) => {
    setEditingRemarkId(row.id);
    setRemarkDraft(row.remarks || '');
  };

  const cancelEditingRemarks = () => {
    setEditingRemarkId(null);
    setRemarkDraft('');
  };

  const saveRemarks = (row) => {
    const payload = {
      date_recorded: row.date_recorded || row.last_check,
      height_cm: Number(row.height_cm),
      weight_kg: Number(row.weight_kg),
      nutrition_status: row.nutrition_status || row.status || null,
      remarks: remarkDraft.trim() || null,
    };

    if (!payload.date_recorded || !payload.height_cm || !payload.weight_kg) {
      notify('error', 'This nutrition record is missing required measurement data.');
      return;
    }

    setSavingRemarkId(row.id);
    axios
      .patch(`/app-data/nutrition-records/${row.id}`, payload)
      .then(() => {
        notify('success', 'Nutrition remarks updated.');
        cancelEditingRemarks();
        return loadRows();
      })
      .catch((error) => notify('error', error?.response?.data?.message || 'Unable to update nutrition remarks.'))
      .finally(() => setSavingRemarkId(null));
  };

  const cards = useMemo(() => {
    return [
      { title: 'Total Records', value: stats.total || 0, note: 'All assessments', icon: 'nutrition', tone: 'bg-green-50 text-green-700' },
      { title: 'Normal', value: stats.normal || 0, note: 'Healthy BMI', icon: 'attendance', tone: 'bg-emerald-50 text-emerald-700' },
      { title: 'Underweight', value: stats.underweight || 0, note: 'Needs monitoring', icon: 'clock', tone: 'bg-amber-50 text-amber-700' },
      { title: 'Overweight', value: stats.overweight || 0, note: 'Needs guidance', icon: 'chart', tone: 'bg-blue-50 text-blue-700' },
      { title: 'Severely Underweight', value: stats.severely_underweight || 0, note: 'Needs action', icon: 'dashboard', tone: 'bg-rose-50 text-rose-700' },
    ];
  }, [stats]);

  const renderRemarksContent = (row, className = '') => {
    if (editingRemarkId === row.id) {
      return (
        <textarea
          value={remarkDraft}
          onChange={(event) => setRemarkDraft(event.target.value)}
          rows={2}
          className={`min-h-[84px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ${className}`}
          placeholder="Enter remarks"
        />
      );
    }

    return <span className="break-words">{row.remarks || '-'}</span>;
  };

  const renderRemarkActions = (row, compact = false) => {
    if (editingRemarkId === row.id) {
      return (
        <div className={compact ? 'mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2' : 'flex min-w-[120px] flex-col gap-2 2xl:flex-row'}>
          <button
            type="button"
            onClick={() => saveRemarks(row)}
            disabled={savingRemarkId === row.id}
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'w-full' : 'w-full 2xl:w-auto'}`}
          >
            <AppIcon name="attendance" className="h-4 w-4" />
            {savingRemarkId === row.id ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancelEditingRemarks}
            className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${compact ? 'w-full' : 'w-full 2xl:w-auto'}`}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => startEditingRemarks(row)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 ${compact ? 'mt-3 w-full' : ''}`}
      >
        <AppIcon name="edit" className="h-4 w-4" />
        Edit
      </button>
    );
  };

  return (
    <AdminLayout activePage="nutrition" title="Nutrition Tracking">
      <section className="relative min-w-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 p-5 text-white shadow-xl sm:p-6 lg:p-8">
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Nutrition Monitoring</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Nutrition Records</h2>
          </div>
          <button onClick={handleRefreshList} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-green-800 shadow-lg transition hover:bg-slate-100 sm:w-auto">
            <AppIcon name="refresh" className="w-4 h-4" />
            Refresh List
          </button>
        </div>
      </section>

      <section className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Search by Beneficiary Name</label>
            <div className="relative">
              <AppIcon name="search" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names in real time" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.title} className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-lg sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}><AppIcon name={card.icon} className="h-5 w-5" /></div>
              <span className="min-w-0 text-right text-xs font-semibold text-slate-400">{card.note}</span>
            </div>
            <p className="text-sm text-slate-500">{card.title}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{card.value}</h3>
          </div>
        ))}
      </section>

      <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5"><h3 className="text-lg font-bold text-slate-900 sm:text-xl">Nutrition Assessment Log</h3></div>
        <div className="divide-y divide-slate-100 xl:hidden">
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-sm font-medium text-slate-500">No nutrition assessment records found.</div>
          )}
          {rows.map((row) => (
            <article key={row.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{displayValue(row.code)}</p>
                  <h4 className="mt-1 break-words text-base font-bold text-slate-900">{displayValue(row.name)}</h4>
                  <p className="mt-1 text-sm text-slate-500">{displayValue(row.purok)}</p>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass[row.status] || 'bg-slate-100 text-slate-700'}`}>{displayValue(row.status)}</span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs font-semibold text-slate-500">Height</dt>
                  <dd className="mt-1 font-bold text-slate-900">{displayValue(row.height_cm)}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs font-semibold text-slate-500">Weight</dt>
                  <dd className="mt-1 font-bold text-slate-900">{displayValue(row.weight_kg)}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs font-semibold text-slate-500">BMI</dt>
                  <dd className="mt-1 font-bold text-slate-900">{displayValue(row.bmi)}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs font-semibold text-slate-500">Date</dt>
                  <dd className="mt-1 font-bold text-slate-900">{displayValue(row.date_recorded || row.last_check)}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="mb-2 text-xs font-semibold text-slate-500">Remarks</p>
                {renderRemarksContent(row)}
                {renderRemarkActions(row, true)}
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto xl:block">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50"><tr className="text-left text-slate-500">{['Code', 'Beneficiary', 'Purok', 'Height', 'Weight', 'BMI', 'Status', 'Date Recorded', 'Remarks', 'Action'].map((head) => <th key={head} className="px-4 py-4 font-semibold">{head}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm font-medium text-slate-500">No nutrition assessment records found.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-4 font-semibold text-slate-900">{row.code}</td>
                  <td className="px-4 py-4 text-slate-700">{row.name}</td>
                  <td className="px-4 py-4 text-slate-700">{row.purok}</td>
                  <td className="px-4 py-4 text-slate-700">{row.height_cm}</td>
                  <td className="px-4 py-4 text-slate-700">{row.weight_kg}</td>
                  <td className="px-4 py-4 text-slate-700">{row.bmi}</td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass[row.status] || 'bg-slate-100 text-slate-700'}`}>{row.status}</span></td>
                  <td className="px-4 py-4 text-slate-700">{row.date_recorded || row.last_check}</td>
                  <td className="px-4 py-4 text-slate-700">
                    {renderRemarksContent(row, 'min-w-[180px] max-w-[260px] xl:min-w-[220px]')}
                  </td>
                  <td className="px-4 py-4">
                    {renderRemarkActions(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
