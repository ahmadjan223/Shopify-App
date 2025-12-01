import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Handle subscription update
  const subscription = payload;

  if (subscription) {
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
          status: subscription.status || existingSubscription.status,
          updatedAt: new Date(),
          cancelledAt: subscription.status === "CANCELLED" ? new Date() : existingSubscription.cancelledAt,
        },
      });
    }
  }

  return new Response();
};

