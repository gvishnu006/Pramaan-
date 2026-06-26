'use client';

import { useState, useEffect } from 'react';
import { api, type ShareVerifyResponse } from '../../lib/api';
import CredentialCard from '../app/CredentialCard';
import styles from './PublicVerifyPage.module.css';

interface Props {
  token: string;
}

export default function PublicVerifyPage({ token }: Props) {
  const [data, setData] = useState<ShareVerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    api.share.verify(token)
      .then(setData)
      .catch((err) => setError({ code: err.code || 'ERROR', message: err.message }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <div className="skeleton" style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 20px' }} />
          <div className="skeleton" style={{ width: '80%', height: 24, margin: '0 auto 12px' }} />
          <div className="skeleton" style={{ width: '60%', height: 16, margin: '0 auto 32px' }} />
          <div className="grid-1" style={{ gap: 16 }}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>
            {error.code === 'EXPIRED' || error.code === 'REVOKED' ? '⚠️' : '❌'}
          </span>
          <h2 className={styles.errorTitle}>
            {error.code === 'EXPIRED' ? 'Link Expired' : error.code === 'REVOKED' ? 'Link Revoked' : 'Verification Failed'}
          </h2>
          <p className={styles.errorText}>{error.message}</p>
          <a href="/" className="btn btn-secondary" style={{ marginTop: 24 }}>Go to Homepage</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>Omnimise</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.verifySuccess}>
          <div className={styles.successIcon}>✓</div>
          <div>
            <h1 className={styles.title}>Verified Credentials</h1>
            <p className={styles.subtitle}>
              Verification Timestamp: {new Date(data!.verifiedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className={styles.bundleInfo}>
          <div className={styles.securityBadge}>
            <span className={styles.shield}>🛡️</span>
            <div>
              <strong>Cryptographically Signed</strong>
              <p>This bundle is signed with the issuer's RSA-256 private key.</p>
            </div>
          </div>
          <a href={data!.publicKeyUrl} target="_blank" rel="noopener noreferrer" className={styles.publicKeyLink}>
            View Public Key
          </a>
        </div>

        <div className={styles.grid}>
          {data!.credentials.map((c) => (
            <CredentialCard key={c.id} credential={c} />
          ))}
        </div>

        <footer className={styles.footer}>
          <p>Verified via Omnimise Protocol v1.0</p>
          <p>Report issues to security@omnimise.com</p>
        </footer>
      </main>
    </div>
  );
}
