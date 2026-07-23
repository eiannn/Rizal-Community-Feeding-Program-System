import React from 'react';

const icons = {
  dashboard: (
    <path d="M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9" />
  ),
  beneficiaries: (
    <>
      <path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M21 20v-1a3.5 3.5 0 0 0-2.2-3.3" />
      <circle cx="17.5" cy="8.5" r="2.5" />
    </>
  ),
  schedules: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  attendance: (
    <>
      <path d="M20 7 9 18l-5-5" />
    </>
  ),
  nutrition: (
    <>
      <path d="M12 3v18M5 8h14M7 3l1 5m8-5-1 5" />
    </>
  ),
  reports: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  users: (
    <>
      <circle cx="8.5" cy="8.5" r="3.5" />
      <path d="M3 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.5" />
      <path d="M15 20a4.5 4.5 0 0 1 6 0" />
    </>
  ),
  userProfile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
      <path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 16H6l1.5-2.5V10a4.5 4.5 0 1 1 9 0v3.5z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M7 9h.01M17 15h.01" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V8M17 16v-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  fileExport: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M12 11v7M9.5 15.5 12 18l2.5-2.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0 1 4" />
      <path d="M21 4v7h-7" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h4l2-3h4l2 3h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <path d="M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </>
  ),
  view: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10-10a2 2 0 1 0-4-4L4 16v4z" />
    </>
  ),
  delete: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v6l4 2" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  chevronDown: (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  chevronLeft: (
    <>
      <path d="m15 18-6-6 6-6" />
    </>
  ),
  chevronRight: (
    <>
      <path d="m9 6 6 6-6 6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M12 4v16" />
    </>
  ),
};

export default function AppIcon({ name, className = 'w-5 h-5', strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icons[name] || <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}
