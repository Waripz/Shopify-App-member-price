/**
 * Member Discount Shopify Function
 *
 * This function runs at checkout and applies a member discount to eligible
 * customers (logged-in users, or users with a specific tag).
 *
 * Input: CartTransform input from Shopify including customer and line items.
 * Output: FunctionResult with discount targets and percentage values.
 */

const MEMBER_PRICE_NAMESPACE = "member_price";
const MEMBER_PRICE_KEY = "price";
const CONFIG_NAMESPACE = "$app:member-price-config";
const CONFIG_KEY = "config";
const NO_DISCOUNT = { discounts: [], discountApplicationStrategy: "FIRST" };

/**
 * Main function entry point — called by Shopify at checkout.
 * @param {Object} input - The function input from Shopify
 * @returns {Object} FunctionResult
 */
export function run(input) {
  // 1. Check if a customer is logged in
  const customer = input?.cart?.buyerIdentity?.customer;
  if (!customer) {
    // No customer logged in — no member discount
    return NO_DISCOUNT;
  }

  // 2. Load configuration from app metafields
  const configMetafield = input?.shop?.metafield;
  let config = {
    discountPercentage: 10,
    tagBased: false,
    memberTag: "member",
    enabledForAll: true,
  };

  if (configMetafield?.value) {
    try {
      const parsed = JSON.parse(configMetafield.value);
      config = { ...config, ...parsed };
    } catch {
      // Use defaults if config is malformed
    }
  }

  // 3. Check if customer qualifies for member pricing
  const customerTags = customer.tags || [];
  const isTagMember = config.tagBased
    ? customerTags.some(
        (tag) => tag.toLowerCase() === config.memberTag.toLowerCase()
      )
    : false;

  const qualifiesForDiscount =
    config.enabledForAll || (config.tagBased && isTagMember);

  if (!qualifiesForDiscount) {
    return NO_DISCOUNT;
  }

  // 4. Build discount targets for each line item
  const targets = [];
  const discountPerLineItem = [];

  for (const line of input?.cart?.lines ?? []) {
    const product = line?.merchandise?.product;
    if (!product) continue;

    // Check for a per-product member price metafield
    const memberPriceMetafield = product.metafield;

    if (memberPriceMetafield?.value) {
      // Per-product member price: calculate required discount percentage
      const memberPrice = parseFloat(memberPriceMetafield.value);
      const regularPrice = parseFloat(
        line?.merchandise?.price?.amount ?? "0"
      );
      if (regularPrice > 0 && memberPrice < regularPrice) {
        const discountPct =
          ((regularPrice - memberPrice) / regularPrice) * 100;
        targets.push({ cartLine: { id: line.id } });
        discountPerLineItem.push(Math.round(discountPct * 100) / 100);
      }
    } else if (config.discountPercentage > 0) {
      // Global discount applies
      targets.push({ cartLine: { id: line.id } });
      discountPerLineItem.push(config.discountPercentage);
    }
  }

  if (targets.length === 0) {
    return NO_DISCOUNT;
  }

  // 5. Group identical discounts together for efficiency
  // If all discounts are the same, use a single discount entry
  const uniquePercentages = [...new Set(discountPerLineItem)];
  if (uniquePercentages.length === 1) {
    return {
      discounts: [
        {
          targets,
          value: {
            percentage: { value: String(uniquePercentages[0]) },
          },
          message: "Member Price",
        },
      ],
      discountApplicationStrategy: "FIRST",
    };
  }

  // Mixed discounts: create one entry per unique percentage
  const discounts = uniquePercentages.map((pct) => {
    const lineTargets = targets.filter(
      (_, i) => discountPerLineItem[i] === pct
    );
    return {
      targets: lineTargets,
      value: {
        percentage: { value: String(pct) },
      },
      message: "Member Price",
    };
  });

  return {
    discounts,
    discountApplicationStrategy: "FIRST",
  };
}
