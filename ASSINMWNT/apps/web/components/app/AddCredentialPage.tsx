'use client';

import { useState, useRef, FormEvent, FocusEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { formatBytes } from '@omnimise/shared';
import styles from './AddCredentialPage.module.css';

const CREDENTIAL_TYPES = [
  { value: 'education', label: 'Education',      icon: '🎓', desc: 'Degrees, marksheets, diplomas' },
  { value: 'work',      label: 'Work',            icon: '💼', desc: 'Employment history, offer letters' },
  { value: 'skill',     label: 'Skill',           icon: '⚡', desc: 'Certifications, courses, NPTEL' },
  { value: 'kyc',       label: 'KYC Document',    icon: '🛡️', desc: 'Aadhaar, PAN, passport' },
  { value: 'custom',    label: 'Custom',           icon: '✦', desc: 'Any other credential' },
];

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

interface FormState {
  type: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  file: File | null;
}

type ErrorMap = Partial<Record<keyof FormState, string>>;
type TouchedMap = Partial<Record<keyof FormState, boolean>>;

function validate(form: FormState): ErrorMap {
  const e: ErrorMap = {};
  if (!form.type)    e.type    = 'This field is required';
  if (!form.title)   e.title   = 'This field is required';
  if (!form.issuer)  e.issuer  = 'This field is required';
  if (form.issueDate && form.expiryDate && form.expiryDate <= form.issueDate)
    e.expiryDate = 'Expiry date must be after issue date';
  if (form.file) {
    if (!ALLOWED_TYPES.includes(form.file.type))
      e.file = 'Only PDF, JPG, PNG allowed';
    else if (form.file.size > MAX_SIZE)
      e.file = 'File must be under 10 MB';
  }
  return e;
}

export default function AddCredentialPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm]         = useState<FormState>({ type: '', title: '', issuer: '', issueDate: '', expiryDate: '', file: null });
  const [errors, setErrors]     = useState<ErrorMap>({});
  const [touched, setTouched]   = useState<TouchedMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const set = (field: keyof FormState, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    if (touched[field]) {
      setErrors(validate(newForm));
    }
  };

  const blur = (field: keyof FormState) => {
    const newTouched = { ...touched, [field]: true };
    setTouched(newTouched);
    setErrors(validate(form));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const newForm = { ...form, file };
    setForm(newForm);
    setTouched((prev) => ({ ...prev, file: true }));
    setErrors(validate(newForm));

    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Touch all fields
    const allTouched: TouchedMap = { type: true, title: true, issuer: true, issueDate: true, expiryDate: true, file: true };
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (form.file) {
        const fd = new FormData();
        fd.append('type', form.type);
        fd.append('title', form.title);
        fd.append('issuer', form.issuer);
        if (form.issueDate)  fd.append('issueDate', new Date(form.issueDate).toISOString());
        if (form.expiryDate) fd.append('expiryDate', new Date(form.expiryDate).toISOString());
        fd.append('file', form.file);
        await api.credentials.uploadWithFile(fd);
      } else {
        await api.credentials.create({
          type: form.type,
          title: form.title,
          issuer: form.issuer,
          issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : null,
          expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        });
      }
      router.push('/app/vault');
    } catch (err: unknown) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldState = (field: keyof FormState) => {
    if (!touched[field]) return '';
    return errors[field] ? 'invalid' : 'valid';
  };

  return (
    <div className="animate-in" style={{ maxWidth: 640 }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Add Credential</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            Upload a document or enter details manually.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="alert alert-error" style={{ marginBottom: 24 }} role="alert">
          <span>⚠️</span>
          <div>
            <strong>Failed to create credential</strong>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Credential Type */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label required">Credential Type</label>
          <div className={styles.typeGrid}>
            {CREDENTIAL_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`${styles.typeOption} ${form.type === t.value ? styles.typeOptionActive : ''}`}
                onClick={() => set('type', t.value)}
                onBlur={() => blur('type')}
              >
                <span className={styles.typeIcon}>{t.icon}</span>
                <span className={styles.typeLabel}>{t.label}</span>
                <span className={styles.typeDesc}>{t.desc}</span>
              </button>
            ))}
          </div>
          {touched.type && errors.type && (
            <div className="form-error" role="alert" id="type-error">{errors.type}</div>
          )}
        </div>

        {/* Title */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label required" htmlFor="title">Title</label>
          <div style={{ position: 'relative' }}>
            <input
              id="title"
              type="text"
              className={`form-input ${fieldState('title')}`}
              placeholder="e.g. B.Tech in Computer Science"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              onBlur={() => blur('title')}
              aria-label="Credential title"
              aria-describedby={errors.title ? 'title-error' : undefined}
              aria-invalid={!!errors.title}
              style={{ width: '100%' }}
            />
            {touched.title && !errors.title && (
              <span className="form-success-icon" aria-hidden>✓</span>
            )}
          </div>
          {touched.title && errors.title && (
            <div className="form-error" role="alert" id="title-error">⚠ {errors.title}</div>
          )}
        </div>

        {/* Issuer */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label required" htmlFor="issuer">Issuer / Institution</label>
          <div style={{ position: 'relative' }}>
            <input
              id="issuer"
              type="text"
              className={`form-input ${fieldState('issuer')}`}
              placeholder="e.g. IIT Delhi / CBSE / Coursera"
              value={form.issuer}
              onChange={(e) => set('issuer', e.target.value)}
              onBlur={() => blur('issuer')}
              aria-label="Issuing institution"
              aria-describedby={errors.issuer ? 'issuer-error' : undefined}
              aria-invalid={!!errors.issuer}
              style={{ width: '100%' }}
            />
            {touched.issuer && !errors.issuer && (
              <span className="form-success-icon" aria-hidden>✓</span>
            )}
          </div>
          {touched.issuer && errors.issuer && (
            <div className="form-error" role="alert" id="issuer-error">⚠ {errors.issuer}</div>
          )}
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="issueDate">Issue Date</label>
            <input
              id="issueDate"
              type="date"
              className={`form-input ${fieldState('issueDate')}`}
              value={form.issueDate}
              onChange={(e) => set('issueDate', e.target.value)}
              onBlur={() => blur('issueDate')}
              aria-label="Issue date"
              style={{ width: '100%' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="expiryDate">Expiry Date</label>
            <input
              id="expiryDate"
              type="date"
              className={`form-input ${fieldState('expiryDate')}`}
              value={form.expiryDate}
              onChange={(e) => set('expiryDate', e.target.value)}
              onBlur={() => blur('expiryDate')}
              min={form.issueDate}
              aria-label="Expiry date"
              aria-describedby={errors.expiryDate ? 'expiry-error' : undefined}
              style={{ width: '100%' }}
            />
            {touched.expiryDate && errors.expiryDate && (
              <div className="form-error" role="alert" id="expiry-error">⚠ {errors.expiryDate}</div>
            )}
          </div>
        </div>

        {/* File Upload */}
        <div className="form-group" style={{ marginBottom: 32 }}>
          <label className="form-label" htmlFor="file">Document Upload (optional)</label>
          <div
            className={`${styles.dropzone} ${errors.file && touched.file ? styles.dropzoneError : ''}`}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            aria-label="Upload credential document"
          >
            {form.file ? (
              <div className={styles.filePreview}>
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className={styles.imagePreview} />
                ) : (
                  <div className={styles.fileIcon}>📄</div>
                )}
                <div>
                  <p className={styles.fileName}>{form.file.name}</p>
                  <p className={styles.fileSize}>{formatBytes(form.file.size)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, file: null })); setFilePreview(null); }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className={styles.dropzonePrompt}>
                <span style={{ fontSize: 32 }}>📎</span>
                <p>Click to upload or drag & drop</p>
                <span>PDF, JPG, PNG — max 10 MB</span>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            id="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {touched.file && errors.file && (
            <div className="form-error" role="alert">⚠ {errors.file}</div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <><span className="spin" style={{ display: 'inline-block', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', width: 18, height: 18 }} /> Saving...</>
            ) : '✓ Add Credential'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
