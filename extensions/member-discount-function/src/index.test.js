import { run } from "./index.js";
import { describe, it, expect } from "@jest/globals";

describe("Member Discount Function", () => {
  const baseInput = {
    shop: {
      metafield: {
        value: JSON.stringify({
          discountPercentage: 10,
          tagBased: false,
          memberTag: "member",
          enabledForAll: true,
        }),
      },
    },
    cart: {
      buyerIdentity: {
        customer: { id: "gid://shopify/Customer/1", tags: [] },
      },
      lines: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 1,
          merchandise: {
            price: { amount: "100.00", currencyCode: "USD" },
            product: {
              id: "gid://shopify/Product/1",
              title: "Test Product",
              metafield: null,
            },
          },
        },
      ],
    },
  };

  it("applies global discount to logged-in customer", () => {
    const result = run(baseInput);
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0].value.percentage.value).toBe("10");
    expect(result.discounts[0].message).toBe("Member Price");
  });

  it("returns no discount when customer is not logged in", () => {
    const input = {
      ...baseInput,
      cart: { ...baseInput.cart, buyerIdentity: { customer: null } },
    };
    const result = run(input);
    expect(result.discounts).toHaveLength(0);
  });

  it("returns no discount when customer lacks required tag (tag-based mode)", () => {
    const input = {
      ...baseInput,
      shop: {
        metafield: {
          value: JSON.stringify({
            discountPercentage: 10,
            tagBased: true,
            memberTag: "member",
            enabledForAll: false,
          }),
        },
      },
      cart: {
        ...baseInput.cart,
        buyerIdentity: {
          customer: { id: "gid://shopify/Customer/2", tags: ["regular"] },
        },
      },
    };
    const result = run(input);
    expect(result.discounts).toHaveLength(0);
  });

  it("applies discount when customer has required member tag", () => {
    const input = {
      ...baseInput,
      shop: {
        metafield: {
          value: JSON.stringify({
            discountPercentage: 20,
            tagBased: true,
            memberTag: "vip",
            enabledForAll: false,
          }),
        },
      },
      cart: {
        ...baseInput.cart,
        buyerIdentity: {
          customer: { id: "gid://shopify/Customer/3", tags: ["VIP"] },
        },
      },
    };
    const result = run(input);
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0].value.percentage.value).toBe("20");
  });

  it("uses per-product member price metafield over global discount", () => {
    const input = {
      ...baseInput,
      cart: {
        ...baseInput.cart,
        lines: [
          {
            id: "gid://shopify/CartLine/2",
            quantity: 1,
            merchandise: {
              price: { amount: "100.00", currencyCode: "USD" },
              product: {
                id: "gid://shopify/Product/2",
                title: "Product with custom member price",
                metafield: { value: "75.00" },
              },
            },
          },
        ],
      },
    };
    const result = run(input);
    expect(result.discounts).toHaveLength(1);
    // 100 -> 75 = 25% discount
    expect(parseFloat(result.discounts[0].value.percentage.value)).toBeCloseTo(
      25,
      0
    );
  });

  it("returns no discount when no lines are present", () => {
    const input = {
      ...baseInput,
      cart: { ...baseInput.cart, lines: [] },
    };
    const result = run(input);
    expect(result.discounts).toHaveLength(0);
  });

  it("uses default config when metafield is missing", () => {
    const input = {
      ...baseInput,
      shop: { metafield: null },
    };
    const result = run(input);
    // Default config: enabledForAll=true, 10% discount
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0].value.percentage.value).toBe("10");
  });
});
