import { useState, useEffect } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { hasActiveSubscription } from "../billing.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Check if shop has an active subscription
  const isSubscribed = await hasActiveSubscription(session.shop);
  
  if (!isSubscribed) {
    // Return subscription status to show upgrade message
    return {
      requiresSubscription: true,
      collections: [],
      tags: [],
    };
  }

  // Fetch collections
  const collectionsResponse = await admin.graphql(`
    {
      collections(first: 250) {
        nodes {
          id
          title
        }
      }
    }
  `);
  const collectionsData = await collectionsResponse.json();

  // Fetch all unique tags from products
  const productsResponse = await admin.graphql(`
    {
      products(first: 250) {
        nodes {
          tags
        }
      }
    }
  `);
  const productsData = await productsResponse.json();
  
  // Extract unique tags
  const allTags = new Set();
  productsData.data?.products?.nodes?.forEach((product) => {
    product.tags?.forEach((tag) => allTags.add(tag));
  });

  return {
    collections: collectionsData.data?.collections?.nodes || [],
    tags: Array.from(allTags).sort(),
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const scope = formData.get("scope");
  const percentage = parseFloat(formData.get("percentage"));
  const actionType = formData.get("actionType"); // "increase" or "decrease"
  const collectionId = formData.get("collectionId");
  const tag = formData.get("tag");

  if (!percentage || percentage <= 0) {
    return { error: "Please enter a valid percentage" };
  }

  let products = [];
  let hasNextPage = true;
  let cursor = null;

  // Fetch products based on scope
  while (hasNextPage) {
    let query;
    
    if (scope === "all") {
      query = `
        query GetProducts($cursor: String) {
          products(first: 250, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              variants(first: 100) {
                nodes {
                  id
                  price
                }
              }
            }
          }
        }
      `;
    } else if (scope === "collection" && collectionId) {
      query = `
        query GetCollectionProducts($collectionId: ID!, $cursor: String) {
          collection(id: $collectionId) {
            products(first: 250, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                variants(first: 100) {
                  nodes {
                    id
                    price
                  }
                }
              }
            }
          }
        }
      `;
    } else if (scope === "tag" && tag) {
      query = `
        query GetTaggedProducts($tag: String!, $cursor: String) {
          products(first: 250, after: $cursor, query: $tag) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              variants(first: 100) {
                nodes {
                  id
                  price
                }
              }
            }
          }
        }
      `;
    } else {
      return { error: "Invalid scope or missing parameters" };
    }

    const variables = scope === "collection" 
      ? { collectionId, cursor }
      : scope === "tag"
      ? { tag: `tag:${tag}`, cursor }
      : { cursor };

    const response = await admin.graphql(query, { variables });
    const data = await response.json();

    if (scope === "collection") {
      const collectionProducts = data.data?.collection?.products;
      if (collectionProducts) {
        products.push(...collectionProducts.nodes);
        hasNextPage = collectionProducts.pageInfo.hasNextPage;
        cursor = collectionProducts.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    } else {
      const fetchedProducts = data.data?.products;
      if (fetchedProducts) {
        products.push(...fetchedProducts.nodes);
        hasNextPage = fetchedProducts.pageInfo.hasNextPage;
        cursor = fetchedProducts.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    }
  }

  if (products.length === 0) {
    return { error: "No products found for the selected scope" };
  }

  // Prepare bulk update operations
  const operations = [];
  let updatedCount = 0;

  for (const product of products) {
    const variants = product.variants?.nodes || [];
    if (variants.length === 0) continue;

    const variantUpdates = variants.map((variant) => {
      const currentPrice = parseFloat(variant.price);
      if (isNaN(currentPrice) || currentPrice <= 0) return null;

      let newPrice;
      if (actionType === "increase") {
        newPrice = currentPrice * (1 + percentage / 100);
      } else {
        newPrice = currentPrice * (1 - percentage / 100);
      }

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100;

      return {
        id: variant.id,
        price: newPrice.toFixed(2),
      };
    }).filter(Boolean);

    if (variantUpdates.length > 0) {
      operations.push({
        productId: product.id,
        variants: variantUpdates,
      });
      updatedCount += variantUpdates.length;
    }
  }

  // Execute bulk updates in batches
  const batchSize = 10;
  const errors = [];

  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    
    for (const operation of batch) {
      try {
        const mutation = `
          mutation UpdateProductVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              productVariants {
                id
                price
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const response = await admin.graphql(mutation, {
          variables: {
            productId: operation.productId,
            variants: operation.variants,
          },
        });

        const result = await response.json();
        const userErrors = result.data?.productVariantsBulkUpdate?.userErrors || [];
        
        if (userErrors.length > 0) {
          errors.push(...userErrors);
        }
      } catch (error) {
        errors.push({ message: error.message });
      }
    }
  }

  return {
    success: true,
    updatedCount,
    totalProducts: products.length,
    errors: errors.length > 0 ? errors : undefined,
  };
};

export default function Index() {
  const { collections, tags, requiresSubscription } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const [scope, setScope] = useState("all");
  const [percentage, setPercentage] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  const isLoading = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(
        `Successfully updated ${fetcher.data.updatedCount} variants across ${fetcher.data.totalProducts} products!`
      );
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  // Show subscription required message if not subscribed
  if (requiresSubscription) {
    return (
      <s-page heading="Price Adjustment Tool">
        <s-section heading="Subscription Required">
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="warning-subdued"
          >
            <s-stack direction="block" gap="base">
              <s-text emphasis="strong">
                Active Subscription Required
              </s-text>
              <s-paragraph>
                To use this app, you need an active subscription. Please
                subscribe to continue.
              </s-paragraph>
              <s-button
                onClick={() => navigate("/app/billing")}
                variant="primary"
              >
                Subscribe Now
              </s-button>
            </s-stack>
          </s-box>
        </s-section>
      </s-page>
    );
  }

  const handleSubmit = (actionType) => {
    if (!percentage || parseFloat(percentage) <= 0) {
      shopify.toast.show("Please enter a valid percentage", { isError: true });
      return;
    }

    if (scope === "collection" && !collectionId) {
      shopify.toast.show("Please select a collection", { isError: true });
      return;
    }

    if (scope === "tag" && !selectedTag) {
      shopify.toast.show("Please select a tag", { isError: true });
      return;
    }

    const formData = new FormData();
    formData.append("scope", scope);
    formData.append("percentage", percentage);
    formData.append("actionType", actionType);
    if (collectionId) formData.append("collectionId", collectionId);
    if (selectedTag) formData.append("tag", selectedTag);

    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="Price Adjustment Tool">
      <s-section heading="Adjust Product Prices">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-stack direction="block" gap="tight">
                <s-text emphasis="strong">Select Scope:</s-text>
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value);
                    setCollectionId("");
                    setSelectedTag("");
                  }}
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    width: "100%",
                  }}
                >
                  <option value="all">All Products</option>
                  <option value="collection">Products in Collection</option>
                  <option value="tag">Products with Tag</option>
                </select>
              </s-stack>

              {scope === "collection" && (
                <s-stack direction="block" gap="tight">
                  <s-text emphasis="strong">Select Collection:</s-text>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      width: "100%",
                    }}
                  >
                    <option value="">-- Select a collection --</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.title}
                      </option>
                    ))}
                  </select>
                </s-stack>
              )}

              {scope === "tag" && (
                <s-stack direction="block" gap="tight">
                  <s-text emphasis="strong">Select Tag:</s-text>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      width: "100%",
                    }}
                  >
                    <option value="">-- Select a tag --</option>
                    {tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </s-stack>
              )}

              <s-stack direction="block" gap="tight">
                <s-text emphasis="strong">Percentage:</s-text>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="Enter percentage (e.g., 10)"
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    width: "100%",
                  }}
                />
              </s-stack>

              <s-stack direction="inline" gap="base">
                <s-button
                  onClick={() => handleSubmit("increase")}
                  disabled={isLoading}
                  variant="primary"
                  {...(isLoading ? { loading: true } : {})}
                >
                  Increase Prices
                </s-button>
                <s-button
                  onClick={() => handleSubmit("decrease")}
                  disabled={isLoading}
                  variant="secondary"
                  {...(isLoading ? { loading: true } : {})}
                >
                  Decrease Prices
                </s-button>
              </s-stack>
            </s-stack>
          </s-box>

          {fetcher.data?.success && (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="success-subdued"
            >
              <s-text emphasis="strong">Update Complete!</s-text>
              <s-paragraph>
                Updated {fetcher.data.updatedCount} variants across{" "}
                {fetcher.data.totalProducts} products.
              </s-paragraph>
            </s-box>
          )}

          {fetcher.data?.errors && fetcher.data.errors.length > 0 && (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="critical-subdued"
            >
              <s-text emphasis="strong">Some errors occurred:</s-text>
              <s-unordered-list>
                {fetcher.data.errors.map((error, index) => (
                  <s-list-item key={index}>
                    {error.message || error.field}
                  </s-list-item>
                ))}
              </s-unordered-list>
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
