import { useSubmit, useActionData, useNavigation, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query checkDiscount {
      shopifyFunctions(first: 10) { nodes { id title } }
      discountNodes(first: 50, query: "status:active") {
        nodes { id discount { ... on DiscountAutomaticApp { title } } }
      }
    }
  `);
  
  const resJson = await response.json();
  const functions = resJson.data?.shopifyFunctions?.nodes || [];
  const discounts = resJson.data?.discountNodes?.nodes || [];
  
  const ourFunction = functions.find(f => f.title === "member-price-discount");
  const activeDiscountNode = discounts.find(d => d.discount?.title === "IMANist Member Special Price");

  // In the new template, we return raw objects instead of using the json() helper
  return { 
    isActive: !!activeDiscountNode, 
    discountId: activeDiscountNode?.id || null,
    functionId: ourFunction?.id || null 
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const functionId = formData.get("functionId");
  const discountId = formData.get("discountId");

  try {
    if (actionType === "activate") {
      const response = await admin.graphql(`
        mutation create($functionId: String!) {
          discountAutomaticAppCreate(automaticAppDiscount: {
            title: "IMANist Member Special Price",
            functionId: $functionId,
            startsAt: "${new Date().toISOString()}",
            discountClasses: [PRODUCT]
          }) { 
            userErrors { field message } 
            automaticAppDiscount { discountId }
          }
        }`, { variables: { functionId } });

      const resJson = await response.json();
      const errors = resJson.data?.discountAutomaticAppCreate?.userErrors;
      
      if (errors && errors.length > 0) {
        return { error: errors[0].message };
      }
      return { success: true, message: "Member pricing activated!" };
    }

    if (actionType === "deactivate") {
      const response = await admin.graphql(`
        mutation delete($id: ID!) {
          discountAutomaticDelete(id: $id) { 
            userErrors { field message } 
          }
        }`, { variables: { id: discountId } });

      const resJson = await response.json();
      const errors = resJson.data?.discountAutomaticDelete?.userErrors;

      if (errors && errors.length > 0) {
        return { error: errors[0].message };
      }
      return { success: true, message: "Member pricing deactivated." };
    }
  } catch (err) {
    return { error: "Database connection failed. Ensure Railway Postgres is Online." };
  }
  return null;
};

export default function Index() {
  const { isActive, functionId, discountId } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const nav = useNavigation();
  
  const isLoading = nav.state !== "idle";
  const [showBanner, setShowBanner] = useState(false);

  // Manage temporary success/error feedback
  useEffect(() => {
    if (actionData?.success || actionData?.error) {
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const handleToggle = () => {
    submit(
      { 
        actionType: isActive ? 'deactivate' : 'activate', 
        functionId: functionId || "", 
        discountId: discountId || "" 
      }, 
      { method: "post" }
    );
  };

  return (
    <s-page heading="IMANist Member Pricing Dashboard">
      
      {/* 1. Status Banners */}
      {showBanner && actionData?.error && (
        <s-banner tone="critical" title="Action Failed">
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-banner>
      )}

      {showBanner && actionData?.success && (
        <s-banner tone="success" title="Success">
          <s-paragraph>{actionData.message}</s-paragraph>
        </s-banner>
      )}

      <s-banner tone={isActive ? "info" : "warning"}>
        <s-paragraph>
          {isActive 
            ? "Your member pricing logic is live. Logged-in IMANist members will now see updated prices in their cart." 
            : "The system is currently paused. Retail prices will be shown to all customers."}
        </s-paragraph>
      </s-banner>

      {/* 2. System Health */}
      <s-section heading="System Health">
        <s-unordered-list>
          <s-list-item>
            <strong>Function Status:</strong> {functionId ? "✅ Connected" : "❌ Extension Missing"}
          </s-list-item>
          <s-list-item>
            <strong>App Status:</strong> {isActive ? "🟢 Live" : "⚪ Offline"}
          </s-list-item>
          <s-list-item>
            <strong>Target Audience:</strong> Customers with <em>imanist_loyalty_enrolled_date</em>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {/* 3. Main Control */}
      <s-section heading="App Control">
        <s-paragraph>
          Use the button below to toggle the price-swapping logic across your store.
        </s-paragraph>
        
        <s-button 
          variant="primary"
          tone={isActive ? "critical" : "primary"}
          disabled={isLoading || (!functionId && !isActive)}
          onClick={handleToggle}
        >
          {isLoading ? 'Processing...' : (isActive ? 'Deactivate' : 'Activate')}
        </s-button>
      </s-section>

      {/* 4. Setup Checklist Sidebar */}
      <s-section slot="aside" heading="Setup Checklist">
        <s-paragraph>Ensure these are configured for the logic to trigger:</s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>Product:</strong> Add <em>member_price</em> (Money type).
          </s-list-item>
          <s-list-item>
            <strong>Customer:</strong> Fill the <em>Enrolled Date</em>.
          </s-list-item>
          <s-list-item>
            <strong>Storefront:</strong> Members must be <strong>logged in</strong>.
          </s-list-item>
        </s-unordered-list>
        <s-paragraph style={{ marginTop: '20px' }}>
          Need help? <s-link href="/app/additional">View Documentation</s-link>
        </s-paragraph>
      </s-section>

    </s-page>
  );
}