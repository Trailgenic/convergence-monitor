# convergence-monitor

This repository hosts a convergence monitoring application that polls macro and market-derived signals, stores readings, checks for category-level signal clustering, and sends alert notifications when convergence criteria are met.

Stack: Next.js 15 (App Router, TypeScript), Vercel Postgres, Vercel Cron, Twilio.

Signal categories monitored:
- Credit
- Capex
- Energy
- Cloud growth
- IPO window monitoring

## Setup
1. Clone the repo and install dependencies:
   - `git clone https://github.com/Trailgenic/convergence-monitor.git`
   - `cd convergence-monitor && npm install`
2. Copy `.env.example` to `.env.local` and fill values.
3. Initialize database: `npm run db:init`
4. Deploy to Vercel and set the same environment variables.
