/**
 * Member Price Storefront
 * Alters displayed prices for logged-in members on product & collection pages.
 */
(function () {
  'use strict';

  function init() {
    var cfgEl = document.getElementById('mp-config');
    if (!cfgEl) return;

    var cfg;
    try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }

    // ——— Product page ———
    var prodEl = document.getElementById('mp-product');
    if (prodEl) {
      try { handleProduct(JSON.parse(prodEl.textContent), cfg); } catch (e) { /* skip */ }
    }

    // ——— Collection / Search page ———
    var listEl = document.getElementById('mp-listing');
    if (listEl) {
      try { handleListing(JSON.parse(listEl.textContent), cfg); } catch (e) { /* skip */ }
    }
  }

  /* ————————————————————————————
     Product Page
  ———————————————————————————— */
  function handleProduct(data, cfg) {
    var container = document.querySelector(cfg.pdpContainer);
    if (!container) return;

    var priceEl = container.querySelector(cfg.pdpPrice);
    if (!priceEl) return;

    var currentPrice = priceEl.textContent.trim();
    var compareEl = container.querySelector(cfg.pdpCompare);

    // Set the compare-at price to the current (non-member) price
    if (compareEl) {
      compareEl.textContent = currentPrice;
      compareEl.classList.add('mp-original');
      compareEl.style.display = '';
    } else {
      // Create one if the theme doesn't already have a compare element
      var newCompare = document.createElement('span');
      newCompare.textContent = currentPrice;
      newCompare.className = 'mp-original';
      newCompare.style.cssText = 'text-decoration:line-through;opacity:.55;margin-right:8px;';
      priceEl.parentNode.insertBefore(newCompare, priceEl);
    }

    // Replace with member price
    priceEl.textContent = data.memberPrice;
    priceEl.classList.add('mp-value');

    // Add badge
    addBadge(container, cfg.badgeText);
  }

  /* ————————————————————————————
     Collection / Search Listing
  ———————————————————————————— */
  function handleListing(prices, cfg) {
    if (!prices || Object.keys(prices).length === 0) return;

    var processed = [];
    var links = document.querySelectorAll('a[href*="/products/"]');

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

      if (saleEl) {
        var curPrice = saleEl.textContent.trim();

        if (oldEl) {
          oldEl.textContent = curPrice;
          oldEl.classList.add('mp-original');
          oldEl.style.display = '';
        }

        saleEl.textContent = prices[handle];
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
