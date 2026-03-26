/**
 * Member Price Storefront
 * Alters displayed prices for logged-in members on product & collection pages.
 */
(function () {
  'use strict';

  function init() {
    console.log('[MemberPrice] Init started');

    var cfgEl = document.getElementById('mp-config');
    if (!cfgEl) {
      console.log('[MemberPrice] No mp-config found, exiting');
      return;
    }

    var cfg;
    try { cfg = JSON.parse(cfgEl.textContent); } catch (e) {
      console.error('[MemberPrice] Config parse error:', e);
      return;
    }
    console.log('[MemberPrice] Config loaded:', cfg);

    // ——— Product page ———
    var prodEl = document.getElementById('mp-product');
    if (prodEl) {
      console.log('[MemberPrice] Product data found');
      try {
        var prodData = JSON.parse(prodEl.textContent);
        console.log('[MemberPrice] Product data:', prodData);
        handleProduct(prodData, cfg);
      } catch (e) {
        console.error('[MemberPrice] Product data parse error:', e);
      }
    }

    // ——— Collection / Search page ———
    var listEl = document.getElementById('mp-listing');
    if (listEl) {
      console.log('[MemberPrice] Listing data found');
      try {
        var listData = JSON.parse(listEl.textContent);
        console.log('[MemberPrice] Listing data:', listData);
        handleListing(listData, cfg);
      } catch (e) {
        console.error('[MemberPrice] Listing data parse error:', e);
      }
    }
  }

  /* ————————————————————————————
     Format money value
  ———————————————————————————— */
  function formatMoney(value) {
    // value could be:
    // 1. A money object: { "amount": "25.50", "currency_code": "MYR" }
    // 2. A string: "25.50"
    // 3. A number: 2550 (cents)
    var amount;
    var currency = 'RM';

    if (typeof value === 'object' && value !== null) {
      amount = parseFloat(value.amount);
      if (value.currency_code === 'MYR') currency = 'RM';
      else if (value.currency_code === 'USD') currency = '$';
      else currency = value.currency_code + ' ';
    } else if (typeof value === 'string') {
      amount = parseFloat(value);
    } else if (typeof value === 'number') {
      // Shopify prices are in cents
      amount = value / 100;
    }

    if (isNaN(amount)) return null;
    return currency + amount.toFixed(2);
  }

  /* ————————————————————————————
     Product Page
  ———————————————————————————— */
  function handleProduct(data, cfg) {
    var container = document.querySelector(cfg.pdpContainer);
    if (!container) {
      console.warn('[MemberPrice] PDP container not found:', cfg.pdpContainer);
      return;
    }

    var priceEl = container.querySelector(cfg.pdpPrice);
    if (!priceEl) {
      console.warn('[MemberPrice] PDP price element not found:', cfg.pdpPrice);
      return;
    }

    var memberFormatted = formatMoney(data.memberPrice);
    if (!memberFormatted) {
      console.warn('[MemberPrice] Could not format member price:', data.memberPrice);
      return;
    }

    console.log('[MemberPrice] Replacing PDP price with:', memberFormatted);

    var currentPrice = priceEl.textContent.trim();
    var compareEl = container.querySelector(cfg.pdpCompare);

    if (compareEl) {
      compareEl.textContent = currentPrice;
      compareEl.classList.add('mp-original');
      compareEl.style.display = '';
    } else {
      var newCompare = document.createElement('span');
      newCompare.textContent = currentPrice;
      newCompare.className = 'mp-original';
      newCompare.style.cssText = 'text-decoration:line-through;opacity:.55;margin-right:8px;';
      priceEl.parentNode.insertBefore(newCompare, priceEl);
    }

    priceEl.textContent = memberFormatted;
    priceEl.classList.add('mp-value');
    addBadge(container, cfg.badgeText);
  }

  /* ————————————————————————————
     Collection / Search Listing
  ———————————————————————————— */
  function handleListing(prices, cfg) {
    if (!prices || Object.keys(prices).length === 0) {
      console.log('[MemberPrice] No listing prices to apply');
      return;
    }

    var processed = [];
    var links = document.querySelectorAll('a[href*="/products/"]');
    console.log('[MemberPrice] Found', links.length, 'product links');

    for (var i = 0; i < links.length; i++) {
      var handle = extractHandle(links[i].getAttribute('href'));
      if (!handle || !prices[handle]) continue;

      var card = findCardWithPriceBox(links[i], cfg.colPriceBox);
      if (!card) continue;

      var priceBox = card.querySelector(cfg.colPriceBox);
      if (!priceBox || processed.indexOf(priceBox) !== -1) continue;
      processed.push(priceBox);

      var saleEl = priceBox.querySelector(cfg.colSalePrice);
      var oldEl = priceBox.querySelector(cfg.colOldPrice);

      var memberFormatted = formatMoney(prices[handle]);
      if (!memberFormatted) continue;

      if (saleEl) {
        var curPrice = saleEl.textContent.trim();
        if (oldEl) {
          oldEl.textContent = curPrice;
          oldEl.classList.add('mp-original');
          oldEl.style.display = '';
        }
        saleEl.textContent = memberFormatted;
        saleEl.classList.add('mp-value');
      }
    }
  }

  /* ————————————————————————————
     Helpers
  ———————————————————————————— */
  function extractHandle(href) {
    if (!href) return null;
    var m = href.match(/\/products\/([^?#\/]+)/);
    return m ? m[1] : null;
  }

  function findCardWithPriceBox(el, priceBoxSel) {
    var cur = el.parentElement;
    for (var d = 0; d < 12 && cur; d++) {
      if (cur.querySelector(priceBoxSel)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function addBadge(container, text) {
    if (container.querySelector('.mp-badge')) return;
    var b = document.createElement('span');
    b.className = 'mp-badge';
    b.textContent = text;
    container.appendChild(b);
  }

  // ——— Run ———
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
