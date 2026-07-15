# مرکز کارآفرینی بین‌المللی دانشگاه شمال (I.E.C)

Official website for the International Entrepreneurship Center at Shomal University.

## Tech Stack

- **React 19** — UI library
- **Vite 7** — Build tool
- **TanStack Start** — Full-stack React framework (SSR)
- **TanStack Router** — Type-safe file-based routing (`src/routes/`)
- **Tailwind CSS v4** — Styling
- **Framer Motion** — Animations
- **Radix UI** — Accessible primitives
- **Drizzle ORM + PostgreSQL** — Database (schema `iec`)
- **Zod** — Schema validation
- **TypeScript** — Type safety
- **Bun** — Package manager + test runner

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) 1.1+ (recommended) or npm/yarn/pnpm

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

The site will be available at `http://localhost:3000`.

### Build

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

### Lint & Format

```bash
bun run lint
bun run format
bun run typecheck
```

## Project Structure

```
├── public/
│   ├── images/
│   │   ├── courses/       # 14 archived course posters (WebP + JPEG)
│   │   ├── hero-*.webp    # Responsive hero image variants
│   │   ├── logo-header.png
│   │   ├── logo-icon.png
│   │   ├── apple-touch-icon.png
│   │   └── og-default.jpg
│   ├── favicon.ico
│   ├── robots.txt
│   ├── site.webmanifest
│   └── _redirects
├── scripts/
│   └── download-posters.sh  # Download real posters (run in production)
├── src/
│   ├── components/
│   │   ├── cards/          # CourseCard, FeatureCard
│   │   ├── layout/         # Navbar, Footer, Container, Section
│   │   ├── motion/         # Reveal, Counter
│   │   ├── sections/       # Hero, Features, ArchivedCourses, WhyIEC, FAQSection, ContactCard
│   │   └── ui/             # accordion, badge, button, card, sheet
│   ├── data/               # site, nav, courses, faqs, features
│   ├── lib/                # seo, motion, utils, error-page
│   ├── routes/             # TanStack file-based routes
│   ├── types/              # TypeScript types
│   ├── styles.css          # Tailwind v4 + design tokens
│   ├── router.tsx
│   ├── server.ts
│   └── start.ts
├── vercel.json             # Vercel deployment config (minimal — nitro preset handles the rest)
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

## Content Policy

This website follows a strict **no-fabrication policy**:

- All archived courses are real historical activities
- No fabricated instructors, dates, or statistics
- If real data is not available, sections are hidden or left empty
- Course posters are self-hosted (WebP + JPEG variants)

### Downloading Real Course Posters

The project ships with premium branded placeholder posters. To replace them
with the real posters from the WordPress server, run:

```bash
chmod +x scripts/download-posters.sh
./scripts/download-posters.sh
```

This requires network access to `karafarini.shomal.ac.ir`.

## Deployment

### Vercel (Production Target)

The project is configured for Vercel via the `nitro` `vercel` preset in
`vite.config.ts`. The build produces Vercel's standard Build Output API
format at `.vercel/output/`.

1. Push your repository to GitHub/GitLab
2. Go to [vercel.com](https://vercel.com) → New Project → Import repository
3. Vercel auto-detects the framework (none needed — nitro preset handles it)
4. Set environment variables (see `.env.example`):
   - `DATABASE_URL` — PostgreSQL connection string (use connection pooling)
   - `SESSION_SECRET` — random 32+ char string
   - `ALLOWED_ORIGIN` — your production URL (e.g. `https://your-app.vercel.app`)
   - `UPLOAD_DIR` — set to `/tmp/uploads` (Vercel ephemeral filesystem)
   - `COMMISSION_RATE_PERCENT` — e.g. `10`
   - `SMS_API_KEY` — optional (dev mode logs OTP to console + returns `devCode`)
   - `DEMO_MODE` — set to `true` for the investor demo role-switcher at `/demo`
5. Deploy — Vercel runs `bun run build` and serves SSR + static assets
   automatically from the nitro-generated `.vercel/output/`.

**How it works:**

- `vite.config.ts` uses `nitro({ preset: "vercel" })` which produces
  Vercel's Build Output API format at `.vercel/output/`.
- Vercel detects this format and serves SSR + static assets without
  any custom function configuration.
- Server Functions (`createServerFn`) and API routes work automatically.
- The minimal `vercel.json` only sets the region (`iad1`).

**Important notes for Vercel:**

- `UPLOAD_DIR` must be `/tmp/uploads` — Vercel's filesystem is ephemeral.
  Receipts uploaded during enrollment review are lost on deploy. For
  persistent storage, use an external service (S3, Cloudinary, etc.).
- Database connections use connection pooling (recommended for serverless).
  The `postgres` client in `src/server/db/client.ts` is configured with
  `max: 3` connections, `prepare: false` (avoids prepared-statement
  collisions across pooled connections on Neon/Liara).
- Build memory: the build needs ~3GB RAM. If building locally, set
  `NODE_OPTIONS=--max-old-space-size=3072`. Vercel's build environment
  has sufficient memory by default.

### Manual Deployment (Other Providers)

```bash
# Build produces .vercel/output/ (Vercel Build Output API format).
# For other providers, adjust the nitro preset in vite.config.ts
# (e.g. "netlify", "cloudflare-pages", "node-server").
NODE_OPTIONS=--max-old-space-size=3072 bun run build
```

### Demo Mode

When `DEMO_MODE=true` (server-side env var):

- The `/api/auth/request-otp` endpoint returns a `devCode` field with
  the 6-digit OTP (instead of sending an SMS).
- The `/dashboard` login page shows a modal with the dev code + copy +
  auto-fill buttons.
- The `/demo` page (linked from Navbar and Footer) lets investors
  one-click switch into any of the 4 roles (student/instructor/support/
  admin) using fixed demo phone numbers (`09120000001`–`09120000004`).
- The Navbar shows a gold "مشاهده دمو" link when `DEMO_MODE=true`.

When `DEMO_MODE=false`:

- The `/demo` page still renders but role-switcher buttons will fail
  (no `devCode` returned from the API).
- The Navbar/Footer demo link is hidden.
- OTP is sent via real SMS (requires `SMS_API_KEY`).

### Testing

```bash
bun test                    # run smoke tests
bun run typecheck           # tsc --noEmit
bun run lint                # eslint
bun run build               # production build (needs ~3GB RAM)
```

Smoke tests cover:
- OTP generation, scrypt hashing, timing-safe verification (`otp.test.ts`)
- Iranian phone normalization (`phone.test.ts`)
- RBAC privilege ladder + AuthorizationError status codes (`rbac.test.ts`)

CI runs typecheck + lint + test on every push and pull request
(see `.github/workflows/ci.yml`).

## SEO

- Meta tags on every route (title, description, OG, Twitter)
- JSON-LD structured data (EducationalOrganization, WebSite, BreadcrumbList, FAQPage, LocalBusiness)
- `sitemap.xml` at `/sitemap.xml`
- `robots.txt` at `/robots.txt`
- Canonical URLs on all pages
- Semantic HTML5

## Accessibility

- WCAG AA compliant
- Keyboard navigation (Escape to close menus, focus traps)
- ARIA labels on all interactive elements
- `prefers-reduced-motion` support
- Skip-to-content link
- Proper heading hierarchy

## License

© مرکز کارآفرینی بین‌المللی دانشگاه شمال. All rights reserved.
