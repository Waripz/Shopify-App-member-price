import { useSubmit, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
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

  return json({ 
    isActive: !!activeDiscountNode, 
    discountId: activeDiscountNode?.id || null,
    functionId: ourFunction?.id || null 
  });
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
        return json({ error: errors[0].message });
      }
      return json({ success: true, message: "Discount activated successfully!" });
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
        return json({ error: errors[0].message });
      }
      return json({ success: true, message: "Discount deactivated." });
    }
  } catch (err) {
    return json({ error: "Server error. Please check Railway logs." });
  }
  return null;
};

export default function Index() {
  const { isActive, functionId, discountId } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const nav = useNavigation();
  
  // High-precision loading state
  const isLoading = nav.state !== "idle";
  const [showBanner, setShowBanner] = useState(false);

  // Trigger success/error banner visibility
  useEffect(() => {
    if (actionData?.success || actionData?.error) {
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const handleToggle = () => {
    const data = {
      actionType: isActive ? 'deactivate' : 'activate',
      functionId: functionId || "",
      discountId: discountId || "",
    };
    submit(data, { method: "post" });
  };

  return (
    <s-page heading="IMANist Member Pricing Dashboard">
      
      {/* 1. Dynamic Feedback Banner */}
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
            <strong>Current Status:</strong> {isActive ? "🟢 Active" : "⚪ Offline"}
          </s-list-item>
          <s-list-item>
            <strong>Target Audience:</strong> Customers with <em>imanist_loyalty_enrolled_date</em>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {/* 3. Main Control Section */}
      <s-section heading="App Control">
        <s-paragraph>
          Click the button below to toggle the price-swapping logic.
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

      {/* 4. Aside Checklist */}
      <s-section slot="aside" heading="Setup Checklist">
        <s-paragraph>Ensure these are configured:</s-paragraph>
        <s-unordered-list>
          <s-list-item><strong>Product:</strong> Metafield <em>member_price</em> added.</s-list-item>
          <s-list-item><strong>Customer:</strong> Metafield <em>Enrolled Date</em> filled.</s-list-item>
          <s-list-item><strong>Storefront:</strong> Use a test account to verify.</s-list-item>
        </s-unordered-list>
      </s-section>

    </s-page>
  );
}