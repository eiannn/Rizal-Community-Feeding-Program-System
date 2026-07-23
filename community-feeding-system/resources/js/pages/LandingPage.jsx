import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  FiArrowRight,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiLock,
  FiLogIn,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from 'react-icons/fi';

const heroFeatures = [
  { label: 'Used by barangay teams', icon: FiUsers },
  { label: 'Secure records', icon: FiShield },
  { label: 'Faster reporting', icon: FiTrendingUp },
];

function getFirstError(errors, field) {
  const value = errors?.[field];
  if (!value) return '';
  return Array.isArray(value) ? value[0] : String(value);
}

function createAuthFormState() {
  return {
    email_or_username: '',
    password: '',
    role: '',
  };
}

function InputField({ label, name, type = 'text', value, onChange, placeholder, error, autoComplete, required = true, Icon }) {
  const isPasswordField = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /> : null}
        <input
          type={resolvedType}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          required={required}
          placeholder={placeholder}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          className={`w-full rounded-lg border bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            Icon ? 'pl-11' : ''
          } ${
            isPasswordField ? 'pr-12' : ''
          } ${
            error
              ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
          }`}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-400 transition hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function RoleSelector({ value, onChange, error }) {
  const options = [
    { value: 'admin', label: 'Admin' },
    { value: 'staff', label: 'Staff' },
  ];
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-bold text-slate-700">Select Role</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3.5 text-left text-sm font-semibold transition ${
          error ? 'border-rose-400' : 'border-slate-200'
        } bg-white text-slate-900 shadow-sm`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <FiShield className="h-4 w-4 text-slate-600" />
          <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
            {selectedOption?.label || 'Select Role'}
          </span>
        </span>
        <FiChevronDown className="h-5 w-5 text-slate-500" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-3 text-sm font-semibold text-slate-400">Select Role</div>
          <div className="border-t border-slate-100" />
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 transition ${
                value === option.value ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50'
              }`}
            >
              <FiShield className="h-4 w-4 text-slate-500" />
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function AuthModal({ open, setOpen, csrfToken, status, errors, old, routes, logoUrl }) {
  const formRef = useRef(null);
  const [form, setForm] = useState(() => createAuthFormState());
  const [submitting, setSubmitting] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  const clearCredentialFields = useCallback(() => {
    setForm((prev) => ({ ...prev, email_or_username: '', password: '' }));

    const formNode = formRef.current;
    if (!formNode) return;

    ['email_or_username', 'password'].forEach((fieldName) => {
      const input = formNode.elements.namedItem(fieldName);
      if (input && 'value' in input) {
        input.value = '';
      }
    });
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setForm(createAuthFormState());
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    setForm(createAuthFormState());
    setLocalErrors({});
    setSubmitting(false);

    const timers = [0, 50, 250, 750].map((delay) => window.setTimeout(clearCredentialFields, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [clearCredentialFields, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeModal, open]);

  if (!open) return null;

  const displayedErrors = Object.keys(localErrors).length > 0 ? localErrors : errors;
  const identifierError = getFirstError(displayedErrors, 'email_or_username') || getFirstError(displayedErrors, 'email');
  const passwordError = getFirstError(displayedErrors, 'password');
  const roleError = getFirstError(displayedErrors, 'role');

  const handleSubmit = (event) => {
    event.preventDefault();
    const resolvedCsrfToken = csrfToken || document.querySelector('meta[name="csrf-token"]')?.content || '';

    const nextErrors = {};
    if (!form.email_or_username.trim()) {
      nextErrors.email_or_username = 'User must enter email or username.';
    }
    if (!form.password) {
      nextErrors.password = 'User must enter password.';
    }
    if (!['admin', 'staff'].includes(form.role)) {
      nextErrors.role = 'User must select either Admin or Staff.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setLocalErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setLocalErrors({});

    axios
      .post(routes.apiLogin || '/api/auth/login', {
        _token: resolvedCsrfToken,
        email_or_username: form.email_or_username,
        password: form.password,
        role: form.role,
      }, {
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': resolvedCsrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      .then((response) => {
        try {
          window.sessionStorage.setItem('app:login-success', response.data?.message || 'Signed in successfully!');
        } catch (error) {
          // Ignore storage failures and continue the successful redirect.
        }
        window.location.assign(response.data?.redirect_to || routes.dashboard || '/dashboard');
      })
      .catch((error) => {
        const responseErrors = error?.response?.data?.errors;
        if (responseErrors) {
          setLocalErrors(responseErrors);
          return;
        }

        setLocalErrors({
          email_or_username:
            error?.response?.status === 419
              ? 'Your login session expired. Please refresh the page and try again.'
              : error?.response?.data?.message || 'Invalid email/username or password.',
        });
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/10 px-4 py-8 backdrop-blur-xl">
      <button type="button" className="absolute inset-0 z-10" onClick={closeModal} aria-label="Close authentication modal" />

      <div className="relative z-20 w-full max-w-md rounded-[2rem] border border-slate-200/30 bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-7 backdrop-blur-xl">
        {status ? <div className="mb-4 rounded-2xl border border-emerald-200/25 bg-emerald-50/15 px-4 py-2.5 text-sm font-medium text-emerald-800">{status}</div> : null}

        <form
          ref={formRef}
          method="POST"
          action={routes.login}
          onSubmit={handleSubmit}
          className="space-y-4"
          autoComplete="off"
        >
          <input type="hidden" name="_token" value={csrfToken} />
          <input type="hidden" name="auth" value="login" />

          <div className="text-center">
            <img
              src={logoUrl || '/images/system-logo.png'}
              alt="Community Feeding Program Monitoring System in Barangay Rizal Bansalan logo"
              className="mx-auto h-20 w-auto max-w-[210px] object-contain"
            />
            <h3 className="mt-4 text-2xl font-black text-slate-950">Authorized Personnel Login</h3>
          </div>

          <InputField
            label="Email or Username"
            name="email_or_username"
            value={form.email_or_username}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, email_or_username: value }));
              setLocalErrors((prev) => ({ ...prev, email_or_username: undefined, email: undefined }));
            }}
            placeholder="name@gmail.com"
            autoComplete="off"
            error={identifierError}
            Icon={FiUser}
          />

          <InputField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, password: value }));
              setLocalErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Enter your password"
            autoComplete="new-password"
            error={passwordError}
            Icon={FiLock}
          />

          <RoleSelector
            value={form.role}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, role: value }));
              setLocalErrors((prev) => ({ ...prev, role: undefined }));
            }}
            error={roleError}
          />

          <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-600">
            <input type="checkbox" name="remember" className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-200" />
            <span>Remember me on this device</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-3.5 font-black text-white shadow-lg transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-75"
          >
            <FiLogIn className="h-5 w-5" />
            {submitting ? 'Signing in...' : 'Login'}
          </button>

          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-500">
            Access is restricted to authorized personnel only.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LandingPage(props) {
  const {
    authenticated = false,
    routes = {},
    csrfToken = '',
    status = '',
    errors = {},
    old = {},
    shouldOpenAuth = false,
    logoUrl = '/images/system-logo.png',
  } = props;

  const [openAuth, setOpenAuth] = useState(shouldOpenAuth && !authenticated);

  useEffect(() => {
    if (shouldOpenAuth && !authenticated) {
      setOpenAuth(true);
    }
  }, [authenticated, shouldOpenAuth]);

  const openLogin = () => {
    setOpenAuth(true);
  };

  return (
    <div
      className="landing-page landing-hero-shell h-screen overflow-hidden text-white"
    >
      <main className="relative z-10 mx-auto flex h-screen w-full max-w-7xl items-center px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-8">
        <section id="overview" className="relative h-full w-full">
          <div className="landing-dot-pattern" aria-hidden="true" />
          <div className="landing-leaf landing-leaf-left" aria-hidden="true" />
          <div className="landing-leaf landing-leaf-right" aria-hidden="true" />

          <div className="grid h-full min-h-0 items-center gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-8 xl:gap-10">
            <div className="hero-copy max-w-[640px]">
              <h1 className="hero-title font-black uppercase text-white">
                COMMUNITY
                <br />
                FEEDING PROGRAM
                <br />
                MONITORING SYSTEM IN
                <br />
                BARANGAY RIZAL BANSALAN
              </h1>
              <p className="hero-subtitle mt-4 max-w-[610px] text-slate-100/90">
                A digital system for managing student records, attendance, feeding records, and reports in Barangay Rizal, Bansalan.
              </p>

              <div className="mt-6 flex flex-wrap gap-4">
                {authenticated ? (
                  <a
                    href={routes.dashboard || '/dashboard'}
                    className="hero-login-button inline-flex items-center justify-between gap-5 rounded-[14px] text-lg font-bold text-white transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <FiLock className="h-5 w-5" />
                    Open Dashboard
                    <FiArrowRight className="h-6 w-6" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={openLogin}
                    className="hero-login-button inline-flex items-center justify-between gap-5 rounded-[14px] text-lg font-bold text-white transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <FiLock className="h-5 w-5" />
                    Login
                    <FiArrowRight className="h-6 w-6" />
                  </button>
                )}
              </div>

              <div className="hero-feature-grid mt-5 grid max-w-[560px] gap-3 sm:grid-cols-3">
                {heroFeatures.map((item) => {
                  const FeatureIcon = item.icon;
                  return (
                    <div key={item.label} className="hero-feature-card flex items-center rounded-[13px] text-white">
                      <span className="hero-feature-icon inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-800 text-white shadow-lg shadow-green-950/30">
                        <FeatureIcon className="h-5 w-5" />
                      </span>
                      <span className="font-semibold leading-snug">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hero-logo-panel relative flex min-h-0 items-center justify-center">
              <div className="hero-logo-aura" aria-hidden="true" />
              <div className="hero-logo-orbit">
                <div className="logo-hero-stage hero-logo-mark">
                  <img
                    src={logoUrl}
                    alt="Community Feeding Program Monitoring System in Barangay Rizal Bansalan logo"
                    className="logo-rotate-horizontal h-full w-full object-contain"
                  />
                </div>
              </div>
              <div className="hero-spark hero-spark-one" aria-hidden="true" />
              <div className="hero-spark hero-spark-two" aria-hidden="true" />
              <div className="hero-spark hero-spark-three" aria-hidden="true" />
            </div>
          </div>
        </section>
      </main>

      {!authenticated ? (
        <AuthModal
          open={openAuth}
          setOpen={setOpenAuth}
          csrfToken={csrfToken}
          status={status}
          errors={errors}
          old={old}
          routes={routes}
          logoUrl={logoUrl}
        />
      ) : null}
    </div>
  );
}
