import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import AppIcon from '../components/AppIcon';

const filterOptions = {
  sessionType: ['All Session Types', 'Regular', 'Morning Session', 'Afternoon Session', 'Special Session'],
};

export default function FeedingSchedulePage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, completed: 0, upcoming: 0 });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    session_type: 'Regular',
    description: '',
    schedule_date: '',
    start_time: '',
    end_time: '',
    location: '',
    status: 'Scheduled',
  });

  const notify = (type, message) => {
    window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
  };

  const loadSchedules = () => {
    setLoading(true);

    return axios
      .get('/app-data/schedules')
      .then((response) => {
        setRows(response.data.data || []);
        setStats(response.data.stats || { total: 0, today: 0, completed: 0, upcoming: 0 });
      })
      .finally(() => setLoading(false));
  };

  const handleRefreshList = () => {
    loadSchedules()
      .then(() => notify('success', 'Schedules list refreshed.'))
      .catch(() => notify('error', 'Unable to refresh schedules list.'));
  };

  useEffect(() => {
    loadSchedules().catch(() => {});
  }, []);

  const cards = useMemo(
    () => [
      { title: 'Total Schedules', value: stats.total, note: 'All sessions', icon: 'schedules', tone: 'bg-green-50 text-green-700' },
      { title: 'Today Sessions', value: stats.today, note: 'Current day', icon: 'clock', tone: 'bg-lime-50 text-lime-700' },
      { title: 'Completed Sessions', value: stats.completed, note: 'Finished', icon: 'attendance', tone: 'bg-emerald-50 text-emerald-700' },
      { title: 'Upcoming Sessions', value: stats.upcoming, note: 'Planned', icon: 'calendar', tone: 'bg-amber-50 text-amber-700' },
    ],
    [stats]
  );

  const createSchedule = (e) => {
    e.preventDefault();

    axios
      .post('/app-data/schedules', form)
      .then(() => {
        setForm({
          title: '',
          session_type: 'Regular',
          description: '',
          schedule_date: '',
          start_time: '',
          end_time: '',
          location: '',
          status: 'Scheduled',
        });
        return loadSchedules();
      })
      .then(() => notify('success', 'Schedule added successfully.'))
      .catch((error) => {
        notify('error', error?.response?.data?.message || 'Unable to add schedule.');
      });
  };

  return (
    <AdminLayout activePage="schedules" title="Feeding Schedules">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 p-8 text-white shadow-xl lg:p-10">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Schedule Management</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight lg:text-5xl">Feeding Schedules</h2>
          </div>
          <button onClick={handleRefreshList} className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-green-800 shadow-lg transition hover:bg-slate-100">
            <AppIcon name="refresh" className="w-4 h-4" />
            Refresh List
          </button>
        </div>
      </section>

      <section className="rounded-[28px] bg-white border border-slate-200 p-6 shadow-sm">
        <form onSubmit={createSchedule} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
            <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Session Type</label>
            <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.session_type} onChange={(e) => setForm((prev) => ({ ...prev, session_type: e.target.value }))}>
              {filterOptions.sessionType.filter((item) => item !== 'All Session Types').map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Schedule Date</label>
            <input type="date" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.schedule_date} onChange={(e) => setForm((prev) => ({ ...prev, schedule_date: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
            <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
          </div>
          <button className="px-6 py-3 rounded-2xl bg-green-700 text-white font-semibold hover:bg-green-800 transition inline-flex items-center justify-center gap-2">
            <AppIcon name="plus" className="w-4 h-4" />
            Add Schedule
          </button>
        </form>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[28px] bg-white border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.tone}`}><AppIcon name={card.icon} className="w-5 h-5" /></div>
              <span className="text-xs font-semibold text-slate-400">{card.note}</span>
            </div>
            <p className="text-sm text-slate-500">{card.title}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{card.value}</h3>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">Feeding Session List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                {['Schedule ID', 'Title', 'Session Type', 'Date', 'Location'].map((head) => <th key={head} className="px-6 py-4 font-semibold">{head}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">{row.code}</td>
                  <td className="px-6 py-4 text-slate-700">{row.title}</td>
                  <td className="px-6 py-4 text-slate-700">{row.session_type || 'Regular'}</td>
                  <td className="px-6 py-4 text-slate-700">{row.date}</td>
                  <td className="px-6 py-4 text-slate-700">{row.location || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
