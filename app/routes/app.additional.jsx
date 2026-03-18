export default function AdditionalPage() {
  return (
    <s-page heading="What is member price & How it works">
      
      {/* 1. Overview Section */}
      <s-section heading="How the Logic Works">
        <s-paragraph>
          The <strong>IMANist Member Pricing</strong> system operates as a Shopify Function. It runs in the background 
          whenever a customer adds an item to their cart or reaches the checkout.
        </s-paragraph>
        
        <s-paragraph>
          The process follows a strict 5-step validation pipeline to ensure discounts are only granted to legitimate members.
        </s-paragraph>
      </s-section>

      {/* 2. Step-by-Step Breakdown */}
      <s-section heading="The Execution Pipeline">
        <s-unordered-list>
          <s-list-item>
            <strong>Step 1: Identity Verification</strong><br/>
            The system checks <code>buyerIdentity</code>. If the customer is not logged in, the logic stops immediately.
          </s-list-item>
          <s-list-item>
            <strong>Step 2: Metafield Gatekeeper</strong><br/>
            It looks for the <code>custom.imanist_loyalty_enrolled_date</code> metafield on the customer profile. No date means no discount.
          </s-list-item>
          <s-list-item>
            <strong>Step 3: Product Scanning</strong><br/>
            The system scans all items in the cart for a <code>custom.member_price</code> metafield.
          </s-list-item>
          <s-list-item>
            <strong>Step 4: Price Calculation</strong><br/>
            If a member price exists, the system performs the following math:<br/>
            <code>(Retail Price - Member Price) × Quantity = Total Discount</code>
          </s-list-item>
          <s-list-item>
            <strong>Step 5: Automatic Application</strong><br/>
            The total difference is applied as an automatic discount labeled <strong>"IMANist Member Price"</strong>.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {/* 3. Technical Reference for Legacy */}
      <s-section heading="Developer Reference" slot="aside">
        <s-paragraph>
          <strong>Namespace:</strong> <code>custom</code><br/>
          <strong>Customer Key:</strong> <code>imanist_loyalty_enrolled_date</code><br/>
          <strong>Product Key:</strong> <code>member_price</code>
        </s-paragraph>
        
        <s-divider />
        
        <s-paragraph style={{ marginTop: '15px' }}>
          <strong>ONLY FOR IMAN</strong><br/>
          Hanya untuk kegunaan E-commerce IMAN onleh
        </s-paragraph>
      </s-section>

    </s-page>
  );
}