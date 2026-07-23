import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import AdminLayout from '../components/AdminLayout';
import AppIcon from '../components/AppIcon';

const statusClass = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
};

const formatAgeSex = (row) => {
  const sex = row.sex || (String(row.age_sex || '').split('/')[1]?.trim() || '-');

  if (row.birth_date) {
    const birth = new Date(row.birth_date);
    if (!Number.isNaN(birth.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
      }
      if (age >= 0) {
        return `${age} / ${sex}`;
      }
    }
  }

  const rawAge = String(row.age_sex || '').split('/')[0]?.trim();
  const asNumber = Number(rawAge);
  if (Number.isFinite(asNumber)) {
    return `${Math.abs(Math.trunc(asNumber))} / ${sex}`;
  }

  return `- / ${sex}`;
};

const formatContactInput = (value) => {
  return value.replace(/\D/g, '').slice(0, 11);
};

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const calculateBirthDateFromAge = (value) => {
  const age = Number(value);

  if (!Number.isFinite(age) || age < 1) {
    return '';
  }

  const suggestedBirthDate = new Date();
  suggestedBirthDate.setFullYear(suggestedBirthDate.getFullYear() - Math.trunc(age));

  return formatDateInputValue(suggestedBirthDate);
};

const applyAgeChange = (previous, age) => {
  const birthDate = calculateBirthDateFromAge(age);

  return {
    ...previous,
    age,
    birth_date: birthDate,
  };
};

const isValidPhilippinesNumber = (value) => {
  return /^09\d{9}$/.test(value);
};

const blankBeneficiaryForm = {
  profile_photo: null,
  profile_photo_url: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  age: '',
  sex: 'Male',
  birth_date: '',
  height_cm: '',
  weight_kg: '',
  student_contact: '',
  father_name: '',
  mother_name: '',
  guardian_name: '',
  guardian_relationship: '',
  parent_guardian_contact: '',
  emergency_contact: '',
  address: '',
  province_code: '',
  province_name: '',
  city_municipality_code: '',
  city_municipality_name: '',
  barangay_code: '',
  barangay_name: '',
  purok: '',
  street_address: '',
  school_name: '',
  school_level: '',
  grade_level: '',
  school_year: '',
};

const blankEditBeneficiaryForm = {
  ...blankBeneficiaryForm,
  beneficiary_code: '',
  guardian_contact: '',
  contact_number: '',
  purok_id: '',
  status: 'Active',
};

const purokOptions = [
  'MAGSASAKA',
  'SINAGTALA',
  'KAUNLARAN',
  'PAKIKISAMA A',
  'DIKE',
  'MAHARLIKA',
  'Bukang Liwayway',
  'Marikit',
  'Pakikisama B',
  'PAG-IBIG',
  'BAYANIHAN',
  'MAYPALAD',
];

const guardianRelationshipOptions = [
  'Father',
  'Mother',
  'Grandparent',
  'Aunt',
  'Uncle',
  'Sibling',
  'Other',
];

const schoolLevelOptions = ['Elementary', 'High School', 'Senior High School', 'College'];

const gradeLevelOptions = {
  Elementary: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  'High School': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'Senior High School': ['Grade 11', 'Grade 12'],
  College: ['1st Year College', '2nd Year College', '3rd Year College', '4th Year College'],
};

const blankAddressOptions = {
  cities: [],
  barangays: [],
  isLoadingCities: false,
  isLoadingBarangays: false,
  citiesError: '',
  barangaysError: '',
};

const normalizePsgcList = (items) => {
  const list = Array.isArray(items) ? items : (Array.isArray(items?.data) ? items.data : []);

  return list
    .map((item) => ({
      ...item,
      code: String(item.code || item.psgcCode || item.psgc10DigitCode || ''),
      name: String(item.name || item.description || ''),
    }))
    .filter((item) => item.code && item.name)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const fetchPsgcList = (endpoint) => {
  return axios.get(`/app-data/psgc${endpoint}`).then((response) => normalizePsgcList(response.data));
};

const buildCompleteAddress = (values) => {
  return [
    values.purok,
    values.barangay_name,
    values.city_municipality_name,
    values.province_name,
  ].map((part) => String(part || '').trim()).filter(Boolean).join(', ');
};

const hasSelectedBarangay = (values) => Boolean(values.barangay_code && values.barangay_name);

function SearchableDropdown({
  label,
  value,
  selectedLabel,
  options,
  onSelect,
  placeholder,
  searchPlaceholder,
  disabled = false,
  loading = false,
  error = '',
  validationError = '',
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return options;
    }

    return options.filter((option) => option.name.toLowerCase().includes(keyword));
  }, [options, search]);

  const borderClass = validationError ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200';
  const disabledClass = disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-900 hover:border-green-300';

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}{required ? <span className="text-rose-500"> *</span> : null}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
        className={`flex h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${borderClass} ${disabledClass}`}
      >
        <span className={`truncate ${selectedLabel ? 'text-slate-900' : 'text-slate-400'}`}>
          {selectedLabel || placeholder}
        </span>
        <AppIcon name="chevronDown" className={`h-4 w-4 flex-none transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <AppIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {loading ? (
              <p className="rounded-xl px-3 py-3 text-sm font-medium text-slate-500">Loading...</p>
            ) : error ? (
              <p className="rounded-xl bg-rose-50 px-3 py-3 text-sm font-medium text-rose-600">{error}</p>
            ) : filteredOptions.length === 0 ? (
              <p className="rounded-xl px-3 py-3 text-sm font-medium text-slate-500">No results found.</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setSearch('');
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-green-50 ${value === option.code ? 'bg-green-50 font-semibold text-green-800' : 'text-slate-700'}`}
                >
                  <span>{option.name}</span>
                  {value === option.code ? <AppIcon name="attendance" className="h-4 w-4 text-green-700" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {validationError ? <p className="mt-2 text-xs text-rose-600">{validationError}</p> : null}
      {!validationError && error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function AddressInformationSection({
  values,
  setValues,
  errors = {},
  provinces,
  provinceLoading,
  provinceError,
  cities,
  citiesLoading,
  citiesError,
  barangays,
  barangaysLoading,
  barangaysError,
  onProvinceSelect,
  onCitySelect,
  onBarangaySelect,
}) {
  const barangaySelected = hasSelectedBarangay(values);
  const disabledInputClass = barangaySelected ? 'bg-slate-50' : 'cursor-not-allowed bg-slate-100 text-slate-400';

  return (
    <div className="rounded-[24px] border border-slate-200 p-6">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">Address Information</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SearchableDropdown
          label="Province"
          value={values.province_code}
          selectedLabel={values.province_name}
          options={provinces}
          onSelect={onProvinceSelect}
          placeholder="Select Province"
          searchPlaceholder="Search Province"
          loading={provinceLoading}
          error={provinceError}
          validationError={errors.province_code}
          required
        />

        <SearchableDropdown
          label="City / Municipality"
          value={values.city_municipality_code}
          selectedLabel={values.city_municipality_name}
          options={cities}
          onSelect={onCitySelect}
          placeholder="Select City / Municipality"
          searchPlaceholder="Search City / Municipality"
          disabled={!values.province_code}
          loading={citiesLoading}
          error={citiesError}
          validationError={errors.city_municipality_code}
          required
        />

        <SearchableDropdown
          label="Barangay"
          value={values.barangay_code}
          selectedLabel={values.barangay_name}
          options={barangays}
          onSelect={onBarangaySelect}
          placeholder="Select Barangay"
          searchPlaceholder="Search Barangay"
          disabled={!values.city_municipality_code}
          loading={barangaysLoading}
          error={barangaysError}
          validationError={errors.barangay_code}
          required
        />

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Purok <span className="text-rose-500">*</span></label>
          <input
            className={`h-14 w-full rounded-2xl border border-slate-200 px-4 py-3 transition ${disabledInputClass}`}
            value={values.purok}
            disabled={!barangaySelected}
            onChange={(event) => setValues((prev) => ({ ...prev, purok: event.target.value }))}
            placeholder="Enter Purok"
          />
          {errors.purok ? <p className="mt-2 text-xs text-rose-600">{errors.purok}</p> : null}
        </div>

      </div>
    </div>
  );
}

export default function BeneficiariesPage() {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, puroks: 0, recent: 0 });
  const [query, setQuery] = useState('');
  const purok = 'All Purok';
  const [form, setForm] = useState(blankBeneficiaryForm);
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState(null);
  const [editForm, setEditForm] = useState(blankEditBeneficiaryForm);
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [provinceError, setProvinceError] = useState('');
  const [addressOptions, setAddressOptions] = useState(blankAddressOptions);
  const [editAddressOptions, setEditAddressOptions] = useState(blankAddressOptions);

  const notify = (type, message) => {
    window.dispatchEvent(new CustomEvent('app:notify', { detail: { type, message } }));
  };

  const loadData = () => {
    return axios
      .get('/app-data/beneficiaries', { params: { purok, status: 'All Status', query } })
      .then((response) => {
        const data = response.data.data || [];
        setAllRows(data);
        setStats(response.data.stats || { total: 0, active: 0, puroks: 0, recent: 0 });
      });
  };

  const handleRefreshList = () => {
    loadData()
      .then(() => notify('success', 'Beneficiaries list refreshed.'))
      .catch(() => notify('error', 'Unable to refresh beneficiaries list.'));
  };

  const loadProvinces = () => {
    setIsLoadingProvinces(true);
    setProvinceError('');

    return fetchPsgcList('/provinces')
      .then((items) => setProvinces(items))
      .catch(() => {
        setProvinceError('Unable to load provinces. Please check your connection and try again.');
      })
      .finally(() => setIsLoadingProvinces(false));
  };

  const loadCitiesByProvince = (provinceCode, target = 'create') => {
    const setOptions = target === 'edit' ? setEditAddressOptions : setAddressOptions;

    setOptions((prev) => ({
      ...prev,
      cities: [],
      barangays: [],
      isLoadingCities: true,
      isLoadingBarangays: false,
      citiesError: '',
      barangaysError: '',
    }));

    return fetchPsgcList(`/provinces/${provinceCode}/cities-municipalities`)
      .then((items) => {
        setOptions((prev) => ({ ...prev, cities: items, isLoadingCities: false }));
      })
      .catch(() => {
        setOptions((prev) => ({
          ...prev,
          cities: [],
          isLoadingCities: false,
          citiesError: 'Unable to load cities and municipalities. Please try again.',
        }));
      });
  };

  const loadBarangaysByCity = (cityOrMunicipalityCode, target = 'create') => {
    const setOptions = target === 'edit' ? setEditAddressOptions : setAddressOptions;

    setOptions((prev) => ({
      ...prev,
      barangays: [],
      isLoadingBarangays: true,
      barangaysError: '',
    }));

    return fetchPsgcList(`/cities-municipalities/${cityOrMunicipalityCode}/barangays`)
      .then((items) => {
        setOptions((prev) => ({ ...prev, barangays: items, isLoadingBarangays: false }));
      })
      .catch(() => {
        setOptions((prev) => ({
          ...prev,
          barangays: [],
          isLoadingBarangays: false,
          barangaysError: 'Unable to load barangays. Please try again.',
        }));
      });
  };

  const clearValidationFields = (setter, fields) => {
    setter((prev) => {
      const next = { ...prev };
      fields.forEach((field) => delete next[field]);
      return next;
    });
  };

  const handleProvinceSelect = (province, target = 'create') => {
    const setValues = target === 'edit' ? setEditForm : setForm;
    const setOptions = target === 'edit' ? setEditAddressOptions : setAddressOptions;
    const setValidationErrors = target === 'edit' ? setEditErrors : setErrors;

    setValues((prev) => ({
      ...prev,
      province_code: province.code,
      province_name: province.name,
      city_municipality_code: '',
      city_municipality_name: '',
      barangay_code: '',
      barangay_name: '',
      purok: '',
      address: '',
    }));
    setOptions({ ...blankAddressOptions, isLoadingCities: true });
    clearValidationFields(setValidationErrors, ['province_code', 'city_municipality_code', 'barangay_code', 'purok', 'address']);
    loadCitiesByProvince(province.code, target);
  };

  const handleCitySelect = (cityOrMunicipality, target = 'create') => {
    const setValues = target === 'edit' ? setEditForm : setForm;
    const setOptions = target === 'edit' ? setEditAddressOptions : setAddressOptions;
    const setValidationErrors = target === 'edit' ? setEditErrors : setErrors;

    setValues((prev) => ({
      ...prev,
      city_municipality_code: cityOrMunicipality.code,
      city_municipality_name: cityOrMunicipality.name,
      barangay_code: '',
      barangay_name: '',
      purok: '',
      address: '',
    }));
    setOptions((prev) => ({ ...prev, barangays: [], isLoadingBarangays: true, barangaysError: '' }));
    clearValidationFields(setValidationErrors, ['city_municipality_code', 'barangay_code', 'purok', 'address']);
    loadBarangaysByCity(cityOrMunicipality.code, target);
  };

  const handleBarangaySelect = (barangay, target = 'create') => {
    const setValues = target === 'edit' ? setEditForm : setForm;
    const setValidationErrors = target === 'edit' ? setEditErrors : setErrors;

    setValues((prev) => ({
      ...prev,
      barangay_code: barangay.code,
      barangay_name: barangay.name,
      purok: '',
      address: '',
    }));
    clearValidationFields(setValidationErrors, ['barangay_code', 'purok', 'address']);
  };

  useEffect(() => {
    loadProvinces();
  }, []);

  useEffect(() => {
    loadData().catch(() => {});
  }, [purok, query]);

  useEffect(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = allRows.filter((row) => {
      const searchable = [
        row.name,
        row.first_name,
        row.middle_name,
        row.last_name,
        row.code,
        row.guardian,
        row.purok,
      ].filter(Boolean).join(' ').toLowerCase();
      return keyword.length === 0 || searchable.includes(keyword);
    });
    setRows(filtered);
  }, [allRows, query]);

  useEffect(() => {
    if (!editingBeneficiaryId) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingBeneficiaryId]);

  const cards = useMemo(() => {
    const total = Number(stats.total ?? 0);
    const active = Number(stats.active ?? 0);
    const puroksCovered = Number(stats.puroks ?? 0);
    const recent = Number(stats.recent ?? 0);
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const coverageRate = Math.min(100, Math.round((puroksCovered / Math.max(1, purokOptions.length)) * 100));
    const recentRate = total > 0 ? Math.min(100, Math.round((recent / total) * 100)) : 0;

    return [
      { title: 'Registered Beneficiaries', value: total, note: 'Complete beneficiary records on file', icon: 'beneficiaries', iconBg: 'bg-green-50', iconText: 'text-green-700', progress: total > 0 ? 100 : 0 },
      { title: 'Active Beneficiaries', value: active, note: `${activeRate}% of records are active`, icon: 'attendance', iconBg: 'bg-lime-50', iconText: 'text-lime-700', progress: activeRate },
      { title: 'Covered Puroks', value: puroksCovered, note: `${coverageRate}% of listed puroks covered`, icon: 'dashboard', iconBg: 'bg-emerald-50', iconText: 'text-emerald-700', progress: coverageRate },
      { title: 'Recent Entries', value: recent, note: `${recentRate}% added this week`, icon: 'calendar', iconBg: 'bg-amber-50', iconText: 'text-amber-700', progress: recentRate },
    ];
  }, [stats]);

  const validateBeneficiaryValues = (values) => {
    const nextErrors = {};

    if (!values.first_name.trim()) {
      nextErrors.first_name = 'First name is required.';
    }
    if (!values.last_name.trim()) {
      nextErrors.last_name = 'Last name is required.';
    }
    if (!values.age.trim() || Number.isNaN(Number(values.age))) {
      nextErrors.age = 'Age is required and must be a number.';
    }
    if (!values.sex) {
      nextErrors.sex = 'Sex is required.';
    }
    if (!values.birth_date) {
      nextErrors.birth_date = 'Date of birth is required.';
    }
    if (!values.height_cm || Number.isNaN(Number(values.height_cm))) {
      nextErrors.height_cm = 'Height is required and must be entered in centimeters.';
    }
    if (!values.weight_kg || Number.isNaN(Number(values.weight_kg))) {
      nextErrors.weight_kg = 'Weight is required and must be entered in kilograms.';
    }
    if (!values.student_contact) {
      nextErrors.student_contact = 'Student contact number is required.';
    } else if (!isValidPhilippinesNumber(values.student_contact)) {
      nextErrors.student_contact = 'Enter a valid Philippine number (09XXXXXXXXX).';
    }
    if (!values.guardian_name.trim()) {
      nextErrors.guardian_name = 'Guardian name is required.';
    }
    if (!values.guardian_relationship) {
      nextErrors.guardian_relationship = 'Relationship to guardian is required.';
    }
    if (!values.parent_guardian_contact) {
      nextErrors.parent_guardian_contact = 'Parent/Guardian contact number is required.';
    } else if (!isValidPhilippinesNumber(values.parent_guardian_contact)) {
      nextErrors.parent_guardian_contact = 'Enter a valid Philippine number (09XXXXXXXXX).';
    }
    if (!values.emergency_contact) {
      nextErrors.emergency_contact = 'Emergency contact number is required.';
    } else if (!isValidPhilippinesNumber(values.emergency_contact)) {
      nextErrors.emergency_contact = 'Enter a valid Philippine number (09XXXXXXXXX).';
    }
    if (!values.province_code) {
      nextErrors.province_code = 'Province is required.';
    }
    if (!values.city_municipality_code) {
      nextErrors.city_municipality_code = 'City / Municipality is required.';
    }
    if (!values.barangay_code) {
      nextErrors.barangay_code = 'Barangay is required.';
    }
    if (!values.purok.trim()) {
      nextErrors.purok = 'Purok is required.';
    }
    if (!values.school_name.trim()) {
      nextErrors.school_name = 'Name of school is required.';
    }
    if (!values.school_level) {
      nextErrors.school_level = 'School level is required.';
    }
    if (!values.grade_level) {
      nextErrors.grade_level = 'Grade level is required.';
    }
    if (!values.school_year.trim()) {
      nextErrors.school_year = 'School year is required.';
    }

    return nextErrors;
  };

  const validateForm = () => {
    const nextErrors = validateBeneficiaryValues(form);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEditForm = () => {
    const nextErrors = validateBeneficiaryValues(editForm);
    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      notify('error', 'Only JPG and PNG images are accepted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotoPreview(reader.result || '');
      setForm((prev) => ({ ...prev, profile_photo: file, profile_photo_url: reader.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      notify('error', 'Only JPG and PNG images are accepted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditForm((prev) => ({ ...prev, profile_photo: file, profile_photo_url: reader.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const clearForm = () => {
    setForm(blankBeneficiaryForm);
    setErrors({});
    setProfilePhotoPreview('');
    setAddressOptions(blankAddressOptions);
  };

  const addBeneficiary = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const payload = {
      first_name: form.first_name,
      middle_name: form.middle_name,
      last_name: form.last_name,
      age: form.age,
      sex: form.sex,
      birth_date: form.birth_date,
      height_cm: form.height_cm === '' ? null : Number(form.height_cm),
      weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
      student_contact: form.student_contact,
      father_name: form.father_name,
      mother_name: form.mother_name,
      guardian_name: form.guardian_name,
      guardian_relationship: form.guardian_relationship,
      parent_guardian_contact: form.parent_guardian_contact,
      emergency_contact: form.emergency_contact,
      address: buildCompleteAddress(form),
      province_code: form.province_code,
      province_name: form.province_name,
      city_municipality_code: form.city_municipality_code,
      city_municipality_name: form.city_municipality_name,
      barangay_code: form.barangay_code,
      barangay_name: form.barangay_name,
      purok: form.purok.trim(),
      street_address: '',
      school_name: form.school_name,
      school_level: form.school_level,
      grade_level: form.grade_level,
      school_year: form.school_year,
    };

    let requestPayload = payload;
    if (form.profile_photo) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value ?? '');
      });
      formData.append('profile_photo', form.profile_photo);
      requestPayload = formData;
    }

    setIsSubmitting(true);

    axios
      .post('/app-data/beneficiaries', requestPayload)
      .then(() => {
        setForm(blankBeneficiaryForm);
        setAddressOptions(blankAddressOptions);
        setProfilePhotoPreview('');
        setErrors({});
        return loadData();
      })
      .then(() => notify('success', 'Student information submitted successfully.'))
      .catch((error) => {
        notify('error', error?.response?.data?.message || 'Unable to submit student information.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const deleteBeneficiaryById = (beneficiaryId, beneficiaryName = 'this beneficiary') => {
    const confirmed = window.confirm(`Delete beneficiary ${beneficiaryName}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    axios
      .delete(`/app-data/beneficiaries/${beneficiaryId}`)
      .then(() => loadData())
      .then(() => notify('success', 'Beneficiary deleted successfully.'))
      .catch((error) => {
        notify('error', error?.response?.data?.message || 'Unable to delete beneficiary.');
      });
  };

  const openEdit = (row) => {
    setEditingBeneficiaryId(row.id);
    setEditForm({
      ...blankEditBeneficiaryForm,
      beneficiary_code: row.code || '',
      first_name: row.first_name || '',
      middle_name: row.middle_name || '',
      last_name: row.last_name || '',
      age: String(formatAgeSex(row)).split('/')[0]?.trim() || '',
      sex: row.sex || 'Male',
      birth_date: row.birth_date || '',
      height_cm: row.height_cm ?? '',
      weight_kg: row.weight_kg ?? '',
      student_contact: row.contact_number || '',
      father_name: row.father_name || '',
      mother_name: row.mother_name || '',
      guardian_name: row.guardian_name || '',
      guardian_relationship: row.relationship_to_guardian || '',
      guardian_contact: row.guardian_contact || row.parent_guardian_contact_number || '',
      parent_guardian_contact: row.parent_guardian_contact_number || row.guardian_contact || '',
      emergency_contact: row.emergency_contact_number || '',
      address: row.address || '',
      province_code: row.province_code || '',
      province_name: row.province_name || '',
      city_municipality_code: row.city_municipality_code || '',
      city_municipality_name: row.city_municipality_name || '',
      barangay_code: row.barangay_code || '',
      barangay_name: row.barangay_name || '',
      purok: row.purok || '',
      street_address: row.street_address || '',
      purok_id: '',
      school_name: row.school_name || '',
      school_level: row.school_level || '',
      grade_level: row.grade_level || '',
      school_year: row.school_year || '',
      profile_photo_url: row.profile_photo_url || '',
      status: row.status || 'Active',
    });
    setEditErrors({});
    setEditAddressOptions(blankAddressOptions);

    if (row.province_code) {
      loadCitiesByProvince(row.province_code, 'edit');
    }
    if (row.city_municipality_code) {
      loadBarangaysByCity(row.city_municipality_code, 'edit');
    }
  };

  const saveEditedBeneficiary = (e) => {
    e.preventDefault();
    if (!editingBeneficiaryId) {
      return;
    }
    if (!validateEditForm()) {
      return;
    }

    const payload = {
      ...editForm,
      height_cm: editForm.height_cm === '' ? null : Number(editForm.height_cm),
      weight_kg: editForm.weight_kg === '' ? null : Number(editForm.weight_kg),
      address: buildCompleteAddress(editForm),
      purok: editForm.purok.trim(),
      street_address: '',
      contact_number: editForm.student_contact || editForm.contact_number || '',
      relationship_to_guardian: editForm.guardian_relationship || '',
      parent_guardian_contact_number: editForm.parent_guardian_contact || '',
      emergency_contact_number: editForm.emergency_contact || '',
    };

    let request = axios.patch(`/app-data/beneficiaries/${editingBeneficiaryId}`, payload);
    if (editForm.profile_photo) {
      const formData = new FormData();
      formData.append('_method', 'PATCH');
      Object.entries(payload).forEach(([key, value]) => {
        if (key !== 'profile_photo' && key !== 'profile_photo_url') {
          formData.append(key, value ?? '');
        }
      });
      formData.append('profile_photo', editForm.profile_photo);
      request = axios.post(`/app-data/beneficiaries/${editingBeneficiaryId}`, formData);
    }

    request
      .then(() => {
        setEditingBeneficiaryId(null);
        setEditForm(blankEditBeneficiaryForm);
        setEditErrors({});
        setEditAddressOptions(blankAddressOptions);
        return loadData();
      })
      .then(() => notify('success', 'Beneficiary updated successfully.'))
      .catch((error) => {
        notify('error', error?.response?.data?.message || 'Unable to update beneficiary.');
      });
  };

  return (
    <AdminLayout activePage="beneficiaries" title="Beneficiaries">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-green-800 via-emerald-800 to-teal-800 text-white p-8 lg:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">Beneficiary Management</p>
            <h2 className="mt-3 text-3xl lg:text-5xl font-black tracking-tight">Beneficiary Records</h2>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">
                {stats.total} total records
              </span>
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">
                {stats.active} active
              </span>
            </div>
          </div>

          <div className="w-full max-w-md rounded-lg border border-white/20 bg-white/12 p-4 shadow-lg backdrop-blur-md xl:w-[360px]">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/12 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lime-100">Covered Puroks</p>
                <p className="mt-2 text-2xl font-black">{stats.puroks}</p>
              </div>
              <div className="rounded-lg bg-white/12 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lime-100">New This Week</p>
                <p className="mt-2 text-2xl font-black">{stats.recent}</p>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.16em]">{card.title}</p>
                <h3 className="mt-3 text-3xl font-black text-slate-900">{card.value}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.iconBg} ${card.iconText}`}>
                <AppIcon name={card.icon} className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-700"
                  style={{ width: `${Math.max(5, Math.min(100, card.progress || 0))}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-500">{card.note}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] bg-white border border-slate-200 p-6 shadow-sm">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Registration</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">Student Information</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">Student, guardian, address, and school details.</p>
          </div>
        </div>

        <form id="student-info-form" onSubmit={addBeneficiary} className="space-y-8">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="flex-none">
                <div className="relative h-40 w-40 rounded-[28px] border border-dashed border-slate-300 bg-white p-3">
                  {profilePhotoPreview || form.profile_photo_url ? (
                    <img src={profilePhotoPreview || form.profile_photo_url} alt="Profile preview" className="h-full w-full rounded-[22px] object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
                      <AppIcon name="userProfile" className="w-8 h-8" />
                      <p className="mt-3 text-center text-sm font-semibold">Upload photo</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handlePhotoChange}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-500">Optional JPG, JPEG, PNG. Preview shown after upload.</p>
              </div>

              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-bold text-slate-900">Profile Photo</h3>
                <p className="text-sm text-slate-500">Optional JPG or PNG image for the beneficiary record.</p>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer">
                    <AppIcon name="camera" className="w-4 h-4" />
                    Change Photo
                    <input type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handlePhotoChange} />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePhotoPreview('');
                      setForm((prev) => ({ ...prev, profile_photo: null, profile_photo_url: '' }));
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-900">Student Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">First Name <span className="text-rose-500">*</span></label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.first_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Enter first name"
                />
                {errors.first_name ? <p className="mt-2 text-xs text-rose-600">{errors.first_name}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name <span className="text-rose-500">*</span></label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.last_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Enter last name"
                />
                {errors.last_name ? <p className="mt-2 text-xs text-rose-600">{errors.last_name}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Middle Name</label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.middle_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, middle_name: e.target.value }))}
                  placeholder="Enter middle name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
                <input
                  type="number"
                  min="1"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.age}
                  onChange={(e) => setForm((prev) => applyAgeChange(prev, e.target.value))}
                  placeholder="e.g. 12"
                />
                {errors.age ? <p className="mt-2 text-xs text-rose-600">{errors.age}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Sex</label>
                <select
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.sex}
                  onChange={(e) => setForm((prev) => ({ ...prev, sex: e.target.value }))}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
                {errors.sex ? <p className="mt-2 text-xs text-rose-600">{errors.sex}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.birth_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))}
                />
                {errors.birth_date ? <p className="mt-2 text-xs text-rose-600">{errors.birth_date}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Height</label>
                <input
                  type="number"
                  min="10"
                  max="250"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.height_cm}
                  onChange={(e) => setForm((prev) => ({ ...prev, height_cm: e.target.value }))}
                  placeholder="155 cm"
                />
                <p className="mt-2 text-xs text-slate-400">Example: 155 cm</p>
                {errors.height_cm ? <p className="mt-2 text-xs text-rose-600">{errors.height_cm}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Weight</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.weight_kg}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight_kg: e.target.value }))}
                  placeholder="60 kg"
                />
                <p className="mt-2 text-xs text-slate-400">Example: 60 kg</p>
                {errors.weight_kg ? <p className="mt-2 text-xs text-rose-600">{errors.weight_kg}</p> : null}
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Student Contact Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="09123456789"
                  value={form.student_contact}
                  onChange={(e) => setForm((prev) => ({ ...prev, student_contact: formatContactInput(e.target.value) }))}
                />
                {errors.student_contact ? <p className="mt-2 text-xs text-rose-600">{errors.student_contact}</p> : null}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 p-6">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">Parent / Guardian Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Father's Name</label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.father_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, father_name: e.target.value }))}
                  placeholder="Juan Dela Cruz"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mother's Name</label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.mother_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, mother_name: e.target.value }))}
                  placeholder="Maria Dela Cruz"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Guardian's Name</label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.guardian_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, guardian_name: e.target.value }))}
                  placeholder="Guardian name"
                />
                {errors.guardian_name ? <p className="mt-2 text-xs text-rose-600">{errors.guardian_name}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Relationship to Guardian</label>
                <select
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.guardian_relationship}
                  onChange={(e) => setForm((prev) => ({ ...prev, guardian_relationship: e.target.value }))}
                >
                  <option value="">Select relationship</option>
                  {guardianRelationshipOptions.map((relationship) => (
                    <option key={relationship} value={relationship}>{relationship}</option>
                  ))}
                </select>
                {errors.guardian_relationship ? <p className="mt-2 text-xs text-rose-600">{errors.guardian_relationship}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Parent / Guardian Contact Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="09123456789"
                  value={form.parent_guardian_contact}
                  onChange={(e) => setForm((prev) => ({ ...prev, parent_guardian_contact: formatContactInput(e.target.value) }))}
                />
                {errors.parent_guardian_contact ? <p className="mt-2 text-xs text-rose-600">{errors.parent_guardian_contact}</p> : null}
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="09123456789"
                  value={form.emergency_contact}
                  onChange={(e) => setForm((prev) => ({ ...prev, emergency_contact: formatContactInput(e.target.value) }))}
                />
                {errors.emergency_contact ? <p className="mt-2 text-xs text-rose-600">{errors.emergency_contact}</p> : null}
              </div>
            </div>
          </div>

          <AddressInformationSection
            values={form}
            setValues={setForm}
            errors={errors}
            provinces={provinces}
            provinceLoading={isLoadingProvinces}
            provinceError={provinceError}
            cities={addressOptions.cities}
            citiesLoading={addressOptions.isLoadingCities}
            citiesError={addressOptions.citiesError}
            barangays={addressOptions.barangays}
            barangaysLoading={addressOptions.isLoadingBarangays}
            barangaysError={addressOptions.barangaysError}
            onProvinceSelect={(selectedProvince) => handleProvinceSelect(selectedProvince)}
            onCitySelect={(selectedCity) => handleCitySelect(selectedCity)}
            onBarangaySelect={(selectedBarangay) => handleBarangaySelect(selectedBarangay)}
          />

          <div className="rounded-[24px] border border-slate-200 p-6">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">School Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Name of School</label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.school_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, school_name: e.target.value }))}
                  placeholder="School name"
                />
                {errors.school_name ? <p className="mt-2 text-xs text-rose-600">{errors.school_name}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">School Level</label>
                <select
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.school_level}
                  onChange={(e) => setForm((prev) => ({ ...prev, school_level: e.target.value, grade_level: '' }))}
                >
                  <option value="">Select level</option>
                  {schoolLevelOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.school_level ? <p className="mt-2 text-xs text-rose-600">{errors.school_level}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Grade Level</label>
                <select
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.grade_level}
                  onChange={(e) => setForm((prev) => ({ ...prev, grade_level: e.target.value }))}
                  disabled={!form.school_level}
                >
                  <option value="">Select grade</option>
                  {(gradeLevelOptions[form.school_level] || []).map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                {errors.grade_level ? <p className="mt-2 text-xs text-rose-600">{errors.grade_level}</p> : null}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">School Year</label>
                <input
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  value={form.school_year}
                  onChange={(e) => setForm((prev) => ({ ...prev, school_year: e.target.value }))}
                  placeholder="2025-2026"
                />
                {errors.school_year ? <p className="mt-2 text-xs text-rose-600">{errors.school_year}</p> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <button type="button" onClick={clearForm} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <AppIcon name="x" className="w-4 h-4" />
              Clear
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-60">
              <AppIcon name="plus" className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Beneficiary Directory</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Master List</h3>
          </div>
          <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {rows.length} shown
          </span>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Search by Beneficiary Name</label>
          <div className="relative max-w-2xl">
            <AppIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search names in real time"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                {['Beneficiary', 'Code', 'Age / Sex', 'Height (cm)', 'Weight (kg)', 'Guardian', 'Purok', 'Status', 'Actions'].map((head) => <th key={head} className="px-6 py-4 font-semibold">{head}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm font-medium text-slate-500">No beneficiaries found.</td>
                </tr>
              )}
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 overflow-hidden rounded-2xl flex items-center justify-center font-bold bg-green-100 text-green-700">
                        {b.profile_photo_url ? (
                          <img src={b.profile_photo_url} alt={`${b.name} profile`} className="h-full w-full object-cover" />
                        ) : (
                          b.initials
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{b.name}</p>
                        <p className="text-slate-500 text-xs">{b.contact_number || b.guardian_contact || 'No contact recorded'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{b.code}</td>
                  <td className="px-6 py-4 text-slate-700">{formatAgeSex(b)}</td>
                  <td className="px-6 py-4 text-slate-700">{b.height_cm ?? '--'}</td>
                  <td className="px-6 py-4 text-slate-700">{b.weight_kg ?? '--'}</td>
                  <td className="px-6 py-4 text-slate-700">{b.guardian}</td>
                  <td className="px-6 py-4 text-slate-700">{b.purok}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass[b.status] || 'bg-slate-100 text-slate-700'}`}>{b.status}</span></td>
                  <td className="px-6 py-4">
                    <button onClick={() => openEdit(b)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition border border-slate-200 inline-flex items-center gap-1">
                      <AppIcon name="edit" className="w-4 h-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingBeneficiaryId && typeof document !== 'undefined' && createPortal((
        <section className="fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-[2px] overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
            <form onSubmit={saveEditedBeneficiary} className="w-full max-w-6xl rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Master List Update</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">Student Information</h3>
                  <p className="mt-1 text-sm text-slate-500">Edit this beneficiary using the same form layout as registration.</p>
                </div>
                <button type="button" onClick={() => setEditingBeneficiaryId(null)} className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">
                  <AppIcon name="x" className="w-4 h-4" />
                  Close
                </button>
              </div>

              <div className="px-6 py-6 max-h-[72vh] overflow-y-auto">
                <div className="space-y-8">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                      <div className="flex-none">
                        <div className="relative h-40 w-40 rounded-[28px] border border-dashed border-slate-300 bg-white p-3">
                          {editForm.profile_photo_url ? (
                            <img src={editForm.profile_photo_url} alt="Profile preview" className="h-full w-full rounded-[22px] object-cover" />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
                              <AppIcon name="userProfile" className="w-8 h-8" />
                              <p className="mt-3 text-center text-sm font-semibold">
                                {`${editForm.first_name || ''} ${editForm.last_name || ''}`.trim()
                                  .split(' ')
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part) => part.charAt(0).toUpperCase())
                                  .join('') || 'Photo'}
                              </p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleEditPhotoChange}
                          />
                        </div>
                        <p className="mt-3 text-sm text-slate-500">Optional JPG, JPEG, PNG. Preview shown after upload.</p>
                      </div>

                      <div className="flex-1 space-y-3">
                        <h3 className="text-lg font-bold text-slate-900">Profile Photo</h3>
                        <p className="text-sm text-slate-500">Update the beneficiary photo from the master list record.</p>
                        <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer">
                          <AppIcon name="camera" className="w-4 h-4" />
                          Change Photo
                          <input type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handleEditPhotoChange} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h3 className="text-lg font-bold text-slate-900">Student Personal Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">First Name <span className="text-rose-500">*</span></label>
                        <input
                          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                          value={editForm.first_name || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))}
                          placeholder="Enter first name"
                        />
                        {editErrors.first_name ? <p className="mt-2 text-xs text-rose-600">{editErrors.first_name}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name <span className="text-rose-500">*</span></label>
                        <input
                          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                          value={editForm.last_name || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Enter last name"
                        />
                        {editErrors.last_name ? <p className="mt-2 text-xs text-rose-600">{editErrors.last_name}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Middle Name</label>
                        <input
                          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                          value={editForm.middle_name || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, middle_name: e.target.value }))}
                          placeholder="Enter middle name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
                        <input type="number" min="1" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.age || ''} onChange={(e) => setEditForm((prev) => applyAgeChange(prev, e.target.value))} placeholder="e.g. 12" />
                        {editErrors.age ? <p className="mt-2 text-xs text-rose-600">{editErrors.age}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Sex</label>
                        <select className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.sex} onChange={(e) => setEditForm((prev) => ({ ...prev, sex: e.target.value }))}>
                          <option>Male</option>
                          <option>Female</option>
                        </select>
                        {editErrors.sex ? <p className="mt-2 text-xs text-rose-600">{editErrors.sex}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                        <input type="date" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.birth_date} onChange={(e) => setEditForm((prev) => ({ ...prev, birth_date: e.target.value }))} />
                        {editErrors.birth_date ? <p className="mt-2 text-xs text-rose-600">{editErrors.birth_date}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                        <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))} className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <option>Active</option>
                          <option>Inactive</option>
                          <option>Completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Height</label>
                        <input type="number" min="10" max="250" step="0.1" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.height_cm} onChange={(e) => setEditForm((prev) => ({ ...prev, height_cm: e.target.value }))} placeholder="155 cm" />
                        <p className="mt-2 text-xs text-slate-400">Example: 155 cm</p>
                        {editErrors.height_cm ? <p className="mt-2 text-xs text-rose-600">{editErrors.height_cm}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Weight</label>
                        <input type="number" min="1" max="300" step="0.1" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.weight_kg} onChange={(e) => setEditForm((prev) => ({ ...prev, weight_kg: e.target.value }))} placeholder="60 kg" />
                        <p className="mt-2 text-xs text-slate-400">Example: 60 kg</p>
                        {editErrors.weight_kg ? <p className="mt-2 text-xs text-rose-600">{editErrors.weight_kg}</p> : null}
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Student Contact Number</label>
                        <input type="text" inputMode="numeric" maxLength={11} pattern="^09\d{9}$" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.student_contact || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, student_contact: formatContactInput(e.target.value) }))} placeholder="09123456789" />
                        {editErrors.student_contact ? <p className="mt-2 text-xs text-rose-600">{editErrors.student_contact}</p> : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 p-6">
                    <div className="mb-5">
                      <h3 className="text-lg font-bold text-slate-900">Parent / Guardian Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Father's Name</label>
                        <input className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.father_name || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, father_name: e.target.value }))} placeholder="Juan Dela Cruz" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mother's Name</label>
                        <input className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.mother_name || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, mother_name: e.target.value }))} placeholder="Maria Dela Cruz" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Guardian's Name</label>
                        <input className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.guardian_name} onChange={(e) => setEditForm((prev) => ({ ...prev, guardian_name: e.target.value }))} placeholder="Guardian name" />
                        {editErrors.guardian_name ? <p className="mt-2 text-xs text-rose-600">{editErrors.guardian_name}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Relationship to Guardian</label>
                        <select className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.guardian_relationship || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, guardian_relationship: e.target.value }))}>
                          <option value="">Select relationship</option>
                          {guardianRelationshipOptions.map((relationship) => (
                            <option key={relationship} value={relationship}>{relationship}</option>
                          ))}
                        </select>
                        {editErrors.guardian_relationship ? <p className="mt-2 text-xs text-rose-600">{editErrors.guardian_relationship}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Parent / Guardian Contact Number</label>
                        <input type="text" inputMode="numeric" maxLength={11} pattern="^09\d{9}$" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.parent_guardian_contact || editForm.guardian_contact || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, parent_guardian_contact: formatContactInput(e.target.value), guardian_contact: formatContactInput(e.target.value) }))} placeholder="09123456789" />
                        {editErrors.parent_guardian_contact ? <p className="mt-2 text-xs text-rose-600">{editErrors.parent_guardian_contact}</p> : null}
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Number</label>
                        <input type="text" inputMode="numeric" maxLength={11} pattern="^09\d{9}$" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.emergency_contact || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, emergency_contact: formatContactInput(e.target.value) }))} placeholder="09123456789" />
                        {editErrors.emergency_contact ? <p className="mt-2 text-xs text-rose-600">{editErrors.emergency_contact}</p> : null}
                      </div>
                    </div>
                  </div>

                  <AddressInformationSection
                    values={editForm}
                    setValues={setEditForm}
                    errors={editErrors}
                    provinces={provinces}
                    provinceLoading={isLoadingProvinces}
                    provinceError={provinceError}
                    cities={editAddressOptions.cities}
                    citiesLoading={editAddressOptions.isLoadingCities}
                    citiesError={editAddressOptions.citiesError}
                    barangays={editAddressOptions.barangays}
                    barangaysLoading={editAddressOptions.isLoadingBarangays}
                    barangaysError={editAddressOptions.barangaysError}
                    onProvinceSelect={(selectedProvince) => handleProvinceSelect(selectedProvince, 'edit')}
                    onCitySelect={(selectedCity) => handleCitySelect(selectedCity, 'edit')}
                    onBarangaySelect={(selectedBarangay) => handleBarangaySelect(selectedBarangay, 'edit')}
                  />

                  <div className="rounded-[24px] border border-slate-200 p-6">
                    <div className="mb-5">
                      <h3 className="text-lg font-bold text-slate-900">School Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Name of School</label>
                        <input className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.school_name || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, school_name: e.target.value }))} placeholder="School name" />
                        {editErrors.school_name ? <p className="mt-2 text-xs text-rose-600">{editErrors.school_name}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">School Level</label>
                        <select className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.school_level || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, school_level: e.target.value, grade_level: '' }))}>
                          <option value="">Select level</option>
                          {schoolLevelOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {editErrors.school_level ? <p className="mt-2 text-xs text-rose-600">{editErrors.school_level}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Grade Level</label>
                        <select className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.grade_level || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, grade_level: e.target.value }))} disabled={!editForm.school_level}>
                          <option value="">Select grade</option>
                          {(gradeLevelOptions[editForm.school_level] || []).map((grade) => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                        {editErrors.grade_level ? <p className="mt-2 text-xs text-rose-600">{editErrors.grade_level}</p> : null}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">School Year</label>
                        <input className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" value={editForm.school_year || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, school_year: e.target.value }))} placeholder="2025-2026" />
                        {editErrors.school_year ? <p className="mt-2 text-xs text-rose-600">{editErrors.school_year}</p> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex flex-col gap-3 bg-white sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (!editingBeneficiaryId) {
                      return;
                    }
                    deleteBeneficiaryById(editingBeneficiaryId, `${editForm.first_name} ${editForm.last_name}`.trim());
                    setEditingBeneficiaryId(null);
                    setEditForm(blankEditBeneficiaryForm);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <AppIcon name="delete" className="w-4 h-4" />
                  Delete
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setEditingBeneficiaryId(null)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800">
                    <AppIcon name="plus" className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      ), document.body)}
    </AdminLayout>
  );
}
