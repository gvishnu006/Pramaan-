'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type Credential } from '../../lib/api';
import CredentialCard from './CredentialCard';
import SkeletonCard from './SkeletonCard';
import styles from './DashboardPage.module.css';

const CREDENTIAL_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  education: { icon: '🎓', color: '#4F46E5', label: 'Education' },
  work:       { icon: '💼', color: '#10b981', label: 'Work' },
  skill:      { icon: '⚡', color: '#f59e0b', label: 'Skills' },
  kyc:        { icon: '🛡️', color: '#3b82f6', label: 'KYC' },
  custom:     { icon: '✦',  color: '#7c3aed', label: 'Custom' },
};

const RECENT_ACTIVITY = [
  { icon: '🔍', text: 'Credential verified by Acme HR', time: '2 min ago', type: 'verify' },
  { icon: '📤', text: 'Share link created (expires in 24h)', time: '1 hr ago', type: 'share' },
  { icon: '✅', text: 'Education credential added', time: '2 days ago', type: 'add' },
];

export default function DashboardPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    api.credentials.list({ pageSize: 6 })
      .then((res) => setCredentials(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Count by type
  const counts = credentials.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});

  const totalVerified = credentials.filter((c) => c.verified).length;

  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            Your verified credential vault — at a glance.
          </p>
        </div>
        <Link href="/app/share/new" className="btn btn-primary">
          ↗ Share Credentials
        </Link>
      </div>

      {/* Stat Cards */}
      <div className={`grid-4 stagger-children ${styles.statsGrid}`}>
        <div className="stat-card">
          <span className="stat-value">{loading ? '—' : credentials.length}</span>
          <span className="stat-label">Total Credentials</span>
          <span className={styles.statIcon}>📁</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{loading ? '—' : totalVerified}</span>
          <span className="stat-label">Verified</span>
          <span className={styles.statIcon}>✅</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">0</span>
          <span className="stat-label">Active Share Links</span>
          <span className={styles.statIcon}>🔗</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">0</span>
          <span className="stat-label">Verifications Today</span>
          <span className={styles.statIcon}>🔍</span>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Credentials by Type */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Vault Overview</h2>
            <Link href="/app/vault" style={{ fontSize: 13, color: 'var(--color-primary-light)' }}>
              View all →
            </Link>
          </div>
          <div className={styles.typeGrid}>
            {Object.entries(CREDENTIAL_TYPE_CONFIG).map(([type, cfg]) => (
              <div key={type} className={styles.typeChip} style={{ '--chip-color': cfg.color } as React.CSSProperties}>
                <span className={styles.typeChipIcon}>{cfg.icon}</span>
                <span className={styles.typeChipCount}>{counts[type] ?? 0}</span>
                <span className={styles.typeChipLabel}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
          </div>
          <div className={styles.activityList}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className={styles.activityItem}>
                <div className={styles.activityIcon}>{item.icon}</div>
                <div>
                  <p className={styles.activityText}>{item.text}</p>
                  <span className={styles.activityTime}>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Credentials */}
      <div style={{ marginTop: 32 }}>
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Recent Credentials</h3>
          <Link href="/app/vault/add" className="btn btn-secondary btn-sm">
            + Add Credential
          </Link>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <div>
              <strong>Failed to load credentials</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid-2">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : credentials.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗂️</div>
            <h4 className="empty-state-title">Your vault is empty</h4>
            <p className="empty-state-desc">
              Add your first credential to get started — DigiLocker, LinkedIn, or manual upload.
            </p>
            <Link href="/app/vault/add" className="btn btn-primary" style={{ marginTop: 8 }}>
              Add your first credential →
            </Link>
          </div>
        ) : (
          <div className="grid-2 stagger-children">
            {credentials.slice(0, 4).map((c) => (
              <CredentialCard key={c.id} credential={c} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Share CTA */}
      {credentials.length > 0 && (
        <div className={styles.shareCta}>
          <div className={styles.shareCtaContent}>
            <span style={{ fontSize: 32 }}>⚡</span>
            <div>
              <h4>Ready to share your vault?</h4>
              <p>Create an expiring QR code in seconds — no account needed for verifiers.</p>
            </div>
          </div>
          <Link href="/app/share/new" className="btn btn-primary btn-lg">
            Create Share Link →
          </Link>
        </div>
      )}
    </div>
  );
}
