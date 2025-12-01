import { authenticate } from "./shopify.server";
import db from "./db.server";

/**
 * Create a subscription using Shopify Billing API
 * @param {Object} request - The request object
 * @param {string} planName - Name of the plan (e.g., "Basic", "Pro")
 * @param {string} price - Price in decimal format (e.g., "9.99")
 * @param {string} currency - Currency code (default: "USD")
 * @param {number} trialDays - Number of trial days (optional)
 * @returns {Promise<Object>} Subscription details
 */
export async function createSubscription(
  request,
  planName = "Basic",
  price = "9.99",
  currency = "USD",
  trialDays = null
) {
  const { admin, session } = await authenticate.admin(request);

  // Check if shop already has an active subscription
  const existingSubscription = await db.subscription.findUnique({
    where: { shop: session.shop },
  });

  if (existingSubscription && existingSubscription.status === "ACTIVE") {
    return {
      success: true,
      subscription: existingSubscription,
      confirmationUrl: null,
    };
  }

  // Create a one-time or recurring charge
  // For App Store apps, we use recurring application charges
  const mutation = `
    mutation CreateSubscription($name: String!, $price: Decimal!, $returnUrl: URL!, $currencyCode: CurrencyCode!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: $price, currencyCode: $currencyCode }
                interval: EVERY_30_DAYS
              }
            }
          }
        ]
        ${trialDays ? `trialDays: ${trialDays}` : ""}
      ) {
        appSubscription {
          id
          status
          currentPeriodEnd
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `;

  const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/billing/confirm`;
  const variables = {
    name: `${planName} Plan`,
    price: parseFloat(price),
    returnUrl,
    currencyCode: currency.toUpperCase(),
  };

  const response = await admin.graphql(mutation, { variables });
  const data = await response.json();

  if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    throw new Error(
      data.data.appSubscriptionCreate.userErrors
        .map((e) => e.message)
        .join(", ")
    );
  }

  const subscription = data.data?.appSubscriptionCreate?.appSubscription;
  const confirmationUrl = data.data?.appSubscriptionCreate?.confirmationUrl;

  // Store subscription in database (pending status until confirmed)
  if (subscription) {
    await db.subscription.upsert({
      where: { shop: session.shop },
      update: {
        subscriptionId: subscription.id,
        status: subscription.status,
        planName,
        price,
        currency,
        updatedAt: new Date(),
      },
      create: {
        shop: session.shop,
        subscriptionId: subscription.id,
        status: subscription.status,
        planName,
        price,
        currency,
      },
    });
  }

  return {
    success: true,
    subscription,
    confirmationUrl,
  };
}

/**
 * Check if shop has an active subscription
 * @param {string} shop - Shop domain
 * @returns {Promise<boolean>} True if active subscription exists
 */
export async function hasActiveSubscription(shop) {
  const subscription = await db.subscription.findUnique({
    where: { shop },
  });

  if (!subscription) {
    return false;
  }

  // Check if subscription is active
  return subscription.status === "ACTIVE";
}

/**
 * Get subscription details for a shop
 * @param {string} shop - Shop domain
 * @returns {Promise<Object|null>} Subscription details or null
 */
export async function getSubscription(shop) {
  return await db.subscription.findUnique({
    where: { shop },
  });
}

/**
 * Cancel a subscription
 * @param {Object} request - The request object
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelSubscription(request) {
  const { admin, session } = await authenticate.admin(request);

  const subscription = await db.subscription.findUnique({
    where: { shop: session.shop },
  });

  if (!subscription) {
    throw new Error("No subscription found");
  }

  const mutation = `
    mutation CancelSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: { id: subscription.subscriptionId },
  });
  const data = await response.json();

  if (data.data?.appSubscriptionCancel?.userErrors?.length > 0) {
    throw new Error(
      data.data.appSubscriptionCancel.userErrors
        .map((e) => e.message)
        .join(", ")
    );
  }

  // Update subscription status in database
  await db.subscription.update({
    where: { shop: session.shop },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  return {
    success: true,
    subscription: data.data?.appSubscriptionCancel?.appSubscription,
  };
}

/**
 * Sync subscription status from Shopify
 * @param {Object} request - The request object
 * @returns {Promise<Object>} Updated subscription
 */
export async function syncSubscriptionStatus(request) {
  const { admin, session } = await authenticate.admin(request);

  const subscription = await db.subscription.findUnique({
    where: { shop: session.shop },
  });

  if (!subscription) {
    return null;
  }

  const query = `
    query GetSubscription($id: ID!) {
      appSubscription(id: $id) {
        id
        status
        currentPeriodEnd
        lineItems {
          plan {
            ... on AppRecurringPricing {
              price {
                amount
                currencyCode
              }
              interval
            }
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query, {
    variables: { id: subscription.subscriptionId },
  });
  const data = await response.json();

  const shopifySubscription = data.data?.appSubscription;

  if (shopifySubscription) {
    const updated = await db.subscription.update({
      where: { shop: session.shop },
      data: {
        status: shopifySubscription.status,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  return subscription;
}

