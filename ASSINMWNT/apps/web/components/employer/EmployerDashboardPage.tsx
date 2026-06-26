'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type EmployerRequest } from '../../lib/api';
import styles from './EmployerDashboardPage.module.css';

const COLUMNS = [
  { id: 'pending',   label: 'Pending',   color: '#f59e0b' },
  { id: 'consented', label: 'Consented', color: '#3b82f6' },
  { id: 'completed', label: 'Completed', color: '#10b981' },
  { id: 'rejected',  label: 'Rejected',  color: '#ef4444' },
];

export default function EmployerDashboardPage() {
  const [requests, setRequests] = useState<EmployerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.employer.getRequests()
      .then(res => setRequests(res.requests))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getRequestsByStatus = (status: string) => 
    requests.filter(r => r.status === status);

  return (
    <div className="animate-in" style={{ padding: '40px' }}>
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title">BGV Requests Board</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage and track candidate verification requests.
          </p>
        </div>
        <Link href="/employer/new-request" className="btn btn-primary">
          + New Request
        </Link>
      </div>

      {loading ? (
        <div className="kanban-board">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="kanban-column">
              <div className="skeleton" style={{ height: 24, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 100, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 100 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-column">
              <div className="kanban-column-header">
                <span className={styles.columnLabel} style={{ '--col-color': col.color } as any}>
                  {col.label}
                </span>
                <span className={styles.columnCount}>{getRequestsByStatus(col.id).length}</span>
              </div>
              <div className={styles.columnContent}>
                {getRequestsByStatus(col.id).map(req => (
                  <div key={req.id} className="kanban-card">
                    <div className={styles.cardEmail}>{req.candidateEmail}</div>
                    <div className={styles.cardTypes}>
                      {req.credentialTypes.map(t => (
                        <span key={t} className={styles.typeTag}>{t}</span>
                      ))}
                    </div>
                    <div className={styles.cardDate}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
