/**
 * member-price.js
 * Client-side script for the Member Price theme extension.
 *
 * Dynamically updates displayed member prices when the selected
 * product variant changes, so the member price always matches the
 * currently selected variant.
 */

(function () {
  "use strict";

  const MEMBER_PRICE_SELECTOR = "[data-member-price-container]";
  const BLOCK_SELECTOR = ".member-price-block";

  /**
   * Format a price in cents to a display string using Shopify's currency.
   * @param {number} priceCents - Price in cents
   * @returns {string}
   */
  function formatMoney(priceCents) {
    const amount = (priceCents / 100).toFixed(2);
    const symbol =
      window.Shopify?.currency?.active
        ? ""
        : "$"; // Shopify will handle currency display via the theme
    return symbol + amount;
  }

  /**
   * Update the member price display when a variant is selected.
   * @param {Object} variant - Shopify variant object from variant change event
   * @param {number} discountPct - Discount percentage (fallback)
   */
  function updateMemberPriceDisplay(variant, discountPct) {
    const containers = document.querySelectorAll(MEMBER_PRICE_SELECTOR);
    const blocks = document.querySelectorAll(BLOCK_SELECTOR + "--active");

    const allElements = [...containers, ...blocks];
    if (allElements.length === 0) return;

    const regularPrice = variant.price; // in cents
    const memberPriceEl = document.querySelector(
      ".member-price-block__amount, .member-price__amount"
    );
    const savingsEl = document.querySelector(".member-price-block__savings");
    const regularEl = document.querySelector(".member-price-block__regular");

    if (!memberPriceEl) return;

    // Calculate member price: use variant metafield if available,
    // otherwise fall back to global discount percentage
    let memberPrice;
    if (variant.metafields && variant.metafields.member_price) {
      memberPrice = Math.round(
        parseFloat(variant.metafields.member_price.price) * 100
      );
    } else {
      memberPrice = Math.round(regularPrice * (1 - discountPct / 100));
    }

    memberPriceEl.textContent = formatMoney(memberPrice);

    if (savingsEl) {
      const savings = regularPrice - memberPrice;
      const regularChildEl = savingsEl.querySelector(".member-price-block__regular");
      if (savings > 0 && regularChildEl) {
        savingsEl.style.display = "";
        regularChildEl.textContent = "(" + formatMoney(regularPrice) + ")";
      } else {
        savingsEl.style.display = "none";
      }
    }
  }

  /**
   * Listen for Shopify variant change events dispatched by the theme.
   * Most modern Shopify themes dispatch a 'variant:changed' custom event.
   */
  document.addEventListener("variant:changed", function (event) {
    const variant = event?.detail?.variant;
    if (!variant) return;
    const discountPct =
      parseInt(
        document
          .querySelector("[data-member-discount-pct]")
          ?.getAttribute("data-member-discount-pct") || "10",
        10
      );
    updateMemberPriceDisplay(variant, discountPct);
  });

  // Also handle the older Shopify.onProductVariantChange approach
  if (window.Shopify) {
    const originalOnVariantChange = window.Shopify.onProductVariantChange;
    window.Shopify.onProductVariantChange = function (data) {
      if (data?.variant) {
        const discountPct =
          parseInt(
            document
              .querySelector("[data-member-discount-pct]")
              ?.getAttribute("data-member-discount-pct") || "10",
            10
          );
        updateMemberPriceDisplay(data.variant, discountPct);
      }
      if (typeof originalOnVariantChange === "function") {
        originalOnVariantChange(data);
      }
    };
  }
})();
