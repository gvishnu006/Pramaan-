# Omnimise — Verified Career Identity

AI-powered, cryptographically signed, instant background verification platform for India.

## Tech Stack
- **Web**: Next.js 14, Tailwind CSS
- **Mobile**: React Native (Expo)
- **Backend**: Node.js + Fastify
- **Database**: PostgreSQL (Prisma) + Redis
- **Storage**: Supabase Storage
- **Auth**: Google OAuth + JWT

## Getting Started

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Database Setup**:
   ```bash
   cd packages/db
   # Add DATABASE_URL to .env
   pnpm db:push
   ```

3. **Environment Setup**:
   - Fill `.env` in `packages/api`
   - Fill `.env` in `apps/web`

4. **Run Dev Server**:
   ```bash
   pnpm dev
   ```

## Key Features
- **Aggregate**: DigiLocker, LinkedIn, Coursera/NPTEL imports.
- **Authenticate**: RSA-SHA256 signing of credential bundles.
- **Share**: Expiring QR codes with max-use limits.
- **Verify**: Public verification portal for instant trust.
