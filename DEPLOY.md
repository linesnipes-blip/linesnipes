# LineSnipes — Deployment Guide

## Architecture
```
linesnipes/
├── public/                 # Static site (deployed to Netlify CDN)
│   ├── index.html          # HTML shell + all CSS
│   └── js/
│       ├── engine.js       # State, math engine, API helpers
│       ├── ui.js           # All page render functions
│       └── app.js          # Router + init
├── netlify/
│   └── functions/          # Serverless API (auto-deployed)
│       ├── sports.js       # GET /api/sports — cached 6hr
│       ├── odds.js         # GET /api/odds?sport=xxx — cached 60s
│       ├── checkout.js     # POST /api/checkout — Stripe session
│       ├── stripe-webhook.js # POST /api/stripe-webhook
│       ├── profile.js      # GET/POST /api/profile
│       └── utils/db.js     # Shared Supabase helpers
├── netlify.toml            # Build config + redirects
├── package.json            # Dependencies (supabase-js, stripe)
├── supabase-setup.sql      # Database schema
└── .env.example            # Environment variable template
```

## Step-by-Step Setup

### 1. Supabase (Free Tier — 50K users)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy **Project URL** and **anon key** from Settings → API
3. Copy **service_role key** (keep secret — backend only)
4. Go to SQL Editor → paste contents of `supabase-setup.sql` → Run
5. Go to Authentication → Settings:
   - Enable Email auth
   - Set Site URL to `https://linesnipes.com`
   - Add `https://linesnipes.com` to Redirect URLs

### 2. Stripe (Test first, then Live)
1. Go to [stripe.com](https://stripe.com) → Dashboard
2. Create 3 Products:
   - **Standard**: $29.99/month recurring → copy Price ID
   - **Unlimited**: $49.99/month recurring → copy Price ID  
   - **Lifetime**: $499 one-time payment → copy Price ID
3. Copy **Publishable key** (pk_...) and **Secret key** (sk_...)
4. Go to Developers → Webhooks → Add endpoint:
   - URL: `https://linesnipes.com/api/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
   - Copy **Webhook signing secret** (whsec_...)
5. Enable **Customer Portal** in Settings → Billing → Customer Portal

### 3. The Odds API
1. Go to [the-odds-api.com](https://the-odds-api.com) → Sign up
2. Copy your **API key**
3. Start with free tier (500 requests/month) for testing
4. Upgrade to $49/month plan for production (~10K requests)

### 4. Netlify Deployment
1. Push code to GitHub repository
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Connect your repo:
   - Build command: (leave blank — it's static)
   - Publish directory: `public`
4. Go to Site Settings → Environment Variables → Add:

```
ODDS_API_KEY=your_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STANDARD=price_xxx
STRIPE_PRICE_UNLIMITED=price_xxx
STRIPE_PRICE_LIFETIME=price_xxx
```

5. Go to Domain Management → Add custom domain → `linesnipes.com`
6. At Namecheap: Set nameservers to Netlify's (or add CNAME)

### 5. Update Frontend Config
In `public/js/engine.js`, update the CONFIG object:
```javascript
const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGci...',
  API_BASE: '/api',
};
```

The Stripe publishable key is NOT needed client-side since we redirect to Stripe Checkout (hosted by Stripe).

### 6. DNS (Namecheap)
Option A — Netlify DNS (recommended):
1. In Netlify → Domain settings → copy nameservers
2. In Namecheap → Domain → Custom DNS → paste Netlify nameservers

Option B — CNAME:
1. In Namecheap → Advanced DNS
2. Add CNAME record: `www` → `your-site.netlify.app`
3. Add ALIAS/ANAME for `@` → `your-site.netlify.app`

### 7. Test the Flow
1. Visit linesnipes.com → landing page should load
2. Sign up → creates Supabase account + profile (free plan, 10 fetches)
3. Select sport + sportsbook → Fetch Odds → should return data
4. Check Settings → usage counter should show 1/10
5. Click Upgrade → should redirect to Stripe Checkout
6. Complete payment (use test card 4242... in test mode)
7. Stripe webhook fires → Supabase profile updates to paid plan
8. Usage resets, new limits apply

## Cost Breakdown (Monthly)
| Service | Cost |
|---------|------|
| Netlify | Free (100GB bandwidth, 125K function calls) |
| Supabase | Free (50K users, 500MB storage) |
| Stripe | 2.9% + $0.30 per transaction |
| The Odds API | $49/month (10K requests with caching) |
| **Total fixed** | **~$49/month** |

With 60-second caching, one API call serves ALL users checking that sport. At 100 users, you're well within the $49/month plan. Revenue from ~2 Standard subscribers covers the API cost.

## Going Live Checklist
- [ ] Supabase SQL run
- [ ] Supabase auth configured
- [ ] Stripe products created (3 prices)
- [ ] Stripe webhook endpoint added
- [ ] Stripe Customer Portal enabled
- [ ] All env vars set in Netlify
- [ ] CONFIG updated in engine.js
- [ ] DNS pointing to Netlify
- [ ] SSL certificate auto-provisioned
- [ ] Test: signup → fetch → upgrade → webhook → settings
