// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const customer = input.cart.buyerIdentity?.customer;
  // Use the alias if you updated your GraphQL, otherwise use .metafield
  const isIMANist = customer?.metafield?.value != null;

  if (!isIMANist) return EMPTY_DISCOUNT;

  const discounts = input.cart.lines
    .map((line) => {
      if (line.merchandise.__typename !== "ProductVariant") return null;

      const variant = line.merchandise;
      const memberPriceMeta = variant.product?.metafield?.value;

      if (!memberPriceMeta) return null;

      let memberPrice;
      try {
        const parsed = JSON.parse(memberPriceMeta);
        memberPrice = parseFloat(parsed.amount);
      } catch (e) {
        memberPrice = parseFloat(memberPriceMeta);
      }

      // Calculate the discount for the ENTIRE line
      const regularPrice = parseFloat(line.cost.totalAmount.amount) / line.quantity;
      const unitDiscount = regularPrice - memberPrice;

      // Multiply by quantity so it stays RM 600 per item
      const totalLineDiscount = unitDiscount * line.quantity;

      if (totalLineDiscount > 0) {
        return {
          targets: [{ productVariant: { id: variant.id } }],
          value: { 
            fixedAmount: { amount: totalLineDiscount.toFixed(2) } 
          },
    message: "IMANist Member Price"
  };
}
      return null;
    })
    .filter(Boolean);

  // 1. Ensure discounts is treated as a clean array of valid discount objects
  const finalDiscounts = discounts.filter((d) => d !== null);

  if (finalDiscounts.length === 0) return EMPTY_DISCOUNT;

  return {
    discounts: finalDiscounts, // Use the cleaned array here
    discountApplicationStrategy: DiscountApplicationStrategy.First,
  };
}