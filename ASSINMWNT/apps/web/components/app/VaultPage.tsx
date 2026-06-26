'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, type Credential, type CredentialType } from '../../lib/api';
import CredentialCard from './CredentialCard';
import SkeletonCard from './SkeletonCard';
import ShareModal from './ShareModal';

const FILTER_TABS: { value: CredentialType | 'all'; label: string; icon: string }[] = [
  { value: 'all',       label: 'All',       icon: '📁' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'work',      label: 'Work',      icon: '💼' },
  { value: 'skill',     label: 'Skills',    icon: '⚡' },
  { value: 'kyc',       label: 'KYC',       icon: '🛡️' },
  { value: 'custom',    label: 'Custom',    icon: '✦' },
];

export default function VaultPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<CredentialType | 'all'>('all');
  const [search, setSearch]           = useState('');
  const [shareId, setShareId]         = useState<string | null>(null);
  const [deleting, setDeleting]       = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.credentials.list({
      type: activeTab !== 'all' ? activeTab : undefined,
      search: search || undefined,
    })
      .then((res) => setCredentials(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeTab, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.credentials.delete(id);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="animate-in">
      {shareId && (
        <ShareModal
          credentialIds={[shareId]}
          onClose={() => setShareId(null)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Vault</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            {credentials.length} credential{credentials.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <Link href="/app/vault/add" className="btn btn-primary">
          + Add Credential
        </Link>
      </div>

      {/* Search + Tabs */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search credentials..."
          className="form-input"
          style={{ flex: 1, minWidth: 200 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search credentials"
        />
        <div className="tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`tab-btn ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          <span>⚠️</span>
          <div>
            <strong>Failed to load credentials</strong>
            <p>{error}</p>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={load}>Retry</button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid-2">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : credentials.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗂️</div>
          <h4 className="empty-state-title">
            {search ? `No results for "${search}"` : 'No credentials yet'}
          </h4>
          <p className="empty-state-desc">
            {search
              ? 'Try different search terms or clear the filter.'
              : 'Add your first credential to get started.'}
          </p>
          {!search && (
            <Link href="/app/vault/add" className="btn btn-primary" style={{ marginTop: 12 }}>
              Add your first credential →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid-2 stagger-children">
          {credentials.map((c) => (
            <div key={c.id} style={{ opacity: deleting === c.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <CredentialCard
                credential={c}
                onShare={(id) => setShareId(id)}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
