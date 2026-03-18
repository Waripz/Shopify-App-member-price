import { useSubmit, useActionData, useNavigation, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

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

  if (actionType === "activate") {
    await admin.graphql(`
      mutation create($functionId: String!) {
        discountAutomaticAppCreate(automaticAppDiscount: {
          title: "IMANist Member Special Price",
          functionId: $functionId,
          startsAt: "${new Date().toISOString()}",
          discountClasses: [PRODUCT]
        }) { userErrors { message } }
      }`, { variables: { functionId } });
    return { success: true };
  }

  if (actionType === "deactivate") {
    await admin.graphql(`
      mutation delete($id: ID!) {
        discountAutomaticDelete(id: $id) { userErrors { message } }
      }`, { variables: { id: discountId } });
    return { success: true };
  }
  return null;
};

export default function Index() {
  const { isActive, functionId, discountId } = useLoaderData();
  const submit = useSubmit();
  const actionData = useActionData();
  const nav = useNavigation();
  const isLoading = nav.state !== "idle";

  return (
    <s-page heading="IMANist Member Pricing Dashboard">
      
      {/* 1. Introductory Banner: Adds color and immediate status */}
      <s-banner tone={isActive ? "info" : "warning"}>
        <s-paragraph>
          {isActive 
            ? "Your member pricing logic is live. Logged-in IMANist members will now see updated prices in their cart." 
            : "The system is currently paused. Retail prices will be shown to all customers."}
        </s-paragraph>
      </s-banner>

      {/* 2. Configuration Health: Makes the app feel "Smart" */}
      <s-section heading="System Health">
        <s-unordered-list>
          <s-list-item>
            <strong>Function Status:</strong> {functionId ? "✅ Connected" : "❌ Extension Missing"}
          </s-list-item>
          <s-list-item>
            <strong>Type:</strong> Automatic Member Price Discount
          </s-list-item>
          <s-list-item>
            <strong>Target Audience:</strong> Customers with <em>imanist_loyalty_enrolled_date</em>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {/* 3. Main Control Section */}
      <s-section heading="App Control">
        <s-paragraph>
          Toggle the switch below to enable or disable the price-swapping logic across your entire store.
        </s-paragraph>
        
        <s-paragraph>
          Current Mode: <strong>{isActive ? 'Live' : 'Offline'}</strong>
        </s-paragraph>

        <s-button 
          variant="primary"
          tone={isActive ? "critical" : "primary"}
          disabled={isLoading || (!functionId && !isActive)}
          onClick={() => submit({ actionType: isActive ? 'deactivate' : 'activate', functionId, discountId }, { method: 'post' })}
        >
          {isLoading ? 'Processing...' : (isActive ? 'Deactivate' : 'Activate')}
        </s-button>
      </s-section>

      {/* 4. Aside Column: Best Practices & Links */}
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