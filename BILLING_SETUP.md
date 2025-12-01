# Billing Setup Guide

This app includes a complete billing system using Shopify's Billing API for paid subscriptions.

## 🚀 Quick Start

### 1. Run Database Migration

After adding the Subscription model to your Prisma schema, run:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_subscription_model
```

For production:
```bash
npx prisma migrate deploy
```

### 2. Test Billing Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Install the app on a development store

3. Navigate to `/app/billing` to test:
   - Subscription creation
   - Subscription confirmation
   - Subscription cancellation

### 3. Configure Pricing

Edit `app/routes/app.billing.jsx` to customize:
- Plan names (Basic, Pro, Enterprise)
- Default prices
- Currency options

## 📋 Features Implemented

✅ **Subscription Management**
- Create recurring subscriptions via Shopify Billing API
- Check subscription status
- Cancel subscriptions
- Sync subscription status from Shopify

✅ **Protected Routes**
- Main app route (`/app`) requires active subscription
- Automatic redirect to billing page if not subscribed

✅ **Webhook Handlers**
- `app_subscriptions/create` - Handles new subscriptions
- `app_subscriptions/update` - Handles subscription status changes

✅ **Billing UI**
- Subscription management page (`/app/billing`)
- Subscription confirmation page (`/app/billing/confirm`)
- Plan selection interface

## 🔧 Configuration

### Environment Variables

Ensure these are set:
```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-app-domain.com
```

### Database Schema

The Subscription model includes:
- `shop` - Shop domain (unique)
- `subscriptionId` - Shopify subscription ID
- `status` - Subscription status (ACTIVE, CANCELLED, etc.)
- `planName` - Plan name
- `price` - Price in decimal format
- `currency` - Currency code
- `createdAt`, `updatedAt`, `cancelledAt` - Timestamps

## 🧪 Testing

### Test Subscription Creation

1. Navigate to `/app/billing`
2. Select a plan
3. Click "Subscribe Now"
4. You'll be redirected to Shopify's confirmation page
5. After confirmation, you'll be redirected back to `/app/billing/confirm`
6. Then automatically redirected to `/app`

### Test Subscription Protection

1. Without an active subscription, visiting `/app` will show:
   - "Subscription Required" message
   - Button to navigate to billing page

2. With an active subscription, `/app` shows the full app interface

### Test Subscription Cancellation

1. Navigate to `/app/billing`
2. Click "Cancel Subscription"
3. Confirm cancellation
4. Subscription status updates to "CANCELLED"
5. App features become inaccessible

## 📝 Notes

- **Development vs Production**: Billing API works differently in development. In development, subscriptions are created but may not charge. Test thoroughly in production.

- **Webhooks**: Subscription webhooks are automatically registered when the app is installed. They're configured in `shopify.app.toml`.

- **Pricing**: Default pricing is set to $9.99/month for Basic plan. Adjust in `app/routes/app.billing.jsx`.

- **Trial Periods**: You can add trial periods by modifying the `createSubscription` function in `app/billing.server.js`.

## 🐛 Troubleshooting

### "No subscription found" error
- Ensure database migration has been run
- Check that subscription was created in Shopify
- Verify webhook handlers are working

### Subscription not activating
- Check webhook delivery in Partner Dashboard
- Verify `app_subscriptions/create` webhook is registered
- Check database for subscription record

### GraphQL errors
- Verify API version in `app/shopify.server.js`
- Check that currency code is valid (USD, EUR, etc.)
- Ensure price is a valid decimal number

## 📚 Resources

- [Shopify Billing API Documentation](https://shopify.dev/docs/apps/billing)
- [App Subscription API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate)
- [Billing Best Practices](https://shopify.dev/docs/apps/billing/best-practices)

