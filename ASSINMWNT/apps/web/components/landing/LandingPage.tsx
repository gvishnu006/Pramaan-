'use client';

import Link from 'next/link';
import styles from './LandingPage.module.css';

const FEATURES = [
  {
    icon: '🔐',
    title: 'Sovereign Encrypted Vault',
    desc: 'AES-256-GCM encryption with keys derived from your device. Your credentials, your device, your keys.',
  },
  {
    icon: '⚡',
    title: 'Instant Verification',
    desc: 'Replace 15+ day manual BGV with cryptographically signed, instant proofs.',
  },
  {
    icon: '🎯',
    title: 'Granular Consent',
    desc: 'Share only what you want, to whom you want, for exactly as long as you decide.',
  },
  {
    icon: '🛡️',
    title: 'Tamper-Proof Signatures',
    desc: 'Every credential is signed with RSA-SHA256. Verifiers can confirm authenticity independently.',
  },
  {
    icon: '🔗',
    title: 'Connected Integrations',
    desc: 'Pull credentials directly from DigiLocker, LinkedIn, Coursera, NPTEL with OAuth.',
  },
  {
    icon: '📱',
    title: 'QR Share Anywhere',
    desc: 'Generate expiring QR codes with max-use limits. Revoke access with one tap.',
  },
];

const TIMELINE = [
  {
    era: 'Before 2010',
    title: 'The Paper Era',
    desc: 'Candidates couriered notarized documents. HR teams spent weeks chasing originals.',
    color: '#ef4444',
  },
  {
    era: '2010–2023',
    title: 'The Digital-But-Slow Era',
    desc: 'PDFs and email. Still 10–15 days. Fraud still easy. Verification still manual.',
    color: '#f59e0b',
  },
  {
    era: 'Today',
    title: 'The Sovereign Identity Era',
    desc: 'Omnimise: cryptographic proofs, zero-knowledge sharing, instant BGV. Your identity, in your hands.',
    color: '#4F46E5',
    current: true,
  },
];

const USE_CASES = [
  {
    icon: '🎓',
    title: 'University Admissions',
    scenario: 'Share your Class XII marksheet + NPTEL certifications in one QR code.',
    time: 'Verification in seconds',
  },
  {
    icon: '💼',
    title: 'Job Applications',
    scenario: 'Let employers verify your work history and education before interviews.',
    time: 'BGV in < 24 hours',
  },
  {
    icon: '🌏',
    title: 'Visa Applications',
    scenario: 'Share KYC documents and employment history with embassies securely.',
    time: 'Instant proof delivery',
  },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      {/* ── Navbar ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            <span className={styles.logoText}>Omnimise</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#use-cases">Use Cases</a>
            <Link href="/employer">For Employers</Link>
          </div>
          <div className={styles.navActions}>
            <Link href="/app/dashboard" className="btn btn-ghost">Sign In</Link>
            <Link href="/app/dashboard" className="btn btn-primary btn-pill">
              Get Started Free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className="container">
          <div className={styles.heroBadge}>
            <span>🇮🇳</span>
            <span>Built for India's 600M+ professionals</span>
          </div>
          <h1 className={styles.heroTitle}>
            Your verified identity.<br />
            <span className={styles.heroGradient}>Instant. Private. Yours.</span>
          </h1>
          <p className={styles.heroDesc}>
            Omnimise aggregates your credentials from DigiLocker, LinkedIn, Coursera & more
            into a sovereign encrypted vault — then lets you share cryptographic proofs via
            expiring QR codes. Background verification in seconds, not weeks.
          </p>
          <div className={styles.heroCta}>
            <Link href="/app/dashboard" className="btn btn-primary btn-lg btn-pill">
              🚀 Build My Vault — Free
            </Link>
            <Link href="/employer" className="btn btn-secondary btn-lg btn-pill">
              I'm an Employer →
            </Link>
          </div>
          <div className={styles.heroStats}>
            {[
              { value: '15 days → instant', label: 'Background verification' },
              { value: 'AES-256-GCM', label: 'Vault encryption' },
              { value: 'RSA-SHA256', label: 'Credential signing' },
            ].map((s) => (
              <div key={s.label} className={styles.heroStat}>
                <span className={styles.heroStatValue}>{s.value}</span>
                <span className={styles.heroStatLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three Eras Timeline ── */}
      <section className={styles.section} id="timeline">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>The Three Eras of Identity Verification</h2>
            <p>We're ending the era of slow, fraud-prone, paper-based background checks.</p>
          </div>
          <div className={styles.timeline}>
            {TIMELINE.map((era, i) => (
              <div
                key={era.era}
                className={`${styles.timelineCard} ${era.current ? styles.timelineCardCurrent : ''}`}
                style={{ '--era-color': era.color } as React.CSSProperties}
              >
                <div className={styles.timelineEra}>{era.era}</div>
                <h3 className={styles.timelineTitle}>{era.title}</h3>
                <p className={styles.timelineDesc}>{era.desc}</p>
                {era.current && (
                  <div className={styles.timelineBadge}>✨ We are here</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.section} id="features">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Everything you need for credential sovereignty</h2>
            <p>No middlemen. No delays. No forgeries.</p>
          </div>
          <div className="grid-3 stagger-children">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className={styles.featureIcon}>{f.icon}</div>
                <h4 style={{ marginBottom: 8 }}>{f.title}</h4>
                <p style={{ fontSize: 14 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Case Simulator ── */}
      <section className={styles.section} id="use-cases">
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>See Omnimise in action</h2>
            <p>Real scenarios that save real time.</p>
          </div>
          <div className="grid-3 stagger-children">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>{uc.icon}</div>
                <h4>{uc.title}</h4>
                <p>{uc.scenario}</p>
                <div className={styles.useCaseBadge}>⚡ {uc.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Your identity in 3 steps</h2>
          </div>
          <div className={styles.steps}>
            {[
              { num: '01', title: 'Aggregate', desc: 'Connect DigiLocker, LinkedIn, Coursera. Import all your credentials into your encrypted vault in minutes.' },
              { num: '02', title: 'Authenticate', desc: 'Each credential is cryptographically signed. Tamper-proof. Verifiable by anyone with one API call.' },
              { num: '03', title: 'Share', desc: 'Generate an expiring QR code. Choose what to share, with whom, and for how long. Revoke anytime.' },
            ].map((step) => (
              <div key={step.num} className={styles.step}>
                <div className={styles.stepNum}>{step.num}</div>
                <div>
                  <h4>{step.title}</h4>
                  <p style={{ fontSize: 14, marginTop: 8 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaInner}>
            <h2>Ready to own your professional identity?</h2>
            <p>Join thousands of Indian professionals who've moved beyond paper-based BGV.</p>
            <div className={styles.heroCta}>
              <Link href="/app/dashboard" className="btn btn-primary btn-lg btn-pill">
                🚀 Build My Vault — It's Free
              </Link>
              <Link href="/employer" className="btn btn-secondary btn-lg btn-pill">
                Employer Sign-Up →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>⬡</span>
              <span className={styles.logoText}>Omnimise</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              © 2024 Omnimise. Empowering India's professionals with verified digital identity.
            </p>
            <div className={styles.footerLinks}>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
              <a href="#">API Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
