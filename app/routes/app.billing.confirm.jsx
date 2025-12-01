import { useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { syncSubscriptionStatus } from "../billing.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Sync subscription status after confirmation
  await syncSubscriptionStatus(request);
  
  return {
    shop: session.shop,
  };
};

export default function BillingConfirm() {
  const { shop } = useLoaderData();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  useEffect(() => {
    shopify.toast.show("Subscription confirmed successfully!");
    // Redirect to main app after a short delay
    setTimeout(() => {
      navigate("/app");
    }, 2000);
  }, [shopify, navigate]);

  return (
    <s-page heading="Subscription Confirmed">
      <s-section>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-text emphasis="strong">Thank you for subscribing!</s-text>
          <s-paragraph>
            Your subscription has been confirmed. You now have full access to all
            features.
          </s-paragraph>
          <s-paragraph>
            Redirecting you to the app...
          </s-paragraph>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

