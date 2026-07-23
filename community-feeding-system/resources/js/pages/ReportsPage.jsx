import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import AppIcon from '../components/AppIcon';

const attendanceStatuses = ['Present', 'Late', 'Absent', 'Excused'];
const beneficiaryStatuses = ['Active', 'Inactive', 'Completed'];
const scheduleStatuses = ['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Active', 'Inactive'];
const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', '1st Year College', '2nd Year College', '3rd Year College', '4th Year College'];
const nutritionStatuses = ['Normal', 'Underweight', 'Overweight', 'Severely Underweight'];

const statusTone = {
  Present: 'bg-green-100 text-green-700',
  Late: 'bg-amber-100 text-amber-700',
  Absent: 'bg-rose-100 text-rose-700',
  Excused: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-slate-100 text-slate-700',
  Blocked: 'bg-rose-100 text-rose-700',
  Completed: 'bg-blue-100 text-blue-700',
  Scheduled: 'bg-emerald-100 text-emerald-700',
  Ongoing: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-rose-100 text-rose-700',
  Normal: 'bg-green-100 text-green-700',
  Underweight: 'bg-amber-100 text-amber-700',
  Overweight: 'bg-blue-100 text-blue-700',
  'Severely Underweight': 'bg-rose-100 text-rose-700',
};

const blankBeneficiaryForm = {
  beneficiary_code: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  sex: 'Male',
  birth_date: '',
  height: '',
  weight: '',
  contact_number: '',
  address: '',
  purok_id: '',
  school_name: '',
  school_level: '',
  grade_level: '',
  school_year: '',
  father_name: '',
  mother_name: '',
  guardian_name: '',
  relationship_to_guardian: '',
  parent_guardian_contact_number: '',
  emergency_contact_number: '',
  feeding_schedule_id: '',
  status: 'Active',
};

const blankNutritionForm = {
  id: '',
  date_recorded: '',
  height_cm: '',
  weight_kg: '',
  nutrition_status: '',
  remarks: '',
};

const formatDate = (value) => {
  if (!value) return '-';
  const raw = String(value).split('T')[0];
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : raw;
};

const normalizeDateValue = (value) => {
  if (!value) return '';
  const raw = String(value).split('T')[0].trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return raw;
  }

  const displayMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (displayMatch) {
    return `${displayMatch[3]}-${displayMatch[1].padStart(2, '0')}-${displayMatch[2].padStart(2, '0')}`;
  }

  return '';
};

const resolvePrintColumnValue = (column, row) => (
  typeof column.value === 'function' ? column.value(row) : row[column.value]
);

const formatTime12 = (value) => {
  if (!value) return '-';

  const normalizeOne = (part) => {
    const trimmed = String(part || '').trim();
    if (!trimmed || trimmed === '-') return '-';
    if (/\b(am|pm)\b/i.test(trimmed)) {
      return trimmed.replace(/\s+/g, ' ').replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return trimmed;

    const hour = Number(match[1]);
    if (!Number.isFinite(hour)) return trimmed;

    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${match[2]} ${suffix}`;
  };

  return String(value)
    .split(/\s*-\s*|\s+to\s+/i)
    .map(normalizeOne)
    .join(' - ');
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const display = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const notify = (type, message) => {
  window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
};

const printSystemName = 'Community Feeding Program Monitoring System in Barangay Rizal Bansalan';

function Pill({ value }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone[value] || 'bg-slate-100 text-slate-700'}`}>
      {display(value)}
    </span>
  );
}

function ActionButton({ icon, children, tone = 'slate', className = '', ...props }) {
  const tones = {
    green: 'bg-green-700 text-white hover:bg-green-800',
    slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    rose: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    white: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  };

  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone] || tones.slate} ${className}`}
      {...props}
    >
      {icon && <AppIcon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}

function ViewButton(props) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      View
    </button>
  );
}

function SummaryCard({ title, value, note, icon = 'reports' }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
          <AppIcon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-900">{value ?? 0}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={`h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm ${props.className || ''}`} />;
}

function SelectInput({ children, ...props }) {
  return <select {...props} className={`h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm ${props.className || ''}`}>{children}</select>;
}

function EmptyRow({ colSpan, children = 'No records found.' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm font-medium text-slate-500">{children}</td>
    </tr>
  );
}

function ReportTableHeader({ title, count, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {count !== undefined && <p className="mt-1 text-sm text-slate-500">{count} records</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 sm:justify-end">{children}</div>}
    </div>
  );
}

function PrintDateInput({ value, onChange, label = 'Print Date' }) {
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="date"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 min-w-[132px] rounded-md border-0 bg-transparent p-0 text-sm font-semibold text-slate-700 outline-none"
      />
    </label>
  );
}

export default function ReportsPage() {
  const [view, setView] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [puroks, setPuroks] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [attendanceFilters, setAttendanceFilters] = useState({ date_from: '', date_to: '', attendance_date: '', query: '', status: 'All Status', feeding_schedule_id: 'All Schedules' });
  const [attendanceData, setAttendanceData] = useState({ summary: {}, data: [] });
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [studentAttendanceFilters, setStudentAttendanceFilters] = useState({ date_from: '', date_to: '', attendance_date: '', status: 'All Status' });
  const [studentAttendance, setStudentAttendance] = useState({ beneficiary: null, data: [] });

  const [masterlistFilters, setMasterlistFilters] = useState({ query: '', status: 'All Status', purok: 'All Purok', grade_level: 'All Grade Levels', registered_date: '' });
  const [masterlist, setMasterlist] = useState({ summary: {}, data: [] });
  const [beneficiaryRecord, setBeneficiaryRecord] = useState(null);
  const [beneficiaryRecordPrintDate, setBeneficiaryRecordPrintDate] = useState('');
  const [editForm, setEditForm] = useState(blankBeneficiaryForm);
  const [nutritionForm, setNutritionForm] = useState({ ...blankNutritionForm, date_recorded: todayDate() });

  const [nutritionFilters, setNutritionFilters] = useState({ date_from: '', date_to: '', recorded_date: '', query: '', nutrition_status: 'All Status' });
  const [nutritionData, setNutritionData] = useState({ summary: {}, data: [] });
  const [nutritionHistoryFilters, setNutritionHistoryFilters] = useState({ recorded_date: '' });
  const [nutritionHistory, setNutritionHistory] = useState({ beneficiary: null, data: [] });

  const [scheduleFilters, setScheduleFilters] = useState({ date_from: '', date_to: '', schedule_date: '', beneficiary_query: '', schedule_query: '', status: 'All Status', schedule_time: 'All Times' });
  const [scheduleData, setScheduleData] = useState({ summary: {}, data: [] });
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleRecordFilters, setScheduleRecordFilters] = useState({ query: '', purok: 'All Purok', grade_level: 'All Grade Levels', schedule_date: '' });
  const [scheduleRecord, setScheduleRecord] = useState({ schedule: null, data: [] });

  const setObjectField = (setter, field, value) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const rowMatchesPrintDate = (row, selectedDate, fields = []) => {
    if (!selectedDate) return true;

    const dateFields = fields.length > 0
      ? fields
      : ['date', 'attendance_date', 'date_recorded', 'recorded_date', 'schedule_date', 'registered_date', 'created_at', 'date_or_days'];

    return dateFields.some((field) => {
      const value = typeof field === 'function' ? field(row) : row?.[field];
      const normalized = normalizeDateValue(value);

      return normalized === selectedDate || String(value ?? '').includes(selectedDate);
    });
  };

  const uniqueRowsForPrint = (columns = [], rows = []) => {
    const seen = new Set();

    return rows.filter((row) => {
      const key = columns
        .map((column) => display(resolvePrintColumnValue(column, row)))
        .join('||');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  };

  const prepareRowsForPrint = (columns = [], rows = [], dateFilter = {}) => {
    const selectedDate = normalizeDateValue(dateFilter?.value);
    const rawRows = Array.isArray(rows) ? rows : [];
    const filteredRows = selectedDate && dateFilter?.applyToRows !== false
      ? rawRows.filter((row) => rowMatchesPrintDate(row, selectedDate, dateFilter?.fields || []))
      : rawRows;

    return uniqueRowsForPrint(columns, filteredRows);
  };

  const buildPrintTable = (columns = [], rows = []) => {
    const printableColumns = Array.isArray(columns) ? columns : [];
    const printableRows = Array.isArray(rows) ? rows : [];
    const colSpan = Math.max(printableColumns.length, 1);
    const tableRows = printableRows.map((row) => `
      <tr>
        ${printableColumns.map((column) => {
          const rawValue = resolvePrintColumnValue(column, row);
          return `<td>${escapeHtml(display(rawValue))}</td>`;
        }).join('')}
      </tr>
    `).join('');

    return `
      <div class="table-wrap">
        <table>
          <thead><tr>${printableColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows || `<tr><td colspan="${colSpan}" class="empty-cell">No records found.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  };

  const buildPrintSections = (sections = []) => sections.map((section) => `
    <section class="form-section">
      <h2>${escapeHtml(section.title)}</h2>
      <div class="field-grid">
        ${(section.fields || []).map((field) => `
          <div class="print-field ${field.full ? 'span-2' : ''}">
            <span>${escapeHtml(field.label)}</span>
            <p>${escapeHtml(display(field.value))}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');

  const printDocument = (title, bodyHtml, options = {}) => {
    const orientation = options.orientation || 'portrait';
    const seenMeta = new Set();
    const metaItems = (options.meta || []).filter((item) => {
      const key = `${item.label || ''}||${display(item.value)}`;

      if (seenMeta.has(key)) {
        return false;
      }

      seenMeta.add(key);
      return true;
    });
    const showSignatures = options.showSignatures !== false;
    const originalPageTitle = document.title;
    const metadata = metaItems.map((item) => `
      <div>
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(display(item.value))}</strong>
      </div>
    `).join('');

    const printFrame = document.createElement('iframe');
    printFrame.title = '';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printFrame.contentDocument || printWindow?.document;
    if (!printWindow || !printDocument) {
      printFrame.remove();
      notify('error', 'Unable to prepare the print preview.');
      return;
    }

    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title></title>
          <style>
            @page {
              size: ${orientation};
              margin: 1in;
            }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #0f172a; background: #fff; }
            .document { width: 100%; min-height: auto; padding: 0; }
            .document-header { display: flex; gap: 14px; align-items: center; border-bottom: 3px solid #166534; padding-bottom: 14px; margin-bottom: 14px; }
            .brand-mark { width: 58px; height: 58px; display: grid; place-items: center; }
            .brand-mark img { width: 100%; height: 100%; object-fit: contain; }
            .eyebrow { margin: 0 0 4px; color: #166534; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; }
            h1 { margin: 0; font-size: 21px; line-height: 1.2; color: #0f172a; }
            .system-name { margin: 5px 0 0; color: #475569; font-size: 12px; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 14px 0 18px; }
            .meta-grid div { border: 1px solid #dbe4ee; background: #f8fafc; padding: 8px 10px; min-height: 46px; }
            .meta-grid span, .print-field span { display: block; color: #64748b; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; }
            .meta-grid strong { display: block; margin-top: 4px; color: #0f172a; font-size: 12px; line-height: 1.35; }
            .form-section { break-inside: avoid; border: 1px solid #dbe4ee; margin: 0 0 12px; }
            .form-section h2 { margin: 0; padding: 8px 10px; background: #ecfdf5; color: #166534; border-bottom: 1px solid #bbf7d0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
            .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; }
            .print-field { min-height: 54px; padding: 9px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
            .print-field:nth-child(2n) { border-right: 0; }
            .print-field.span-2 { grid-column: span 2; border-right: 0; }
            .print-field p { margin: 5px 0 0; color: #0f172a; font-size: 12px; line-height: 1.35; word-break: break-word; }
            .table-title { margin: 18px 0 8px; font-size: 13px; font-weight: 800; color: #0f172a; }
            .table-wrap { width: 100%; overflow: visible; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: auto; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: left; vertical-align: top; line-height: 1.3; word-break: break-word; }
            th { background: #ecfdf5; color: #166534; font-weight: 800; }
            .empty-cell { color: #64748b; text-align: center; padding: 18px; }
            .signature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 36px; margin-top: 96px; page-break-inside: avoid; }
            .signature-line { border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-size: 11px; color: #334155; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .document-header, .form-section, .meta-grid div { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <main class="document">
            <header class="document-header">
              <div class="brand-mark"><img src="/images/system-logo.png" alt="System logo" /></div>
              <div>
                <p class="eyebrow">Official Program Record</p>
                <h1>${escapeHtml(title)}</h1>
                <p class="system-name">${escapeHtml(printSystemName)}</p>
              </div>
            </header>
            ${metadata ? `<section class="meta-grid">${metadata}</section>` : ''}
            ${bodyHtml}
            ${showSignatures ? `<section class="signature-grid">
              <div class="signature-line">Prepared by</div>
              <div class="signature-line">Reviewed / Approved by</div>
            </section>` : ''}
          </main>
        </body>
      </html>
    `);
    printDocument.close();
    printDocument.title = '';

    let cleanupTimer = null;
    const cleanup = () => {
      if (cleanupTimer) {
        clearTimeout(cleanupTimer);
      }
      if (document.body.contains(printFrame)) {
        printFrame.remove();
      }
      document.title = originalPageTitle;
    };

    printWindow.onafterprint = cleanup;
    setTimeout(() => {
      document.title = '';
      printWindow.focus();
      printWindow.print();
      cleanupTimer = setTimeout(cleanup, 60000);
    }, 150);
  };

  const printTable = (title, columns = [], rows = [], options = {}) => {
    const printableRows = prepareRowsForPrint(columns, rows, options.dateFilter || {});
    const selectedPrintDate = normalizeDateValue(options.dateFilter?.value);
    const orientation = options.orientation || (columns.length >= 7 ? 'landscape' : 'portrait');
    const tableTitle = options.tableTitle ? `<h2 class="table-title">${escapeHtml(options.tableTitle)}</h2>` : '';

    printDocument(title, `${tableTitle}${buildPrintTable(columns, printableRows)}`, {
      ...options,
      orientation,
      meta: [
        { label: 'Record Count', value: printableRows.length },
        ...(selectedPrintDate ? [{ label: 'Print Date', value: formatDate(selectedPrintDate) }] : []),
        ...(options.meta || []),
      ],
    });
  };

  const printForm = (title, sections = [], options = {}) => {
    const selectedPrintDate = normalizeDateValue(options.dateFilter?.value);
    const tables = (options.tables || []).map((table) => `
      <h2 class="table-title">${escapeHtml(table.title)}</h2>
      ${buildPrintTable(table.columns, prepareRowsForPrint(table.columns, table.rows, table.dateFilter || options.dateFilter || {}))}
    `).join('');
    const { tables: unusedTables, dateFilter: unusedDateFilter, ...documentOptions } = options;

    printDocument(title, `${buildPrintSections(sections)}${tables}`, {
      ...documentOptions,
      meta: [
        ...(selectedPrintDate ? [{ label: 'Print Date', value: formatDate(selectedPrintDate) }] : []),
        ...(options.meta || []),
      ],
    });
  };

  const printBeneficiaryRecord = (record, nutritionRows = [], printDate = '') => {
    printForm(`Beneficiary Record - ${record.complete_name}`, [
      {
        title: 'Profile Photo',
        fields: [
          { label: 'Photo Status', value: record.profile_photo ? 'Uploaded' : 'No photo uploaded', full: true },
        ],
      },
      {
        title: 'Student Personal Information',
        fields: [
          { label: 'Complete Name', value: record.complete_name },
          { label: 'Age', value: record.age },
          { label: 'Sex', value: record.sex },
          { label: 'Date of Birth', value: formatDate(record.date_of_birth) },
          { label: 'Height', value: record.height },
          { label: 'Weight', value: record.weight },
          { label: 'Student Contact Number', value: record.contact_number, full: true },
        ],
      },
      {
        title: 'Parent / Guardian Information',
        fields: [
          { label: "Father's Name", value: record.father_name },
          { label: "Mother's Name", value: record.mother_name },
          { label: "Guardian's Name", value: record.guardian_name },
          { label: 'Relationship to Guardian', value: record.relationship_to_guardian },
          { label: 'Parent / Guardian Contact Number', value: record.parent_guardian_contact_number },
          { label: 'Emergency Contact Number', value: record.emergency_contact_number },
        ],
      },
      {
        title: 'Address Information',
        fields: [
          { label: 'Complete Address', value: record.address, full: true },
          { label: 'Status', value: record.status },
        ],
      },
      {
        title: 'School Information',
        fields: [
          { label: 'Name of School', value: record.school_name, full: true },
          { label: 'School Level', value: record.school_level },
          { label: 'Grade Level', value: record.grade_level },
          { label: 'School Year', value: record.school_year },
        ],
      },
      {
        title: 'Feeding Schedule Information',
        fields: [
          { label: 'Feeding Schedule', value: record.feeding_schedule, full: true },
          { label: 'Schedule Date / Days', value: record.schedule_date_or_days },
          { label: 'Schedule Time', value: formatTime12(record.schedule_time) },
        ],
      },
    ], {
      meta: [
        { label: 'Beneficiary', value: record.complete_name },
        { label: 'Status', value: record.status },
      ],
      tables: [
        {
          title: 'Nutrition Information',
          columns: [
            { label: 'Date Recorded', value: (row) => formatDate(row.date_recorded) },
            { label: 'Height', value: 'height' },
            { label: 'Weight', value: 'weight' },
            { label: 'BMI', value: 'bmi' },
            { label: 'Nutrition Status', value: 'nutrition_status' },
            { label: 'Remarks', value: 'remarks' },
            { label: 'Recorded By', value: 'recorded_by' },
          ],
          rows: nutritionRows,
          dateFilter: { value: printDate, fields: ['date_recorded'] },
        },
      ],
      dateFilter: { value: printDate, fields: ['date_recorded'] },
    });
  };

  const loadLookups = () => {
    axios
      .get('/app-data/lookups', { params: { _ts: Date.now() } })
      .then((response) => {
        setPuroks(response.data.puroks || []);
        setSchedules(response.data.schedules || []);
      })
      .catch(() => notify('error', 'Unable to load report filters.'));
  };

  const loadOverview = () => {
    setLoading(true);
    axios
      .get('/app-data/reports/overview', { params: { _ts: Date.now() } })
      .then((response) => setOverview(response.data))
      .catch(() => notify('error', 'Unable to load reports overview.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLookups();
    loadOverview();
  }, []);

  const loadAttendanceSummary = () => {
    setLoading(true);
    axios
      .get('/app-data/reports/attendance-summary', { params: { ...attendanceFilters, _ts: Date.now() } })
      .then((response) => setAttendanceData({ summary: response.data.summary || {}, data: response.data.data || [] }))
      .catch(() => notify('error', 'Unable to load attendance summary.'))
      .finally(() => setLoading(false));
  };

  const loadStudentAttendance = (beneficiary = selectedBeneficiary) => {
    if (!beneficiary?.beneficiary_id && !beneficiary?.id) return;
    const id = beneficiary.beneficiary_id || beneficiary.id;
    setLoading(true);
    axios
      .get(`/app-data/reports/attendance-summary/${id}`, { params: { ...studentAttendanceFilters, _ts: Date.now() } })
      .then((response) => setStudentAttendance({ beneficiary: response.data.beneficiary || null, data: response.data.data || [] }))
      .catch(() => notify('error', 'Unable to load student attendance records.'))
      .finally(() => setLoading(false));
  };

  const loadMasterlist = () => {
    setLoading(true);
    axios
      .get('/app-data/reports/beneficiaries-masterlist', { params: { ...masterlistFilters, _ts: Date.now() } })
      .then((response) => setMasterlist({ summary: response.data.summary || {}, data: response.data.data || [] }))
      .catch(() => notify('error', 'Unable to load beneficiaries masterlist.'))
      .finally(() => setLoading(false));
  };

  const mapRecordToEditForm = (record) => ({
    ...blankBeneficiaryForm,
    beneficiary_code: record?.beneficiary_code || '',
    first_name: record?.first_name || '',
    middle_name: record?.middle_name || '',
    last_name: record?.last_name || '',
    sex: record?.sex || 'Male',
    birth_date: record?.date_of_birth || '',
    height: record?.height ?? '',
    weight: record?.weight ?? '',
    contact_number: record?.contact_number || '',
    address: record?.address || '',
    purok_id: record?.purok_id ? String(record.purok_id) : '',
    school_name: record?.school_name || '',
    school_level: record?.school_level || '',
    grade_level: record?.grade_level || '',
    school_year: record?.school_year || '',
    father_name: record?.father_name || '',
    mother_name: record?.mother_name || '',
    guardian_name: record?.guardian_name || '',
    relationship_to_guardian: record?.relationship_to_guardian || '',
    parent_guardian_contact_number: record?.parent_guardian_contact_number || '',
    emergency_contact_number: record?.emergency_contact_number || '',
    feeding_schedule_id: record?.feeding_schedule_id ? String(record.feeding_schedule_id) : '',
    status: record?.status || 'Active',
  });

  const openBeneficiaryRecord = (beneficiaryId, mode = 'beneficiary-record') => {
    setLoading(true);
    setView(mode);
    setBeneficiaryRecordPrintDate('');
    axios
      .get(`/app-data/reports/beneficiaries-masterlist/${beneficiaryId}`, { params: { _ts: Date.now() } })
      .then((response) => {
        setBeneficiaryRecord(response.data);
        setEditForm(mapRecordToEditForm(response.data.record));
        setNutritionForm({ ...blankNutritionForm, date_recorded: todayDate() });
      })
      .catch(() => notify('error', 'Unable to load beneficiary record.'))
      .finally(() => setLoading(false));
  };

  const saveBeneficiary = () => {
    const recordId = beneficiaryRecord?.record?.id;
    if (!recordId) return;
    if (!window.confirm('Save updated beneficiary information?')) return;

    const payload = {
      ...editForm,
      birth_date: editForm.birth_date,
      height_cm: editForm.height === '' ? null : Number(editForm.height),
      weight_kg: editForm.weight === '' ? null : Number(editForm.weight),
      feeding_schedule_id: editForm.feeding_schedule_id || null,
    };

    setLoading(true);
    axios
      .patch(`/app-data/beneficiaries/${recordId}`, payload)
      .then(() => {
        notify('success', 'Beneficiary record updated successfully.');
        loadMasterlist();
        openBeneficiaryRecord(recordId, 'beneficiary-record');
      })
      .catch((error) => notify('error', error?.response?.data?.message || 'Unable to update beneficiary record.'))
      .finally(() => setLoading(false));
  };

  const saveNutrition = () => {
    const recordId = beneficiaryRecord?.record?.id;
    if (!recordId) return;
    if (!nutritionForm.height_cm || !nutritionForm.weight_kg || !nutritionForm.date_recorded) {
      notify('error', 'Date, height, and weight are required for nutrition records.');
      return;
    }
    if (!window.confirm(nutritionForm.id ? 'Update this nutrition record?' : 'Add this nutrition record?')) return;

    const payload = {
      beneficiary_id: recordId,
      date_recorded: nutritionForm.date_recorded,
      height_cm: Number(nutritionForm.height_cm),
      weight_kg: Number(nutritionForm.weight_kg),
      nutrition_status: nutritionForm.nutrition_status || null,
      remarks: nutritionForm.remarks || null,
    };

    const request = nutritionForm.id
      ? axios.patch(`/app-data/nutrition-records/${nutritionForm.id}`, payload)
      : axios.post('/app-data/nutrition-records', payload);

    setLoading(true);
    request
      .then(() => {
        notify('success', nutritionForm.id ? 'Nutrition record updated.' : 'Nutrition record added.');
        setNutritionForm({ ...blankNutritionForm, date_recorded: todayDate() });
        openBeneficiaryRecord(recordId, 'beneficiary-edit');
      })
      .catch((error) => notify('error', error?.response?.data?.message || 'Unable to save nutrition record.'))
      .finally(() => setLoading(false));
  };

  const editNutritionRow = (row) => {
    setNutritionForm({
      id: row.id,
      date_recorded: row.date_recorded || todayDate(),
      height_cm: row.height ?? '',
      weight_kg: row.weight ?? '',
      nutrition_status: row.nutrition_status || '',
      remarks: row.remarks || '',
    });
  };

  const loadNutritionSummary = () => {
    setLoading(true);
    axios
      .get('/app-data/reports/nutrition-summary', { params: { ...nutritionFilters, _ts: Date.now() } })
      .then((response) => setNutritionData({ summary: response.data.summary || {}, data: response.data.data || [] }))
      .catch(() => notify('error', 'Unable to load nutrition summary.'))
      .finally(() => setLoading(false));
  };

  const loadNutritionHistory = (beneficiary = selectedBeneficiary) => {
    if (!beneficiary?.beneficiary_id && !beneficiary?.id) return;
    const id = beneficiary.beneficiary_id || beneficiary.id;
    setLoading(true);
    axios
      .get(`/app-data/reports/nutrition-summary/${id}`, { params: { ...nutritionHistoryFilters, _ts: Date.now() } })
      .then((response) => setNutritionHistory({ beneficiary: response.data.beneficiary || null, data: response.data.data || [] }))
      .catch(() => notify('error', 'Unable to load nutrition history.'))
      .finally(() => setLoading(false));
  };

  const loadScheduleSummary = () => {
    setLoading(true);
    axios
      .get('/app-data/reports/schedule-summary', { params: { ...scheduleFilters, _ts: Date.now() } })
      .then((response) => setScheduleData({ summary: response.data.summary || {}, data: response.data.data || [] }))
      .catch(() => notify('error', 'Unable to load schedule summary.'))
      .finally(() => setLoading(false));
  };

  const loadScheduleRecord = (schedule = selectedSchedule) => {
    if (!schedule?.id) return;
    setLoading(true);
    axios
      .get(`/app-data/reports/schedule-summary/${schedule.id}`, { params: { ...scheduleRecordFilters, _ts: Date.now() } })
      .then((response) => setScheduleRecord({ schedule: response.data.schedule || null, data: response.data.data || [] }))
      .catch(() => notify('error', 'Unable to load schedule record.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (view === 'attendance-summary') loadAttendanceSummary();
  }, [view, attendanceFilters]);

  useEffect(() => {
    if (view === 'student-attendance') loadStudentAttendance();
  }, [view, studentAttendanceFilters]);

  useEffect(() => {
    if (view === 'beneficiaries-masterlist') loadMasterlist();
  }, [view, masterlistFilters]);

  useEffect(() => {
    if (view === 'nutrition-summary') loadNutritionSummary();
  }, [view, nutritionFilters]);

  useEffect(() => {
    if (view === 'nutrition-history') loadNutritionHistory();
  }, [view, selectedBeneficiary, nutritionHistoryFilters]);

  useEffect(() => {
    if (view === 'schedule-summary') loadScheduleSummary();
  }, [view, scheduleFilters]);

  useEffect(() => {
    if (view === 'schedule-record') loadScheduleRecord();
  }, [view, scheduleRecordFilters]);

  const overviewCards = useMemo(() => ([
    {
      key: 'attendance-summary',
      title: 'Attendance Summary',
      icon: 'attendance',
      stats: [],
    },
    {
      key: 'beneficiaries-masterlist',
      title: 'Beneficiaries Masterlist Summary',
      icon: 'beneficiaries',
      stats: [
        ['Total Beneficiaries', overview?.beneficiaries?.total || 0],
        ['Active Beneficiaries', overview?.beneficiaries?.active || 0],
        ['Inactive Beneficiaries', overview?.beneficiaries?.inactive || 0],
      ],
    },
    {
      key: 'nutrition-summary',
      title: 'Nutrition Summary',
      icon: 'nutrition',
      stats: [
        ['Total Beneficiaries Checked', overview?.nutrition?.total_checked || 0],
        ['Normal Nutrition Count', overview?.nutrition?.normal || 0],
        ['Underweight Count', overview?.nutrition?.underweight || 0],
        ['Overweight Count', overview?.nutrition?.overweight || 0],
        ['Severely Underweight Count', overview?.nutrition?.severely_underweight || 0],
      ],
    },
    {
      key: 'schedule-summary',
      title: 'Schedule Summary',
      icon: 'schedules',
      stats: [
        ['Total Schedules', overview?.schedules?.total || 0],
        ['Morning Schedule Count', overview?.schedules?.morning || 0],
        ['Afternoon Schedule Count', overview?.schedules?.afternoon || 0],
        ['Active Schedules', overview?.schedules?.active || 0],
      ],
    },
  ]), [overview]);

  const renderHeader = (title, subtitle, backTarget = 'overview') => (
    <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 p-8 text-white shadow-xl lg:p-10">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Reports Management</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight lg:text-5xl">{title}</h2>
          {subtitle && <p className="mt-3 max-w-2xl text-base text-white/85">{subtitle}</p>}
        </div>
        {view !== 'overview' && (
          <ActionButton icon="chevronLeft" tone="white" onClick={() => setView(backTarget)}>
            Back
          </ActionButton>
        )}
      </div>
    </section>
  );

  const renderOverview = () => (
    <>
      {renderHeader('Reports Center')}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {overviewCards.map((card) => (
          <div key={card.key} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-700">
                  <AppIcon name={card.icon} className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
              </div>
              <ActionButton tone="green" onClick={() => setView(card.key)}>View Records</ActionButton>
            </div>
            {card.stats.length > 0 && (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {card.stats.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
      {loading && <p className="text-sm text-slate-500">Loading report totals...</p>}
    </>
  );

  const renderAttendanceSummary = () => (
    <>
      {renderHeader('Attendance Summary View Records', 'Search attendance records by beneficiary name.')}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="Beneficiary Name"><TextInput type="search" value={attendanceFilters.query} onChange={(e) => setObjectField(setAttendanceFilters, 'query', e.target.value)} placeholder="Search name" /></Field>
        </div>
      </section>
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <ReportTableHeader title="Attendance Summary Table" count={attendanceData.data.length}>
          <PrintDateInput
            value={attendanceFilters.attendance_date}
            onChange={(value) => setObjectField(setAttendanceFilters, 'attendance_date', value)}
          />
          <ActionButton
            icon="fileExport"
            tone="blue"
            className="self-start sm:self-auto"
            onClick={() => printTable('Overall Attendance Summary', [
              { label: 'Student Name', value: 'full_name' },
              { label: 'Present', value: 'total_present' },
              { label: 'Late', value: 'total_late' },
              { label: 'Absent', value: 'total_absent' },
              { label: 'Excused', value: 'total_excused' },
            ], attendanceData.data, {
              orientation: 'portrait',
              showSignatures: false,
              tableTitle: 'Attendance Summary Table',
              dateFilter: { value: attendanceFilters.attendance_date, applyToRows: false },
              meta: [
                { label: 'Attendance Date', value: attendanceFilters.attendance_date ? formatDate(attendanceFilters.attendance_date) : 'All Dates' },
                { label: 'Search Filter', value: attendanceFilters.query || 'All Students' },
              ],
            })}
          >
            Print
          </ActionButton>
        </ReportTableHeader>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Student Name</th>
                {['Present', 'Late', 'Absent', 'Excused'].map((head) => (
                  <th key={head} className="px-4 py-3 text-center font-semibold">{head}</th>
                ))}
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceData.data.length === 0 && <EmptyRow colSpan={6} />}
              {attendanceData.data.map((row) => (
                <tr key={row.beneficiary_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.full_name}</td>
                  <td className="px-4 py-3 text-center font-semibold text-green-700">{row.total_present || 0}</td>
                  <td className="px-4 py-3 text-center font-semibold text-amber-700">{row.total_late || 0}</td>
                  <td className="px-4 py-3 text-center font-semibold text-rose-700">{row.total_absent || 0}</td>
                  <td className="px-4 py-3 text-center font-semibold text-blue-700">{row.total_excused || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <ViewButton onClick={() => { setSelectedBeneficiary(row); setView('student-attendance'); }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderStudentAttendance = () => (
    <>
      {renderHeader('Specific Student Attendance Records', 'Individual attendance records separated by date and time.', 'attendance-summary')}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <SummaryCard title="Full Name" value={studentAttendance.beneficiary?.full_name || selectedBeneficiary?.full_name || '-'} icon="userProfile" />
        <SummaryCard title="Present" value={studentAttendance.beneficiary?.total_present || 0} icon="attendance" />
        <SummaryCard title="Late" value={studentAttendance.beneficiary?.total_late || 0} icon="clock" />
        <SummaryCard title="Absent" value={studentAttendance.beneficiary?.total_absent || 0} icon="x" />
        <SummaryCard title="Excused" value={studentAttendance.beneficiary?.total_excused || 0} icon="history" />
      </section>
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Date From"><TextInput type="date" value={studentAttendanceFilters.date_from} onChange={(e) => setObjectField(setStudentAttendanceFilters, 'date_from', e.target.value)} /></Field>
          <Field label="Date To"><TextInput type="date" value={studentAttendanceFilters.date_to} onChange={(e) => setObjectField(setStudentAttendanceFilters, 'date_to', e.target.value)} /></Field>
          <Field label="Attendance Status">
            <SelectInput value={studentAttendanceFilters.status} onChange={(e) => setObjectField(setStudentAttendanceFilters, 'status', e.target.value)}>
              <option>All Status</option>
              {attendanceStatuses.map((status) => <option key={status}>{status}</option>)}
            </SelectInput>
          </Field>
        </div>
      </section>
      {renderAttendanceRecordsTable(studentAttendance.data, (
        <>
          <PrintDateInput
            value={studentAttendanceFilters.attendance_date}
            onChange={(value) => setObjectField(setStudentAttendanceFilters, 'attendance_date', value)}
          />
          <ActionButton icon="fileExport" tone="blue" onClick={() => printTable('Individual Student Attendance Record', [
            { label: 'Full Name', value: 'full_name' },
            { label: 'Date', value: (row) => formatDate(row.date) },
            { label: 'Time In', value: (row) => formatTime12(row.time_in) },
            { label: 'Feeding Schedule', value: 'feeding_schedule' },
            { label: 'Attendance Status', value: 'attendance_status' },
            { label: 'Remarks', value: 'remarks' },
            { label: 'Recorded By', value: 'recorded_by' },
          ], studentAttendance.data, {
            dateFilter: { value: studentAttendanceFilters.attendance_date, fields: ['date'] },
          })}>Print</ActionButton>
        </>
      ))}
    </>
  );

  const renderAttendanceRecordsTable = (rows, actions = null) => (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <ReportTableHeader title="Attendance Records Table" count={rows.length}>
        {actions}
      </ReportTableHeader>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr>{['Full Name', 'Date', 'Time In', 'Feeding Schedule', 'Attendance Status', 'Remarks', 'Recorded By'].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={7} />}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.full_name}</td>
                <td className="px-4 py-3">{formatDate(row.date)}</td>
                <td className="px-4 py-3">{formatTime12(row.time_in)}</td>
                <td className="px-4 py-3">{display(row.feeding_schedule)}</td>
                <td className="px-4 py-3"><Pill value={row.attendance_status} /></td>
                <td className="px-4 py-3">{display(row.remarks)}</td>
                <td className="px-4 py-3">{display(row.recorded_by)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderMasterlist = () => (
    <>
      {renderHeader('Beneficiaries Masterlist View Records', 'Master list of beneficiary information with view and print actions.')}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="Search by Beneficiary Name"><TextInput type="search" value={masterlistFilters.query} onChange={(e) => setObjectField(setMasterlistFilters, 'query', e.target.value)} placeholder="Search name" /></Field>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard title="Total Beneficiaries" value={masterlist.summary.total_beneficiaries} icon="beneficiaries" />
        <SummaryCard title="Active Beneficiaries" value={masterlist.summary.active_beneficiaries} icon="attendance" />
        <SummaryCard title="Inactive Beneficiaries" value={masterlist.summary.inactive_beneficiaries} icon="x" />
      </section>
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <ReportTableHeader title="Beneficiaries Masterlist Table" count={masterlist.data.length}>
          <PrintDateInput
            value={masterlistFilters.registered_date}
            onChange={(value) => setObjectField(setMasterlistFilters, 'registered_date', value)}
          />
          <ActionButton icon="fileExport" tone="blue" onClick={() => printTable('Beneficiaries Masterlist', [
            { label: 'Full Name', value: 'full_name' },
            { label: 'Age', value: 'age' },
            { label: 'Sex', value: 'sex' },
            { label: 'Grade Level', value: 'grade_level' },
            { label: 'School Name', value: 'school_name' },
            { label: 'Feeding Schedule', value: 'feeding_schedule' },
            { label: 'Purok', value: 'purok' },
            { label: 'Contact Number', value: 'contact_number' },
            { label: 'Status', value: 'status' },
          ], masterlist.data, {
            dateFilter: { value: masterlistFilters.registered_date, fields: ['registered_date'] },
          })}>Print Masterlist</ActionButton>
        </ReportTableHeader>
        <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500"><tr>{['Full Name', 'Action'].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {masterlist.data.length === 0 && <EmptyRow colSpan={2} />}
              {masterlist.data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.full_name}</td>
                  <td className="px-4 py-3">
                    <ViewButton onClick={() => openBeneficiaryRecord(row.id, 'beneficiary-record')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const ReadOnlyField = ({ label, value, className = '' }) => (
    <div className={className}>
      <p className="mb-2 block text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex min-h-14 w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
        {display(value)}
      </div>
    </div>
  );

  const renderBeneficiaryRecord = () => {
    const record = beneficiaryRecord?.record;

    return (
      <>
        {renderHeader('Individual Beneficiary Record', 'Student, guardian, address, and school information.', 'beneficiaries-masterlist')}
        {!record && <p className="text-sm text-slate-500">Loading beneficiary record...</p>}
        {record && (
          <>
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-green-100 text-xl font-black text-green-700">
                    {String(record.complete_name || 'B').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{record.complete_name}</h3>
                    <p className="text-sm text-slate-500">{record.feeding_schedule}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PrintDateInput
                    value={beneficiaryRecordPrintDate}
                    onChange={setBeneficiaryRecordPrintDate}
                  />
                  <ActionButton icon="fileExport" tone="blue" onClick={() => printBeneficiaryRecord(record, beneficiaryRecord?.nutrition_records || [], beneficiaryRecordPrintDate)}>Print Record</ActionButton>
                </div>
              </div>
            </section>
            <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="flex-none">
                  <div className="flex h-40 w-40 items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white p-3">
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
                      <AppIcon name="userProfile" className="h-8 w-8" />
                      <p className="mt-3 text-center text-sm font-semibold">
                        {String(record.complete_name || 'Student').split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'Photo'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{record.profile_photo ? 'Profile photo uploaded.' : 'No profile photo uploaded.'}</p>
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900">Profile Photo</h3>
                  <p className="text-sm text-slate-500">Beneficiary profile image status.</p>
                </div>
              </div>
            </section>
            <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Student Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReadOnlyField label="Complete Name" value={record.complete_name} />
                <ReadOnlyField label="Age" value={record.age} />
                <ReadOnlyField label="Sex" value={record.sex} />
                <ReadOnlyField label="Date of Birth" value={formatDate(record.date_of_birth)} />
                <ReadOnlyField label="Height" value={record.height} />
                <ReadOnlyField label="Weight" value={record.weight} />
                <ReadOnlyField label="Student Contact Number" value={record.contact_number} className="lg:col-span-2" />
              </div>
            </section>
            <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">Parent / Guardian Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReadOnlyField label="Father's Name" value={record.father_name} />
                <ReadOnlyField label="Mother's Name" value={record.mother_name} />
                <ReadOnlyField label="Guardian's Name" value={record.guardian_name} />
                <ReadOnlyField label="Relationship to Guardian" value={record.relationship_to_guardian} />
                <ReadOnlyField label="Parent / Guardian Contact Number" value={record.parent_guardian_contact_number} />
                <ReadOnlyField label="Emergency Contact Number" value={record.emergency_contact_number} className="lg:col-span-2" />
              </div>
            </section>
            <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">Address Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReadOnlyField label="Complete Address" value={record.address} className="lg:col-span-2" />
              </div>
            </section>
            <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">School Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReadOnlyField label="Name of School" value={record.school_name} className="lg:col-span-2" />
                <ReadOnlyField label="School Level" value={record.school_level} />
                <ReadOnlyField label="Grade Level" value={record.grade_level} />
                <ReadOnlyField label="School Year" value={record.school_year} />
              </div>
            </section>
          </>
        )}
      </>
    );
  };

  const renderNutritionRecordsTable = (rows, editable = false, actions = null) => (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <ReportTableHeader title="Nutrition Information Table" count={rows.length}>
        {actions}
      </ReportTableHeader>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr>{['Date Recorded', 'Height', 'Weight', 'BMI', 'Nutrition Status', 'Remarks', 'Recorded By', editable ? 'Action' : null].filter(Boolean).map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={editable ? 8 : 7} />}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{formatDate(row.date_recorded)}</td>
                <td className="px-4 py-3">{row.height}</td>
                <td className="px-4 py-3">{row.weight}</td>
                <td className="px-4 py-3">{row.bmi}</td>
                <td className="px-4 py-3"><Pill value={row.nutrition_status} /></td>
                <td className="px-4 py-3">{display(row.remarks)}</td>
                <td className="px-4 py-3">{display(row.recorded_by)}</td>
                {editable && <td className="px-4 py-3"><ActionButton icon="edit" tone="amber" onClick={() => editNutritionRow(row)}>Edit</ActionButton></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderBeneficiaryEdit = () => {
    const record = beneficiaryRecord?.record;
    const nutritionRows = beneficiaryRecord?.nutrition_records || [];

    return (
      <>
        {renderHeader('Edit Beneficiary Record', 'Update personal, guardian, school, schedule, and nutrition information.', 'beneficiary-record')}
        {!record && <p className="text-sm text-slate-500">Loading edit form...</p>}
        {record && (
          <>
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Field label="First Name"><TextInput value={editForm.first_name} onChange={(e) => setObjectField(setEditForm, 'first_name', e.target.value)} /></Field>
                <Field label="Middle Name"><TextInput value={editForm.middle_name} onChange={(e) => setObjectField(setEditForm, 'middle_name', e.target.value)} /></Field>
                <Field label="Last Name"><TextInput value={editForm.last_name} onChange={(e) => setObjectField(setEditForm, 'last_name', e.target.value)} /></Field>
                <Field label="Sex">
                  <SelectInput value={editForm.sex} onChange={(e) => setObjectField(setEditForm, 'sex', e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                  </SelectInput>
                </Field>
                <Field label="Date of Birth"><TextInput type="date" value={editForm.birth_date} onChange={(e) => setObjectField(setEditForm, 'birth_date', e.target.value)} /></Field>
                <Field label="Height"><TextInput type="number" step="0.1" value={editForm.height} onChange={(e) => setObjectField(setEditForm, 'height', e.target.value)} /></Field>
                <Field label="Weight"><TextInput type="number" step="0.1" value={editForm.weight} onChange={(e) => setObjectField(setEditForm, 'weight', e.target.value)} /></Field>
                <Field label="Contact Number"><TextInput value={editForm.contact_number} onChange={(e) => setObjectField(setEditForm, 'contact_number', e.target.value)} /></Field>
                <Field label="Address"><TextInput value={editForm.address} onChange={(e) => setObjectField(setEditForm, 'address', e.target.value)} /></Field>
                <Field label="Purok">
                  <SelectInput value={editForm.purok_id} onChange={(e) => setObjectField(setEditForm, 'purok_id', e.target.value)}>
                    <option value="">Select Purok</option>
                    {puroks.map((purok) => <option key={purok.id} value={purok.id}>{purok.purok_name}</option>)}
                  </SelectInput>
                </Field>
                <Field label="School Name"><TextInput value={editForm.school_name} onChange={(e) => setObjectField(setEditForm, 'school_name', e.target.value)} /></Field>
                <Field label="School Level"><TextInput value={editForm.school_level} onChange={(e) => setObjectField(setEditForm, 'school_level', e.target.value)} /></Field>
                <Field label="Grade Level">
                  <SelectInput value={editForm.grade_level} onChange={(e) => setObjectField(setEditForm, 'grade_level', e.target.value)}>
                    <option value="">Select Grade Level</option>
                    {gradeLevels.map((grade) => <option key={grade}>{grade}</option>)}
                  </SelectInput>
                </Field>
                <Field label="School Year"><TextInput value={editForm.school_year} onChange={(e) => setObjectField(setEditForm, 'school_year', e.target.value)} /></Field>
                <Field label="Father's Name"><TextInput value={editForm.father_name} onChange={(e) => setObjectField(setEditForm, 'father_name', e.target.value)} /></Field>
                <Field label="Mother's Name"><TextInput value={editForm.mother_name} onChange={(e) => setObjectField(setEditForm, 'mother_name', e.target.value)} /></Field>
                <Field label="Guardian's Name"><TextInput value={editForm.guardian_name} onChange={(e) => setObjectField(setEditForm, 'guardian_name', e.target.value)} /></Field>
                <Field label="Relationship to Guardian"><TextInput value={editForm.relationship_to_guardian} onChange={(e) => setObjectField(setEditForm, 'relationship_to_guardian', e.target.value)} /></Field>
                <Field label="Parent / Guardian Contact"><TextInput value={editForm.parent_guardian_contact_number} onChange={(e) => setObjectField(setEditForm, 'parent_guardian_contact_number', e.target.value)} /></Field>
                <Field label="Emergency Contact"><TextInput value={editForm.emergency_contact_number} onChange={(e) => setObjectField(setEditForm, 'emergency_contact_number', e.target.value)} /></Field>
                <Field label="Feeding Schedule">
                  <SelectInput value={editForm.feeding_schedule_id} onChange={(e) => setObjectField(setEditForm, 'feeding_schedule_id', e.target.value)}>
                    <option value="">No assigned primary schedule</option>
                    {schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.label}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Status">
                  <SelectInput value={editForm.status} onChange={(e) => setObjectField(setEditForm, 'status', e.target.value)}>
                    {beneficiaryStatuses.map((status) => <option key={status}>{status}</option>)}
                  </SelectInput>
                </Field>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <ActionButton tone="white" onClick={() => setView('beneficiary-record')}>Cancel</ActionButton>
                <ActionButton icon="attendance" tone="green" onClick={saveBeneficiary}>Save Changes</ActionButton>
              </div>
            </section>
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">{nutritionForm.id ? 'Update Nutrition Record' : 'Add Nutrition Record'}</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
                <Field label="Date Recorded"><TextInput type="date" value={nutritionForm.date_recorded} onChange={(e) => setObjectField(setNutritionForm, 'date_recorded', e.target.value)} /></Field>
                <Field label="Height"><TextInput type="number" step="0.1" value={nutritionForm.height_cm} onChange={(e) => setObjectField(setNutritionForm, 'height_cm', e.target.value)} /></Field>
                <Field label="Weight"><TextInput type="number" step="0.1" value={nutritionForm.weight_kg} onChange={(e) => setObjectField(setNutritionForm, 'weight_kg', e.target.value)} /></Field>
                <Field label="Nutrition Status">
                  <SelectInput value={nutritionForm.nutrition_status} onChange={(e) => setObjectField(setNutritionForm, 'nutrition_status', e.target.value)}>
                    <option value="">Auto classify</option>
                    {nutritionStatuses.map((status) => <option key={status}>{status}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Remarks"><TextInput value={nutritionForm.remarks} onChange={(e) => setObjectField(setNutritionForm, 'remarks', e.target.value)} /></Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton icon="attendance" tone="green" onClick={saveNutrition}>{nutritionForm.id ? 'Update Nutrition' : 'Add Nutrition'}</ActionButton>
                <ActionButton tone="white" onClick={() => setNutritionForm({ ...blankNutritionForm, date_recorded: todayDate() })}>Clear Nutrition Form</ActionButton>
              </div>
            </section>
            {renderNutritionRecordsTable(nutritionRows, true)}
          </>
        )}
      </>
    );
  };

  const renderNutritionSummary = () => (
    <>
      {renderHeader('Nutrition Summary View Records', 'Nutrition records with BMI classification, history drilldown, and print output.')}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="Beneficiary Name"><TextInput type="search" value={nutritionFilters.query} onChange={(e) => setObjectField(setNutritionFilters, 'query', e.target.value)} placeholder="Search name" /></Field>
          <Field label="Nutrition Status">
            <SelectInput value={nutritionFilters.nutrition_status} onChange={(e) => setObjectField(setNutritionFilters, 'nutrition_status', e.target.value)}>
              <option>All Status</option>
              {nutritionStatuses.map((status) => <option key={status}>{status}</option>)}
            </SelectInput>
          </Field>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <SummaryCard title="Checked" value={nutritionData.summary.total_checked} icon="nutrition" />
        <SummaryCard title="Normal" value={nutritionData.summary.normal} icon="attendance" />
        <SummaryCard title="Underweight" value={nutritionData.summary.underweight} icon="clock" />
        <SummaryCard title="Overweight" value={nutritionData.summary.overweight} icon="reports" />
        <SummaryCard title="Severely Underweight" value={nutritionData.summary.severely_underweight} icon="x" />
      </section>
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <ReportTableHeader title="Nutrition Summary Table" count={nutritionData.data.length}>
          <PrintDateInput
            value={nutritionFilters.recorded_date}
            onChange={(value) => setObjectField(setNutritionFilters, 'recorded_date', value)}
          />
          <ActionButton icon="fileExport" tone="blue" onClick={() => printTable('Nutrition Summary', [
            { label: 'Full Name', value: 'full_name' },
            { label: 'Age', value: 'age' },
            { label: 'Sex', value: 'sex' },
            { label: 'Height', value: 'height' },
            { label: 'Weight', value: 'weight' },
            { label: 'BMI', value: 'bmi' },
            { label: 'Nutrition Status', value: 'nutrition_status' },
            { label: 'Date Recorded', value: (row) => formatDate(row.date_recorded) },
            { label: 'Remarks', value: 'remarks' },
          ], nutritionData.data, {
            dateFilter: { value: nutritionFilters.recorded_date, fields: ['date_recorded'] },
          })}>Print</ActionButton>
        </ReportTableHeader>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500"><tr>{['Full Name', 'Age', 'Sex', 'Height', 'Weight', 'BMI', 'Nutrition Status', 'Date Recorded', 'Remarks', 'Action'].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {nutritionData.data.length === 0 && <EmptyRow colSpan={10} />}
              {nutritionData.data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.full_name}</td>
                  <td className="px-4 py-3">{row.age}</td>
                  <td className="px-4 py-3">{row.sex}</td>
                  <td className="px-4 py-3">{row.height}</td>
                  <td className="px-4 py-3">{row.weight}</td>
                  <td className="px-4 py-3">{row.bmi}</td>
                  <td className="px-4 py-3"><Pill value={row.nutrition_status} /></td>
                  <td className="px-4 py-3">{formatDate(row.date_recorded)}</td>
                  <td className="px-4 py-3">{display(row.remarks)}</td>
                  <td className="px-4 py-3"><ViewButton onClick={() => { setSelectedBeneficiary(row); setView('nutrition-history'); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderNutritionHistory = () => (
    <>
      {renderHeader('Individual Nutrition History', 'Nutrition history of the selected beneficiary.', 'nutrition-summary')}
      {renderNutritionRecordsTable(nutritionHistory.data, false, (
        <>
          <PrintDateInput
            value={nutritionHistoryFilters.recorded_date}
            onChange={(value) => setObjectField(setNutritionHistoryFilters, 'recorded_date', value)}
          />
          <ActionButton icon="fileExport" tone="blue" onClick={() => printTable('Individual Nutrition History', [
            { label: 'Full Name', value: 'full_name' },
            { label: 'Date Recorded', value: (row) => formatDate(row.date_recorded) },
            { label: 'Height', value: 'height' },
            { label: 'Weight', value: 'weight' },
            { label: 'BMI', value: 'bmi' },
            { label: 'Nutrition Status', value: 'nutrition_status' },
            { label: 'Remarks', value: 'remarks' },
            { label: 'Recorded By', value: 'recorded_by' },
          ], nutritionHistory.data, {
            dateFilter: { value: nutritionHistoryFilters.recorded_date, fields: ['date_recorded'] },
          })}>Print</ActionButton>
        </>
      ))}
    </>
  );

  const renderScheduleSummary = () => (
    <>
      {renderHeader('Schedule Summary View Records', 'All schedules with assigned beneficiary counts.')}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="Beneficiary Name"><TextInput type="search" value={scheduleFilters.beneficiary_query} onChange={(e) => setObjectField(setScheduleFilters, 'beneficiary_query', e.target.value)} placeholder="Search assigned beneficiary" /></Field>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard title="Total Schedules" value={scheduleData.summary.total_schedules} icon="schedules" />
        <SummaryCard title="Morning" value={scheduleData.summary.morning} icon="clock" />
        <SummaryCard title="Afternoon" value={scheduleData.summary.afternoon} icon="clock" />
        <SummaryCard title="Active Schedules" value={scheduleData.summary.active} icon="attendance" />
      </section>
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <ReportTableHeader title="Schedule Summary Table" count={scheduleData.data.length}>
          <PrintDateInput
            value={scheduleFilters.schedule_date}
            onChange={(value) => setObjectField(setScheduleFilters, 'schedule_date', value)}
          />
          <ActionButton icon="fileExport" tone="blue" onClick={() => printTable('Schedule Summary', [
            { label: 'Schedule Name', value: 'schedule_name' },
            { label: 'Feeding Schedule', value: 'feeding_schedule' },
            { label: 'Date or Days', value: 'date_or_days' },
            { label: 'Time', value: (row) => formatTime12(row.time) },
            { label: 'Assigned Beneficiaries Count', value: 'assigned_beneficiaries_count' },
            { label: 'Status', value: 'status' },
            { label: 'Remarks', value: 'remarks' },
          ], scheduleData.data, {
            dateFilter: { value: scheduleFilters.schedule_date, fields: ['schedule_date', 'date_or_days'] },
          })}>Print</ActionButton>
        </ReportTableHeader>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500"><tr>{['Schedule Name', 'Feeding Schedule', 'Date or Days', 'Time', 'Assigned Beneficiaries Count', 'Status', 'Remarks', 'Action'].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {scheduleData.data.length === 0 && <EmptyRow colSpan={8} />}
              {scheduleData.data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.schedule_name}</td>
                  <td className="px-4 py-3">{row.feeding_schedule}</td>
                  <td className="px-4 py-3">{row.date_or_days}</td>
                  <td className="px-4 py-3">{formatTime12(row.time)}</td>
                  <td className="px-4 py-3">{row.assigned_beneficiaries_count}</td>
                  <td className="px-4 py-3"><Pill value={row.status} /></td>
                  <td className="px-4 py-3">{display(row.remarks)}</td>
                  <td className="px-4 py-3"><ViewButton onClick={() => { setSelectedSchedule(row); setView('schedule-record'); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderScheduleRecord = () => {
    const activeSchedule = scheduleRecord.schedule || selectedSchedule || {};
    const scheduleName = display(activeSchedule.schedule_name);
    const scheduleDateOrDays = display(activeSchedule.date_or_days);
    const scheduleTime = formatTime12(activeSchedule.time);
    const scheduleStatus = display(activeSchedule.status);
    const printTitle = scheduleName !== '-' ? `Assigned Beneficiaries - ${scheduleName}` : 'Assigned Beneficiaries';

    return (
      <>
        {renderHeader('View Schedule Record', 'Beneficiaries assigned to the selected feeding schedule.', 'schedule-summary')}
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">{scheduleName}</h3>
              <p className="text-sm text-slate-500">{scheduleDateOrDays} - {scheduleTime}</p>
            </div>
          </div>
        </section>
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Search by Beneficiary Name"><TextInput type="search" value={scheduleRecordFilters.query} onChange={(e) => setObjectField(setScheduleRecordFilters, 'query', e.target.value)} /></Field>
            <Field label="Purok">
              <SelectInput value={scheduleRecordFilters.purok} onChange={(e) => setObjectField(setScheduleRecordFilters, 'purok', e.target.value)}>
                <option>All Purok</option>
                {puroks.map((purok) => <option key={purok.id}>{purok.purok_name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Grade Level">
              <SelectInput value={scheduleRecordFilters.grade_level} onChange={(e) => setObjectField(setScheduleRecordFilters, 'grade_level', e.target.value)}>
                <option>All Grade Levels</option>
                {gradeLevels.map((grade) => <option key={grade}>{grade}</option>)}
              </SelectInput>
            </Field>
          </div>
        </section>
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <ReportTableHeader title="Assigned Beneficiaries Table" count={scheduleRecord.data.length}>
            <PrintDateInput
              value={scheduleRecordFilters.schedule_date}
              onChange={(value) => setObjectField(setScheduleRecordFilters, 'schedule_date', value)}
            />
            <ActionButton icon="fileExport" tone="blue" onClick={() => printTable(printTitle, [
              { label: 'Full Name', value: 'full_name' },
              { label: 'Age', value: 'age' },
              { label: 'Sex', value: 'sex' },
              { label: 'Grade Level', value: 'grade_level' },
              { label: 'School Name', value: 'school_name' },
              { label: 'Purok', value: 'purok' },
              { label: 'Contact Number', value: 'contact_number' },
              { label: 'Status', value: 'status' },
            ], scheduleRecord.data, {
              dateFilter: { value: scheduleRecordFilters.schedule_date, fields: ['schedule_date'] },
              tableTitle: 'Assigned Beneficiaries Table',
              meta: [
                { label: 'Schedule Name', value: scheduleName },
                { label: 'Date or Days', value: scheduleDateOrDays },
                { label: 'Time', value: scheduleTime },
                { label: 'Schedule Status', value: scheduleStatus },
              ],
            })}>Print</ActionButton>
          </ReportTableHeader>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500"><tr>{['Full Name', 'Age', 'Sex', 'Grade Level', 'School Name', 'Purok', 'Contact Number', 'Status'].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {scheduleRecord.data.length === 0 && <EmptyRow colSpan={8} />}
                {scheduleRecord.data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.full_name}</td>
                    <td className="px-4 py-3">{row.age}</td>
                    <td className="px-4 py-3">{row.sex}</td>
                    <td className="px-4 py-3">{row.grade_level}</td>
                    <td className="px-4 py-3">{row.school_name}</td>
                    <td className="px-4 py-3">{row.purok}</td>
                    <td className="px-4 py-3">{display(row.contact_number)}</td>
                    <td className="px-4 py-3"><Pill value={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  };

  return (
    <AdminLayout activePage="reports" title="Reports">
      {view === 'overview' && renderOverview()}
      {view === 'attendance-summary' && renderAttendanceSummary()}
      {view === 'student-attendance' && renderStudentAttendance()}
      {view === 'beneficiaries-masterlist' && renderMasterlist()}
      {view === 'beneficiary-record' && renderBeneficiaryRecord()}
      {view === 'beneficiary-edit' && renderBeneficiaryEdit()}
      {view === 'nutrition-summary' && renderNutritionSummary()}
      {view === 'nutrition-history' && renderNutritionHistory()}
      {view === 'schedule-summary' && renderScheduleSummary()}
      {view === 'schedule-record' && renderScheduleRecord()}
      {loading && view !== 'overview' && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">
          Loading records...
        </div>
      )}
    </AdminLayout>
  );
}
