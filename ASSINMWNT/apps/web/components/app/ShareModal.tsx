'use client';

import { useState, useRef, useEffect } from 'react';
import { api, type CreateShareResponse } from '../../lib/api';
import styles from './ShareModal.module.css';

const TTL_OPTIONS = [
  { label: '1 hour',   value: 1 },
  { label: '24 hours', value: 24 },
  { label: '7 days',   value: 168 },
];

const MAX_USE_OPTIONS = [
  { label: '1 use',       value: 1 },
  { label: '5 uses',      value: 5 },
  { label: 'Unlimited',   value: 1000 },
];

interface Props {
  credentialIds: string[];
  onClose: () => void;
}

export default function ShareModal({ credentialIds, onClose }: Props) {
  const [ttlHours, setTtlHours]     = useState(24);
  const [maxUses, setMaxUses]       = useState(1);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<CreateShareResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);
  const [countdown, setCountdown]   = useState('');
  const modalRef                    = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!result) return;
    const tick = () => {
      const diff = new Date(result.expiresAt).getTime() - Date.now();
      if (diff <= 0) { setCountdown('Expired'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [result]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.share.create({ credentialIds, ttlHours, maxUses });
      setResult(res);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label="Share credentials">
      <div className="modal" ref={modalRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>

        {!result ? (
          <>
            <h2 className="modal-title">⚡ Share Credentials</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
              Create an expiring, tamper-proof share link for {credentialIds.length} credential{credentialIds.length !== 1 ? 's' : ''}.
            </p>

            {/* TTL */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Link expiry</label>
              <div className={styles.optionGrid}>
                {TTL_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`${styles.optionBtn} ${ttlHours === o.value ? styles.optionBtnActive : ''}`}
                    onClick={() => setTtlHours(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.optionBtn} ${!TTL_OPTIONS.some(o => o.value === ttlHours) ? styles.optionBtnActive : ''}`}
                  onClick={() => { const h = parseInt(prompt('Hours?') ?? '24', 10); if (h > 0) setTtlHours(h); }}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Max uses */}
            <div className="form-group" style={{ marginBottom: 32 }}>
              <label className="form-label">Max uses</label>
              <div className={styles.optionGrid}>
                {MAX_USE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`${styles.optionBtn} ${maxUses === o.value ? styles.optionBtnActive : ''}`}
                    onClick={() => setMaxUses(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 20 }} role="alert">
                <span>⚠️</span><p>{error}</p>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Generating...' : '🔗 Generate Share Link'}
            </button>
          </>
        ) : (
          <>
            <h2 className="modal-title">✅ Share Link Ready!</h2>

            {/* QR Code */}
            <div className="qr-container" style={{ margin: '0 auto 24px', width: 'fit-content' }}>
              <div className="qr-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.qrDataUrl} alt="QR Code for credential share" width={220} height={220} />
              </div>
              <p style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>Scan to verify credentials</p>
            </div>

            {/* Link */}
            <div className={styles.linkRow}>
              <code className={styles.shareLink}>{result.shareUrl}</code>
              <button className="btn btn-sm btn-secondary" onClick={handleCopy}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>

            {/* Countdown */}
            <div className={styles.countdownRow}>
              <span>⏱ Expires in:</span>
              <span className={styles.countdown}>{countdown}</span>
              <span>· Max uses: {maxUses === 1000 ? '∞' : maxUses}</span>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 20 }} onClick={onClose}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
