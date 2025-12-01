# Shopify App Store Submission Guide

This guide will walk you through the process of making your Strategic Merchandise App available on the Shopify App Store.

## 📋 Prerequisites

Before submitting your app, ensure you have:

1. ✅ **Shopify Partner Account** - [Create one here](https://partners.shopify.com/signup) if you don't have it
2. ✅ **App is fully functional** - Test all features thoroughly
3. ✅ **Production hosting** - App must be deployed and accessible
4. ✅ **Production database** - Switch from SQLite to a production database (PostgreSQL, MySQL, etc.)
5. ✅ **SSL certificate** - Your app URL must use HTTPS
6. ✅ **Privacy Policy** - Required for App Store submission
7. ✅ **Support contact** - Email or support URL

## 🚀 Step 1: Deploy Your App to Production

### 1.1 Choose a Hosting Provider

Recommended options:
- **Google Cloud Run** - [Detailed tutorial](https://shopify.dev/docs/apps/launch/deployment/deploy-to-google-cloud-run)
- **Fly.io** - [Quick setup](https://fly.io/docs/js/shopify/)
- **Render** - [Docker deployment](https://render.com/docs/deploy-shopify-app)
- **Heroku** - Simple deployment
- **AWS/Azure/GCP** - Enterprise options

### 1.2 Set Up Production Database

**Important:** SQLite won't work in production. You need a production database.

**Option A: PostgreSQL (Recommended)**
1. Sign up for a PostgreSQL database:
   - [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases-postgresql)
   - [Supabase](https://supabase.com) (Free tier available)
   - [Railway](https://railway.app) (Free tier available)
   - [Neon](https://neon.tech) (Free tier available)

2. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Update your production environment variables:
```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**Option B: MySQL**
1. Sign up for MySQL database (PlanetScale, DigitalOcean, etc.)
2. Update schema:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### 1.3 Configure Environment Variables

Set these in your hosting provider:

```bash
# Required
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-app-domain.com
SCOPES=write_products
NODE_ENV=production
DATABASE_URL=your_production_database_url

# Optional
SHOP_CUSTOM_DOMAIN=your-custom-domain.com
```

### 1.4 Deploy Your App

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Deploy using your hosting provider's method:**
   - For Docker: Use the provided `Dockerfile`
   - For platform-specific: Follow their deployment guide

3. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Verify deployment:**
   - Visit your app URL
   - Test installation on a development store
   - Verify all features work correctly

## 📝 Step 2: Prepare App Store Listing

### 2.1 Required Information

You'll need to prepare:

1. **App Name:** "Strategic Merchandise" (or your preferred name)
2. **Short Description:** 1-2 sentences describing your app
3. **Long Description:** Detailed description of features and benefits
4. **App Icon:** 1200x1200px PNG (transparent background)
5. **Screenshots:** 
   - At least 3 screenshots (1280x720px minimum)
   - Show key features of your app
6. **Support URL:** Where users can get help
7. **Privacy Policy URL:** Required for App Store
8. **Pricing:** Free, one-time payment, or subscription

### 2.2 Create Privacy Policy

You need a privacy policy page. Create one that covers:
- What data you collect
- How you use the data
- Data storage and security
- Third-party services
- User rights

You can:
- Host it on your app domain: `https://your-app.com/privacy`
- Use a service like [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

### 2.3 Prepare Screenshots

Take screenshots showing:
1. Main interface with price adjustment tool
2. Collection selection feature
3. Tag-based filtering
4. Success message after price update

**Requirements:**
- Minimum 1280x720px
- PNG or JPG format
- Show real functionality (not mockups)

## 🔧 Step 3: Update App Configuration

### 3.1 Update shopify.app.toml

Update your `shopify.app.toml` with production URLs:

```toml
application_url = "https://your-app-domain.com"
redirect_urls = [ "https://your-app-domain.com/api/auth" ]
```

### 3.2 Verify App Distribution

Your `app/shopify.server.js` should already have:
```javascript
distribution: AppDistribution.AppStore,
```

This is correct! ✅

## 📤 Step 4: Submit to App Store

### 4.1 Access Partner Dashboard

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Navigate to **Apps** → **Your App**
3. Click **App Store listing** or **Get started**

### 4.2 Complete App Store Listing

Fill out all required sections:

1. **App Details:**
   - App name
   - Short description (160 characters max)
   - Long description
   - Category (e.g., "Product management")
   - Tags/keywords

2. **Media:**
   - Upload app icon (1200x1200px)
   - Upload screenshots (minimum 3)
   - Optional: Video demo

3. **Support & Legal:**
   - Support URL
   - Privacy Policy URL
   - Terms of Service (optional but recommended)

4. **Pricing:**
   - Choose pricing model (recurring subscription recommended)
   - Set up billing using Shopify Billing API (already implemented in this app)
   - Configure pricing tiers if offering multiple plans

### 4.3 Submit for Review

1. Review all information carefully
2. Ensure all required fields are completed
3. Click **Submit for review**

## ✅ Step 5: App Review Process

### 5.1 What Shopify Reviews

Shopify will check:
- ✅ App functionality and stability
- ✅ Security and data handling
- ✅ User experience and design
- ✅ Privacy policy compliance
- ✅ API usage compliance
- ✅ Performance and reliability
- ✅ Accurate listing information

### 5.2 Review Timeline

- **Initial review:** 5-7 business days
- **Re-submission:** 3-5 business days (if changes needed)

### 5.3 Common Rejection Reasons

Avoid these common issues:
- ❌ App crashes or errors
- ❌ Missing privacy policy
- ❌ Poor user experience
- ❌ Inaccurate screenshots
- ❌ Security vulnerabilities
- ❌ Non-compliant API usage

## 🎯 Step 6: Post-Approval

Once approved:

1. **Monitor your app:**
   - Check for user reviews
   - Monitor error logs
   - Track usage metrics

2. **Maintain your app:**
   - Fix bugs promptly
   - Add requested features
   - Keep dependencies updated

3. **Market your app:**
   - Share on social media
   - Write blog posts
   - Engage with users

## 💳 Step 7: Set Up Billing (Paid App)

### 7.1 Billing Implementation

This app already includes billing functionality using Shopify's Billing API. Here's what's implemented:

**Features:**
- ✅ Subscription creation with Shopify Billing API
- ✅ Subscription status checking
- ✅ Subscription cancellation
- ✅ Webhook handlers for subscription updates
- ✅ Protected routes that require active subscription
- ✅ Billing management page

### 7.2 Configure Pricing

1. **Update Default Pricing** (optional):
   - Edit `app/routes/app.billing.jsx` to customize plan options
   - Modify default prices in the billing page component

2. **Test Billing Flow:**
   ```bash
   # Install app on a development store
   npm run dev
   
   # Navigate to /app/billing
   # Test subscription creation
   # Verify subscription confirmation flow
   ```

3. **Billing Requirements:**
   - App must be in production (not just development)
   - App must be submitted to App Store
   - Billing API requires proper app authentication

### 7.3 Database Migration

After updating the Prisma schema, run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Create migration for Subscription model
npx prisma migrate dev --name add_subscription_model

# For production
npx prisma migrate deploy
```

### 7.4 Billing Webhooks

The app automatically handles these webhooks:
- `app_subscriptions/create` - When a subscription is created
- `app_subscriptions/update` - When subscription status changes

These are already configured in `shopify.app.toml`.

### 7.5 Pricing Strategy

Consider these pricing models:
- **Single Plan**: One price for all features
- **Tiered Plans**: Basic, Pro, Enterprise (already implemented in UI)
- **Usage-Based**: Charge based on usage (requires additional implementation)

**Recommended:** Start with a single recurring monthly subscription, then add tiers as you grow.

## 🔍 Pre-Submission Checklist

Before submitting, verify:

- [ ] App is deployed and accessible via HTTPS
- [ ] Production database is set up and working
- [ ] All environment variables are configured
- [ ] App installs successfully on a test store
- [ ] All features work correctly
- [ ] **Billing flow works correctly (create, confirm, cancel)**
- [ ] **Subscription status checking works**
- [ ] **Protected routes require subscription**
- [ ] Privacy policy is published and accessible
- [ ] Support contact information is available
- [ ] App icon is prepared (1200x1200px)
- [ ] Screenshots are prepared (min 3, 1280x720px)
- [ ] App description is written
- [ ] Error handling is implemented
- [ ] Loading states are shown
- [ ] App is tested on multiple stores
- [ ] Webhooks are working correctly
- [ ] App uninstall cleanup works
- [ ] **Database migration for Subscription model is run**

## 📚 Additional Resources

- [Shopify App Store Requirements](https://shopify.dev/docs/apps/store/requirements)
- [App Review Guidelines](https://shopify.dev/docs/apps/store/review)
- [Deployment Documentation](https://shopify.dev/docs/apps/launch/deployment)
- [Shopify Billing API](https://shopify.dev/docs/apps/billing)
- [App Subscription API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate)
- [Partner Dashboard](https://partners.shopify.com)
- [Revenue Share Information](https://help.shopify.com/partners/making-apps)

## 🆘 Need Help?

- **Shopify Community:** [community.shopify.com](https://community.shopify.com)
- **Shopify Discord:** [discord.gg/shopifydevs](https://discord.gg/shopifydevs)
- **Documentation:** [shopify.dev/docs/apps](https://shopify.dev/docs/apps)

---

**Good luck with your App Store submission! 🚀**

