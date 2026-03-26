/**
 * Member Price Storefront
 * Alters displayed prices for logged-in members on product & collection pages.
 */
(function () {
  'use strict';

  var MAX_RETRIES = 10;
  var RETRY_DELAY = 500; // ms

  function init(attempt) {
    attempt = attempt || 1;
    console.log('[MemberPrice] Init attempt', attempt);

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

    // ——— Product page ———
    var prodEl = document.getElementById('mp-product');
    if (prodEl) {
      try {
        var prodData = JSON.parse(prodEl.textContent);
        console.log('[MemberPrice] Product data:', prodData);

        // Try configured selector first, then common fallbacks
        var selectors = [
          cfg.pdpContainer + ' ' + cfg.pdpPrice,
          'span.sale-price',
          'span.price-on-sale',
          '.product-price .sale-price',
          '.price .sale-price',
          'div.price span[class*="sale"]',
          '.product__price .price-item--sale',
          '.price__sale .price-item--sale'
        ];
        var priceEl = null;
        for (var s = 0; s < selectors.length; s++) {
          try {
            priceEl = document.querySelector(selectors[s]);
            if (priceEl) {
              console.log('[MemberPrice] Found price with selector:', selectors[s]);
              break;
            }
          } catch (e) { /* skip invalid selectors */ }
        }

        if (!priceEl && attempt < MAX_RETRIES) {
          console.log('[MemberPrice] Price element not ready, retrying in', RETRY_DELAY, 'ms...');
          setTimeout(function() { init(attempt + 1); }, RETRY_DELAY);
          return;
        }

        if (priceEl) {
          handleProduct(prodData, cfg, priceEl);
        } else {
          console.warn('[MemberPrice] Price element never found after', attempt, 'attempts');
        }
      } catch (e) {
        console.error('[MemberPrice] Product data parse error:', e);
      }
    }

    // ——— Collection / Search page ———
    var listEl = document.getElementById('mp-listing');
    if (listEl) {
      try {
        var listData = JSON.parse(listEl.textContent);
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
      amount = value / 100;
    }

    if (isNaN(amount)) return null;
    return currency + amount.toFixed(2);
  }

  /* ————————————————————————————
     Product Page
  ———————————————————————————— */
  function handleProduct(data, cfg, priceEl) {
    // Find the container from the price element (try configured, then common fallbacks)
    var container = priceEl.closest(cfg.pdpContainer)
      || priceEl.closest('div.price')
      || priceEl.closest('div.prices')
      || priceEl.parentElement;

    var memberFormatted = formatMoney(data.memberPrice);
    if (!memberFormatted) {
      console.warn('[MemberPrice] Could not format member price:', data.memberPrice);
      return;
    }

    console.log('[MemberPrice] SUCCESS - Replacing price with:', memberFormatted);

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

  // ——— Run after window fully loads (including all scripts) ———
  window.addEventListener('load', function() {
    // Extra delay to let other scripts finish DOM manipulation
    setTimeout(function() { init(1); }, 300);
  });
})();
