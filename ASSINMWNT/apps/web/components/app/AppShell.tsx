'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { href: '/app/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/app/vault',     icon: '🔒', label: 'Vault' },
  { href: '/app/share',     icon: '↗', label: 'Share' },
  { href: '/app/settings',  icon: '⚙', label: 'Settings' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="page-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⬡</div>
          <span className="sidebar-logo-text">Omnimise</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>U</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>User</span>
              <span className={styles.userEmail}>user@example.com</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
