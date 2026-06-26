'use client';

import Link from 'next/link';
import { type Credential } from '../../lib/api';
import styles from './CredentialCard.module.css';

const TYPE_CONFIG: Record<string, { icon: string; colorClass: string; label: string }> = {
  education: { icon: '🎓', colorClass: 'education', label: 'Education' },
  work:       { icon: '💼', colorClass: 'work',      label: 'Work' },
  skill:      { icon: '⚡', colorClass: 'skill',     label: 'Skill' },
  kyc:        { icon: '🛡️', colorClass: 'kyc',       label: 'KYC' },
  custom:     { icon: '✦',  colorClass: 'custom',    label: 'Custom' },
};

interface Props {
  credential: Credential;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
}

export default function CredentialCard({ credential, onDelete, onShare }: Props) {
  const cfg = TYPE_CONFIG[credential.type] ?? TYPE_CONFIG.custom;
  const isExpired = credential.expiryDate ? new Date(credential.expiryDate) < new Date() : false;

  return (
    <div className="credential-card">
      <div className={`credential-icon ${cfg.colorClass}`}>{cfg.icon}</div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h4 className={styles.title}>{credential.title}</h4>
            <p className={styles.issuer}>{credential.issuer}</p>
          </div>
          <div className={styles.badges}>
            {credential.verified && (
              <span className="verified-badge">✓ Verified</span>
            )}
            {isExpired && (
              <span className="badge badge-danger">Expired</span>
            )}
          </div>
        </div>

        <div className={styles.meta}>
          <span className="badge badge-muted">{cfg.label}</span>
          {credential.issueDate && (
            <span className={styles.date}>
              {new Date(credential.issueDate).toLocaleDateString('en-IN', {
                month: 'short', year: 'numeric'
              })}
            </span>
          )}
          {credential.expiryDate && (
            <span className={`${styles.date} ${isExpired ? styles.dateExpired : ''}`}>
              Exp: {new Date(credential.expiryDate).toLocaleDateString('en-IN', {
                month: 'short', year: 'numeric'
              })}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {onShare && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onShare(credential.id)}
              aria-label={`Share ${credential.title}`}
            >
              ↗ Share
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onDelete(credential.id)}
              aria-label={`Delete ${credential.title}`}
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
