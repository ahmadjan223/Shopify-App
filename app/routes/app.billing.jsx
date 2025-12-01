import { useState, useEffect } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getSubscription,
  hasActiveSubscription,
  syncSubscriptionStatus,
} from "../billing.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const subscription = await getSubscription(session.shop);
  const isActive = await hasActiveSubscription(session.shop);

  // Sync subscription status from Shopify
  if (subscription) {
    await syncSubscriptionStatus(request);
  }

  return {
    subscription: subscription
      ? {
          ...subscription,
          isActive,
        }
      : null,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "create") {
    const planName = formData.get("planName") || "Basic";
    const price = formData.get("price") || "9.99";
    const currency = formData.get("currency") || "USD";

    const { createSubscription } = await import("../billing.server");
    const result = await createSubscription(
      request,
      planName,
      price,
      currency
    );

    if (result.confirmationUrl) {
      return {
        success: true,
        confirmationUrl: result.confirmationUrl,
      };
    }

    return {
      success: true,
      message: "Subscription is already active",
    };
  }

  if (actionType === "cancel") {
    const { cancelSubscription } = await import("../billing.server");
    try {
      await cancelSubscription(request);
      return {
        success: true,
        message: "Subscription cancelled successfully",
      };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  return { error: "Invalid action" };
};

export default function Billing() {
  const { subscription } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const [planName, setPlanName] = useState("Basic");
  const [price, setPrice] = useState("9.99");

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      // Redirect to Shopify's confirmation page
      window.location.href = fetcher.data.confirmationUrl;
    } else if (fetcher.data?.success && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
      if (fetcher.data.message.includes("cancelled")) {
        navigate("/app");
      }
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify, navigate]);

  const handleSubscribe = () => {
    const formData = new FormData();
    formData.append("actionType", "create");
    formData.append("planName", planName);
    formData.append("price", price);
    formData.append("currency", "USD");
    fetcher.submit(formData, { method: "POST" });
  };

  const handleCancel = () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You'll lose access to all features."
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.append("actionType", "cancel");
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="Subscription & Billing">
      <s-section heading="Manage Your Subscription">
        <s-stack direction="block" gap="base">
          {subscription?.isActive ? (
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-text emphasis="strong">Current Subscription</s-text>
                <s-stack direction="block" gap="tight">
                  <s-text>
                    <strong>Plan:</strong> {subscription.planName}
                  </s-text>
                  <s-text>
                    <strong>Price:</strong> ${subscription.price}{" "}
                    {subscription.currency} / month
                  </s-text>
                  <s-text>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: "green" }}>Active</span>
                  </s-text>
                  {subscription.trialEndsAt && (
                    <s-text>
                      <strong>Trial Ends:</strong>{" "}
                      {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </s-text>
                  )}
                </s-stack>
                <s-button
                  onClick={handleCancel}
                  variant="secondary"
                  disabled={fetcher.state === "submitting"}
                >
                  Cancel Subscription
                </s-button>
              </s-stack>
            </s-box>
          ) : (
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-text emphasis="strong">Subscribe to Continue</s-text>
                <s-paragraph>
                  To use this app, you need an active subscription. Choose your
                  plan below.
                </s-paragraph>

                <s-stack direction="block" gap="tight">
                  <s-text emphasis="strong">Select Plan:</s-text>
                  <select
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      width: "100%",
                    }}
                  >
                    <option value="Basic">Basic - $9.99/month</option>
                    <option value="Pro">Pro - $19.99/month</option>
                    <option value="Enterprise">Enterprise - $49.99/month</option>
                  </select>
                </s-stack>

                <s-stack direction="block" gap="tight">
                  <s-text emphasis="strong">Price (USD):</s-text>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="9.99"
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      width: "100%",
                    }}
                  />
                </s-stack>

                <s-button
                  onClick={handleSubscribe}
                  variant="primary"
                  disabled={fetcher.state === "submitting"}
                  {...(fetcher.state === "submitting"
                    ? { loading: true }
                    : {})}
                >
                  Subscribe Now
                </s-button>
              </s-stack>
            </s-box>
          )}

          {subscription && !subscription.isActive && (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="warning-subdued"
            >
              <s-text emphasis="strong">Subscription Status: {subscription.status}</s-text>
              <s-paragraph>
                Your subscription is not active. Please subscribe to continue
                using the app.
              </s-paragraph>
            </s-box>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

