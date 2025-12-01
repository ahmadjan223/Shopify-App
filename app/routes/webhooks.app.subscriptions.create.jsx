import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Handle subscription creation/update
  const subscription = payload;

  if (subscription) {
    // Find shop by subscription ID or shop domain
    const existingSubscription = await db.subscription.findFirst({
      where: {
        OR: [
          { subscriptionId: subscription.id },
          { shop: shop },
        ],
      },
    });

    if (existingSubscription) {
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: subscription.status || "PENDING",
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new subscription record
      await db.subscription.create({
        data: {
          shop: shop,
          subscriptionId: subscription.id,
          status: subscription.status || "PENDING",
          planName: subscription.name || "Basic",
          price: subscription.lineItems?.[0]?.plan?.appRecurringPricingDetails?.price?.amount?.toString() || "0",
          currency: subscription.lineItems?.[0]?.plan?.appRecurringPricingDetails?.price?.currencyCode || "USD",
        },
      });
    }
  }

  return new Response();
};

