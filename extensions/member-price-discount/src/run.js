// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/** @type {FunctionRunResult} */
const EMPTY_DISCOUNT = {
  discounts: [],
  // @ts-ignore
  discountApplicationStrategy: "ALL",
};

/**
 * Parse the member price metafield value into a decimal number (e.g. 35.00).
 * Handles all Shopify metafield formats:
 *   - Money type: '{"amount":"35.00","currency_code":"MYR"}' → 35.00
 *   - Integer type (cents): '3500' → 35.00
 *   - Decimal string: '35.00' → 35.00
 * @param {string} raw - The raw metafield value string
 * @returns {number} The price as a decimal, or 0 if unparseable
 */
function parseMemberPrice(raw) {
  if (!raw) return 0;
  try {
    var parsed = JSON.parse(raw);

    // Money object: {"amount": "35.00", "currency_code": "MYR"}
    if (typeof parsed === 'object' && parsed !== null && parsed.amount) {
      var amt = parseFloat(parsed.amount);
      return isNaN(amt) ? 0 : amt;
    }

    // Integer (cents): 3500 → 35.00
    if (typeof parsed === 'number') {
      return parsed / 100;
    }

    // Plain decimal string that JSON.parse kept as string (rare)
    if (typeof parsed === 'string') {
      var val = parseFloat(parsed);
      return isNaN(val) ? 0 : val;
    }
  } catch (e) {
    // JSON.parse failed — try direct parseFloat as last resort
    var fallback = parseFloat(raw);
    return isNaN(fallback) ? 0 : fallback;
  }
  return 0;
}

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  var customer = input.cart.buyerIdentity?.customer;

  // Gate: must be logged in with an account
  if (!customer) return EMPTY_DISCOUNT;

  var discounts = input.cart.lines
    .map(function (line) {
      var variant = line.merchandise.__typename === "ProductVariant" ? line.merchandise : null;
      var memberPriceRaw = variant?.product?.metafield?.value;

      if (!memberPriceRaw) return null;

      var memberPricePerUnit = parseMemberPrice(memberPriceRaw);
      if (memberPricePerUnit <= 0) return null;

      var currentTotal = parseFloat(line.cost.totalAmount.amount);
      var memberTotal = memberPricePerUnit * line.quantity;
      var discountValue = currentTotal - memberTotal;

      // Only apply if discount saves at least 1 cent
      if (discountValue < 0.01) return null;

      return {
        targets: [{ cartLine: { id: line.id } }],
        value: {
          fixedAmount: {
            amount: discountValue.toFixed(2)
          }
        },
        message: "IMANist Member Price"
      };
    })
    .filter(function (d) { return d !== null; });

  if (!discounts.length) return EMPTY_DISCOUNT;

  return {
    discounts: discounts,
    // @ts-ignore — ALL ensures every cart line with a member price gets its own discount
    discountApplicationStrategy: "ALL",
  };
}