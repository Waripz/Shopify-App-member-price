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

    // Double-check: only run for logged-in customers
    // Shopify themes add 'customer-logged-in' class to <body>
    if (!document.body.classList.contains('customer-logged-in')) {
      console.log('[MemberPrice] Customer not logged in, skipping');
      return;
    }

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

    console.log('[MemberPrice] Config:', JSON.stringify(cfg));

    // ——— Product page ———
    var prodEl = document.getElementById('mp-product');
    if (prodEl) {
      try {
        var prodData = JSON.parse(prodEl.textContent);
        console.log('[MemberPrice] Product data:', prodData);

        var priceEl = findPriceElement(cfg);

        if (!priceEl && attempt < MAX_RETRIES) {
          console.log('[MemberPrice] Price element not ready, retrying in', RETRY_DELAY, 'ms...');
          setTimeout(function() { init(attempt + 1); }, RETRY_DELAY);
          return;
        }

        if (priceEl) {
          console.log('[MemberPrice] Found price element:', priceEl.tagName, priceEl.className, priceEl.textContent.trim());
          handleProduct(prodData, cfg, priceEl);
        } else {
          console.warn('[MemberPrice] Price element never found after', attempt, 'attempts');
          debugPriceElements();
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

    // ——— Cart page + mini-cart drawer ———
    // Merge all available price data for cart handling
    var allPrices = {};
    
    // From cart-specific data (cart page)
    var cartEl = document.getElementById('mp-cart');
    if (cartEl) {
      try {
        var cartData = JSON.parse(cartEl.textContent);
        for (var k in cartData) allPrices[k] = cartData[k];
      } catch (e) {
        console.error('[MemberPrice] Cart data parse error:', e);
      }
    }
    
    // From product data
    if (dataEl) {
      try {
        var pData = JSON.parse(dataEl.textContent);
        var handle = window.location.pathname.match(/\/products\/([^?#\/]+)/);
        if (handle && pData.memberPrice) allPrices[handle[1]] = pData.memberPrice;
      } catch (e) { /* skip */ }
    }
    
    // From listing data
    if (listEl) {
      try {
        var lData = JSON.parse(listEl.textContent);
        for (var lk in lData) allPrices[lk] = lData[lk];
      } catch (e) { /* skip */ }
    }
    
    if (Object.keys(allPrices).length > 0) {
      handleCart(allPrices, cfg);
      
      // Watch for mini-cart drawer opening dynamically
      var observer = new MutationObserver(function() {
        handleCart(allPrices, cfg);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      // Stop observing after 30 seconds to avoid performance issues
      setTimeout(function() { observer.disconnect(); }, 30000);
    }
  }

  /**
   * Multi-strategy price element finder
   * Tries multiple approaches to locate the displayed price
   */
  function findPriceElement(cfg) {
    var el = null;

    // Strategy 1: configured selector (pdpContainer + pdpPrice)
    var configuredSel = cfg.pdpContainer + ' ' + cfg.pdpPrice;
    try {
      el = document.querySelector(configuredSel);
      if (el) { console.log('[MemberPrice] Found via configured:', configuredSel); return el; }
    } catch (e) { /* skip */ }

    // Strategy 2: common price class selectors
    var classSelectors = [
      'span.price-on-sale',
      'span.sale-price',
      '.price-on-sale',
      '.sale-price',
      '.price .price-on-sale',
      '.prices .price-on-sale',
      'div.prices .price-on-sale',
      'div.price .sale-price',
      '.product__price .price-item--sale',
      '.price__sale .price-item--sale',
      '.price-item--sale'
    ];

    for (var i = 0; i < classSelectors.length; i++) {
      try {
        el = document.querySelector(classSelectors[i]);
        if (el) { console.log('[MemberPrice] Found via class:', classSelectors[i]); return el; }
      } catch (e) { /* skip */ }
    }

    // Strategy 3: itemprop="price" attribute (very common in Shopify themes)
    el = document.querySelector('[itemprop="price"]');
    if (el) { console.log('[MemberPrice] Found via itemprop="price"'); return el; }

    // Strategy 4: look for any span/element inside a prices/price container
    // that has a currency symbol in its text (RM, $, etc.)
    var containers = document.querySelectorAll('div.prices, div.price, .product-price, .price-container');
    for (var c = 0; c < containers.length; c++) {
      var spans = containers[c].querySelectorAll('span');
      for (var s = 0; s < spans.length; s++) {
        var txt = spans[s].textContent.trim();
        // Match currency patterns like RM25.50, $10.00, etc.
        if (/^(RM|USD|\$|€|£)\s*\d/.test(txt) || /^\d.*\.\d{2}$/.test(txt)) {
          // Skip if it looks like a compare/old price (has line-through)
          var style = window.getComputedStyle(spans[s]);
          if (style.textDecoration.indexOf('line-through') === -1) {
            console.log('[MemberPrice] Found via currency scan:', txt);
            return spans[s];
          }
        }
      }
    }

    // Strategy 5: meta tag with property="og:price:amount"
    var metaPrice = document.querySelector('meta[property="og:price:amount"]');
    if (metaPrice) {
      // We found the meta tag but we need a visible element to replace
      // Try to find ANY visible price element near product info
      var productInfo = document.querySelector('.product-infor, .product-info, .product__info-wrapper');
      if (productInfo) {
        var priceSpans = productInfo.querySelectorAll('span');
        for (var ps = 0; ps < priceSpans.length; ps++) {
          var psTxt = priceSpans[ps].textContent.trim();
          if (/^(RM|USD|\$|€|£)\s*\d/.test(psTxt)) {
            var psStyle = window.getComputedStyle(priceSpans[ps]);
            if (psStyle.textDecoration.indexOf('line-through') === -1) {
              console.log('[MemberPrice] Found via product-info scan:', psTxt);
              return priceSpans[ps];
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Debug helper: logs all price-related elements
   */
  function debugPriceElements() {
    var allPriceEls = document.querySelectorAll('[class*="price"]');
    console.log('[MemberPrice] DEBUG - All elements with "price" in class:', allPriceEls.length);
    for (var i = 0; i < Math.min(allPriceEls.length, 10); i++) {
      console.log('[MemberPrice] DEBUG -', i, ':', allPriceEls[i].tagName, allPriceEls[i].className, '|', allPriceEls[i].textContent.trim().substring(0, 50));
    }
    var itemprice = document.querySelector('[itemprop="price"]');
    console.log('[MemberPrice] DEBUG - itemprop="price":', itemprice);
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
    var container = null;
    try { container = priceEl.closest(cfg.pdpContainer); } catch (e) { /* skip */ }
    if (!container) container = priceEl.closest('div.prices');
    if (!container) container = priceEl.closest('div.price');
    if (!container) container = priceEl.parentElement;

    var memberFormatted = formatMoney(data.memberPrice);
    if (!memberFormatted) {
      console.warn('[MemberPrice] Could not format member price:', data.memberPrice);
      return;
    }

    console.log('[MemberPrice] SUCCESS - Replacing price with:', memberFormatted);

    var currentPrice = priceEl.textContent.trim();

    // Try configured compare selector, then common fallbacks
    var compareEl = null;
    try { compareEl = container.querySelector(cfg.pdpCompare); } catch (e) { /* skip */ }
    if (!compareEl) compareEl = container.querySelector('.compare-price');
    if (!compareEl) compareEl = container.querySelector('.compare-at-price');

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
        // Insert badge inline right after the sale element
        if (!saleEl.parentNode.querySelector('.mp-badge-sm')) {
          var badge = document.createElement('span');
          badge.className = 'mp-badge-sm';
          badge.textContent = cfg.badgeText;
          saleEl.parentNode.insertBefore(badge, saleEl.nextSibling);
        }
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

  function addBadge(container, text, className) {
    className = className || 'mp-badge';
    if (container.querySelector('.' + className) || container.querySelector('.mp-badge')) return;
    var b = document.createElement('span');
    b.className = className;
    b.textContent = text;
    container.appendChild(b);
  }

  /* ————————————————————————————
     Cart Page + Mini Cart
  ———————————————————————————— */
  function handleCart(prices, cfg) {
    if (!prices || Object.keys(prices).length === 0) return;
    console.log('[MemberPrice] Cart prices:', prices);

    // Strategy: find ALL product links on the page that are in a cart context,
    // then walk up to find the price element nearby
    var allLinks = document.querySelectorAll('a[href*="/products/"]');
    var processed = [];

    for (var i = 0; i < allLinks.length; i++) {
      var link = allLinks[i];
      var handle = extractHandle(link.getAttribute('href'));
      if (!handle || !prices[handle]) continue;

      var memberFormatted = formatMoney(prices[handle]);
      if (!memberFormatted) continue;

      // Walk up to find a cart-related container
      var container = null;
      var cur = link.parentElement;
      for (var d = 0; d < 10 && cur; d++) {
        var cls = (cur.className || '').toLowerCase();
        var id = (cur.id || '').toLowerCase();
        if (cls.indexOf('cart') !== -1 || id.indexOf('cart') !== -1) {
          container = cur;
          break;
        }
        cur = cur.parentElement;
      }
      if (!container) continue;

      // Find all span.price elements in this container
      var priceEls = container.querySelectorAll('span.price');
      if (priceEls.length === 0) continue;

      for (var j = 0; j < priceEls.length; j++) {
        var priceEl = priceEls[j];
        if (processed.indexOf(priceEl) !== -1) continue;
        if (priceEl.querySelector('.mp-badge-cart')) continue;
        processed.push(priceEl);

        var currentPrice = priceEl.textContent.trim();
        if (!currentPrice) continue;

        // Replace price
        priceEl.textContent = memberFormatted;
        priceEl.classList.add('mp-value');

        // Add subtle cart badge below
        var cartBadge = document.createElement('span');
        cartBadge.className = 'mp-badge-cart';
        cartBadge.textContent = cfg.badgeText;
        priceEl.appendChild(cartBadge);
      }
    }
  }

  // ——— Run after window fully loads (including all scripts) ———
  window.addEventListener('load', function() {
    // Extra delay to let other scripts finish DOM manipulation
    setTimeout(function() { init(1); }, 300);
  });
})();
