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
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const customer = input.cart.buyerIdentity?.customer;

  const isMember = !!customer; // Must have an account and be logged in
  if (!isMember) return EMPTY_DISCOUNT;

  const discounts = input.cart.lines
    .map((line) => {
      const variant = line.merchandise.__typename === "ProductVariant" ? line.merchandise : null;
      const memberPriceRaw = variant?.product?.metafield?.value;

      if (!memberPriceRaw) return null;

      try {
        const memberPriceData = JSON.parse(memberPriceRaw);
        const memberPricePerUnit = parseFloat(memberPriceData.amount);
        const currentTotal = parseFloat(line.cost.totalAmount.amount);

        const memberTotal = memberPricePerUnit * line.quantity;
        const discountValue = currentTotal - memberTotal;

        if (discountValue <= 0.01) return null;

        return {
          // Now that you added 'id' to the graphql, this will work!
          targets: [{ cartLine: { id: line.id } }],
          value: {
            fixedAmount: {
              amount: discountValue.toFixed(2)
            }
          },
          message: "IMANist Member Price"
        };
      } catch (e) {
        return null;
      }
    })
    .filter((d) => d !== null);

  if (!discounts.length) return EMPTY_DISCOUNT;

  return {
    discounts,
    // @ts-ignore
    discountApplicationStrategy: "ALL",
  };
}