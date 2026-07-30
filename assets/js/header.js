/**
 * Header interactions: sticky bar, mega menu, mobile drawer, search modal.
 *
 * Every control works without this file (links navigate, the search form submits);
 * this layer adds the overlay behaviour, keyboard support and predictive results.
 */
(function () {
  'use strict';

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function on(el, event, handler, options) {
    if (el) el.addEventListener(event, handler, options);
  }

  function show(el) {
    if (el) el.hidden = false;
  }

  function hide(el) {
    if (el) el.hidden = true;
  }

  /** Locks body scroll while an overlay owns the screen, preserving scrollbar width. */
  var scrollLock = (function () {
    var locks = 0;

    return {
      acquire: function () {
        if (locks === 0) {
          var gap = window.innerWidth - document.documentElement.clientWidth;
          document.body.style.overflow = 'hidden';
          if (gap > 0) document.body.style.paddingRight = gap + 'px';
        }
        locks++;
      },
      release: function () {
        locks = Math.max(0, locks - 1);
        if (locks === 0) {
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }
      }
    };
  })();

  /** Keeps Tab cycling inside an open overlay. */
  function createFocusTrap(container) {
    function handleKeydown(event) {
      if (event.key !== 'Tab') return;

      var focusable = Array.prototype.filter.call(
        container.querySelectorAll(FOCUSABLE),
        function (el) {
          return el.offsetParent !== null || el === document.activeElement;
        }
      );
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    return {
      activate: function () {
        container.addEventListener('keydown', handleKeydown);
      },
      deactivate: function () {
        container.removeEventListener('keydown', handleKeydown);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Sticky header
  // ---------------------------------------------------------------------------
  function initStickyHeader() {
    var header = document.getElementById('section-header');
    var topbar = document.getElementById('section-topbar');
    if (!header) return;

    var ticking = false;

    function apply() {
      var scrolled = (window.scrollY || window.pageYOffset) > 60;
      header.classList.toggle('is-scrolled', scrolled);
      if (topbar) topbar.classList.toggle('is-hidden', scrolled);
      ticking = false;
    }

    on(
      window,
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(apply);
        }
      },
      { passive: true }
    );

    apply();
  }

  // ---------------------------------------------------------------------------
  // Mega menu
  // ---------------------------------------------------------------------------
  function initMegaMenu() {
    var trigger = document.querySelector('[data-megamenu-trigger]');
    var menu = document.getElementById('megamenu');
    var scrim = document.querySelector('[data-megamenu-scrim]');
    if (!trigger || !menu) return;

    var OPEN_DELAY = 50;
    var CLOSE_DELAY = 260;
    var openTimer = null;
    var closeTimer = null;
    var isOpen = false;

    function clearTimers() {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      show(menu);
      show(scrim);
      // Next frame so the transition runs from the hidden state.
      window.requestAnimationFrame(function () {
        menu.classList.add('is-open');
        if (scrim) scrim.classList.add('is-open');
      });
      trigger.setAttribute('aria-expanded', 'true');
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      menu.classList.remove('is-open');
      if (scrim) scrim.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');

      window.setTimeout(function () {
        if (!isOpen) {
          hide(menu);
          hide(scrim);
        }
      }, 260);
    }

    function scheduleOpen() {
      clearTimers();
      openTimer = window.setTimeout(open, OPEN_DELAY);
    }

    function scheduleClose() {
      clearTimers();
      closeTimer = window.setTimeout(close, CLOSE_DELAY);
    }

    var triggerItem = trigger.closest('.nav-item') || trigger;
    on(triggerItem, 'mouseenter', scheduleOpen);
    on(triggerItem, 'mouseleave', scheduleClose);
    on(menu, 'mouseenter', clearTimers);
    on(menu, 'mouseleave', scheduleClose);
    on(scrim, 'click', close);

    on(trigger, 'focus', open);
    on(trigger, 'keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        open();
        var firstTab = menu.querySelector('.megamenu__tab');
        if (firstTab) firstTab.focus();
      }
    });

    on(document, 'keydown', function (event) {
      if (event.key === 'Escape' && isOpen) {
        close();
        trigger.focus();
      }
    });

    on(document, 'focusin', function (event) {
      if (!isOpen) return;
      if (!menu.contains(event.target) && !triggerItem.contains(event.target)) close();
    });

    initTabGroup(menu, '[data-megamenu-tab]', '[data-megamenu-panel]', 'horizontal');
    initTabGroup(menu, '[data-megamenu-group]', '[data-megamenu-grid]', 'vertical');
  }

  /**
   * Wires a roving-tabindex tab group. Used for both the mega menu's top tabs and
   * its vertical category rail, which behave identically apart from arrow-key axis.
   */
  function initTabGroup(root, tabSelector, panelSelector, orientation) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll(tabSelector));
    var panels = Array.prototype.slice.call(root.querySelectorAll(panelSelector));
    if (!tabs.length) return;

    function activate(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var selected = i === index;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.setAttribute('tabindex', selected ? '0' : '-1');
      });

      panels.forEach(function (panel, i) {
        var selected = i === index;
        panel.classList.toggle('is-active', selected);
        panel.hidden = !selected;
      });

      if (moveFocus) tabs[index].focus();
    }

    tabs.forEach(function (tab, index) {
      on(tab, 'click', function () {
        activate(index, false);
      });

      // Pointer users expect the rail to respond on hover, like the reference.
      on(tab, 'mouseenter', function () {
        activate(index, false);
      });

      on(tab, 'keydown', function (event) {
        var nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
        var prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        var target = null;

        if (event.key === nextKey) target = (index + 1) % tabs.length;
        else if (event.key === prevKey) target = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = tabs.length - 1;

        if (target !== null) {
          event.preventDefault();
          activate(target, true);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Mobile drawer
  // ---------------------------------------------------------------------------
  function initDrawer() {
    var drawer = document.getElementById('navDrawer');
    var overlay = document.getElementById('navOverlay');
    var toggle = document.querySelector('[data-drawer-toggle]');
    if (!drawer || !toggle) return;

    var trap = createFocusTrap(drawer);
    var isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;
      show(drawer);
      show(overlay);
      window.requestAnimationFrame(function () {
        drawer.classList.add('is-open');
        if (overlay) overlay.classList.add('is-open');
      });
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      scrollLock.acquire();
      trap.activate();

      var closeBtn = drawer.querySelector('[data-drawer-close]');
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      scrollLock.release();
      trap.deactivate();

      window.setTimeout(function () {
        if (!isOpen) {
          hide(drawer);
          hide(overlay);
        }
      }, 300);

      toggle.focus();
    }

    on(toggle, 'click', function () {
      if (isOpen) close();
      else open();
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-drawer-close]'), function (el) {
      on(el, 'click', close);
    });

    on(document, 'keydown', function (event) {
      if (event.key === 'Escape' && isOpen) close();
    });

    // A resize into desktop layout leaves the drawer orphaned off-screen.
    on(window, 'resize', function () {
      if (isOpen && window.innerWidth > 1100) close();
    });

    initAccordions(drawer);
  }

  function initAccordions(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-accordion-toggle]'), function (toggle) {
      var panel = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!panel) return;

      on(toggle, 'click', function () {
        var willOpen = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        toggle.classList.toggle('is-open', willOpen);

        if (willOpen) {
          panel.hidden = false;
          // Height must be measured after unhiding for the transition to animate.
          window.requestAnimationFrame(function () {
            panel.style.maxHeight = panel.scrollHeight + 'px';
            panel.classList.add('is-open');
          });
        } else {
          panel.style.maxHeight = panel.scrollHeight + 'px';
          window.requestAnimationFrame(function () {
            panel.style.maxHeight = '0px';
            panel.classList.remove('is-open');
          });
          window.setTimeout(function () {
            if (toggle.getAttribute('aria-expanded') !== 'true') panel.hidden = true;
          }, 300);
        }
      });

      // Nested panels grow when a child opens, so the parent must grow with them.
      on(panel, 'transitionend', function (event) {
        if (event.propertyName !== 'max-height') return;
        if (toggle.getAttribute('aria-expanded') !== 'true') return;

        panel.style.maxHeight = 'none';
        var parent = panel.parentElement ? panel.parentElement.closest('[data-accordion-panel]') : null;
        if (parent && !parent.hidden) parent.style.maxHeight = 'none';
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Search modal
  // ---------------------------------------------------------------------------
  function initSearch() {
    var modal = document.getElementById('searchModal');
    var toggle = document.querySelector('[data-search-toggle]');
    if (!modal || !toggle) return;

    var input = modal.querySelector('[data-search-input]');
    var results = modal.querySelector('[data-search-results]');
    var idle = modal.querySelector('[data-search-idle]');
    var form = modal.querySelector('[data-search-form]');
    var trap = createFocusTrap(modal);

    var DEBOUNCE_MS = 250;
    var MIN_QUERY = 2;
    var debounceTimer = null;
    var controller = null;
    var isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;
      show(modal);
      window.requestAnimationFrame(function () {
        modal.classList.add('is-open');
      });
      toggle.setAttribute('aria-expanded', 'true');
      scrollLock.acquire();
      trap.activate();
      if (input) input.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      modal.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      scrollLock.release();
      trap.deactivate();

      window.setTimeout(function () {
        if (!isOpen) hide(modal);
      }, 250);

      toggle.focus();
    }

    function showIdle() {
      if (results) {
        results.hidden = true;
        results.innerHTML = '';
      }
      if (idle) idle.hidden = false;
    }

    function renderResults(items, query) {
      if (!results) return;
      if (idle) idle.hidden = true;
      results.hidden = false;

      if (!items.length) {
        results.innerHTML =
          '<p class="search-modal__empty">No products match &ldquo;' +
          escapeHtml(query) +
          '&rdquo;. Press Enter to search the full catalogue.</p>';
        return;
      }

      var html = items
        .map(function (item) {
          var price = item.salePrice || item.price;
          return (
            '<li class="search-result">' +
            '<a class="search-result__link" href="/shop/product/' +
            encodeURIComponent(item.slug) +
            '">' +
            '<img class="search-result__image" src="' +
            escapeHtml(item.primaryImage) +
            '" alt="" loading="lazy" width="56" height="56">' +
            '<span class="search-result__text">' +
            '<span class="search-result__title">' +
            escapeHtml(item.title) +
            '</span>' +
            (item.categoryName
              ? '<span class="search-result__meta">' + escapeHtml(item.categoryName) + '</span>'
              : '') +
            '</span>' +
            (price ? '<span class="search-result__price">₹' + escapeHtml(price) + '</span>' : '') +
            '</a>' +
            '</li>'
          );
        })
        .join('');

      results.innerHTML =
        '<p class="search-modal__label">Products</p>' +
        '<ul class="search-results unstyled-list">' +
        html +
        '</ul>' +
        '<a class="search-modal__all" href="/shop?q=' +
        encodeURIComponent(query) +
        '">View all results</a>';
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[char];
      });
    }

    function fetchResults(query) {
      if (controller) controller.abort();
      controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

      fetch('/shop/api/search?q=' + encodeURIComponent(query), {
        signal: controller ? controller.signal : undefined,
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          return response.ok ? response.json() : { success: false, results: [] };
        })
        .then(function (data) {
          if (!isOpen) return;
          renderResults((data && data.results) || [], query);
        })
        .catch(function (error) {
          // Aborts are expected as the user keeps typing; the form submit is the fallback.
          if (error && error.name !== 'AbortError') showIdle();
        });
    }

    on(toggle, 'click', function () {
      if (isOpen) close();
      else open();
    });

    Array.prototype.forEach.call(modal.querySelectorAll('[data-search-close]'), function (el) {
      on(el, 'click', close);
    });

    on(document, 'keydown', function (event) {
      if (event.key === 'Escape' && isOpen) close();
    });

    on(input, 'input', function () {
      var query = input.value.trim();
      window.clearTimeout(debounceTimer);

      if (query.length < MIN_QUERY) {
        if (controller) controller.abort();
        showIdle();
        return;
      }

      debounceTimer = window.setTimeout(function () {
        fetchResults(query);
      }, DEBOUNCE_MS);
    });

    on(form, 'submit', function (event) {
      if (!input || !input.value.trim()) event.preventDefault();
    });
  }

  // ---------------------------------------------------------------------------
  // Image fallbacks
  // ---------------------------------------------------------------------------
  function initImageFallbacks() {
    Array.prototype.forEach.call(document.querySelectorAll('img[data-fallback-src]'), function (img) {
      on(img, 'error', function handleError() {
        img.removeEventListener('error', handleError);
        img.src = img.getAttribute('data-fallback-src');
      });
    });
  }

  function init() {
    initStickyHeader();
    initMegaMenu();
    initDrawer();
    initSearch();
    initImageFallbacks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
