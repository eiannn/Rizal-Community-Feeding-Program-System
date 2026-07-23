import './bootstrap';
import '../css/app.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import FeedingSchedulePage from './pages/FeedingSchedule';
import AttendancePage from './pages/AttendancePage';
import NutritionPage from './pages/NutritionPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';

const app = document.getElementById('app');

if (app) {
    const page = app.dataset.page || 'welcome';
    let props = {};

    try {
        props = app.dataset.props ? JSON.parse(app.dataset.props) : {};
    } catch (error) {
        props = {};
    }

    const pages = {
        welcome: <LandingPage {...props} />,
        dashboard: <DashboardPage {...props} />,
        dashboardLegacy: <DashboardPage {...props} />,
        indexLegacy: <DashboardPage {...props} />,
        beneficiaries: <BeneficiariesPage />,
        schedules: <FeedingSchedulePage />,
        attendance: <AttendancePage />,
        nutrition: <NutritionPage />,
        reports: <ReportsPage />,
        users: <UsersPage {...props} />,
        profile: <ProfilePage {...props} />,
    };

    ReactDOM.createRoot(app).render(
        pages[page] || <div className="p-10 text-red-600">Page not found.</div>
    );
}
