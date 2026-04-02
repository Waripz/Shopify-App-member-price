export default function AdditionalPage() {
  return (
    <s-page heading="IMANist Member Pricing Architecture">
      
      {/* 1. Overview Section */}
      <s-section heading="Dual-Architecture Design">
        <s-paragraph>
          The <strong>IMANist Member Pricing</strong> system operates on a dual-architecture model to maximize Shopify OS 2.0 caching speed while guaranteeing financial security during checkout. 
          It consists of a <strong>Frontend Visual Layer</strong> and a <strong>Backend Checkout layer</strong>.
        </s-paragraph>
      </s-section>

      {/* 2. Frontend Breakdown */}
      <s-section heading="1. The Frontend Visuals (Theme App Extension)">
        <s-paragraph>
          Because Shopify's edge servers aggressively cache product pages and the homepage, dynamic pricing cannot be rendered purely in Liquid without breaking cache.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>Data Payload (member-price-embed.liquid):</strong><br/>
            Securely injects a JSON blob containing the current page's Member Prices, but <strong>only</strong> if <code>customer</code> is logged in. This prevents data scraping.
          </s-list-item>
          <s-list-item>
            <strong>DOM Injection (member-price-storefront.js):</strong><br/>
            Runs in the customer's browser. It reads the JSON payload and mathematically injects the red Member Price tags onto the screen. 
          </s-list-item>
          <s-list-item>
            <strong>Mathematical Protection:</strong><br/>
            The Javascript evaluates the metafield. If the Member Price is accidentally higher than the current sale price (or if there's a typo), the script ignores it and hides the badge automatically.
          </s-list-item>
          <s-list-item>
            <strong>Polling Optimization:</strong><br/>
            A smart 6-second polling interval ensures the badge survives AJAX interactions (like drawer carts) without needing heavy, lagging MutationObservers.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {/* 3. Backend Breakdown */}
      <s-section heading="2. The Backend Validation (Shopify Function)">
        <s-paragraph>
          The frontend Javascript is purely visual. The true financial transaction is verified natively by Shopify's servers during checkout via <code>run.js</code>.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>Step 1: Identity Verification</strong><br/>
            The system verifies the <code>buyerIdentity</code>. Absolutely any user who creates an account and logs in is granted access to the Member Price logic.
          </s-list-item>
          <s-list-item>
            <strong>Step 2: Price Calculation</strong><br/>
            For every item, it retrieves the true <code>custom.member_price</code> straight from the database. It compares this against the cart's current cost. 
          </s-list-item>
          <s-list-item>
            <strong>Step 3: Discount Competition</strong><br/>
            This Member Price <strong>competes</strong> with other product discounts (e.g., "BUY MORE SAVE MORE"). Shopify automatically picks whichever gives the customer a better deal. It <strong>stacks</strong> normally with order-level discounts (coupon codes) and shipping discounts.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {/* 4. Developer Reference */}
      <s-section heading="Developer Reference" slot="aside">
        <s-paragraph>
          <strong>Product Metafield:</strong><br/> <code>custom.member_price</code> (Money type, e.g., RM35.00)
        </s-paragraph>
        <s-paragraph>
          <strong>Customer Rule:</strong><br/> Must be actively logged into an account.
        </s-paragraph>
        <s-paragraph>
          <strong>Storefront Script:</strong><br/> <code>extensions/member-price-logic/assets/member-price-storefront.js</code>
        </s-paragraph>
        <s-paragraph>
          <strong>Checkout Script:</strong><br/> <code>extensions/member-price-discount/src/run.js</code>
        </s-paragraph>
        
        <s-divider />
        
        <s-paragraph style={{ marginTop: '15px' }}>
          <strong>ONLY FOR IMAN</strong><br/>
          Hanya untuk kegunaan E-commerce IMAN.
        </s-paragraph>
      </s-section>

    </s-page>
  );
}