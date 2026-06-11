/**
 * Cart drawer
 * -----------
 * Progressive-enhancement layer for the cart. Three small custom elements:
 *
 *   <cart-drawer>      Owns the <dialog>, talks to the AJAX Cart API, and
 *                      re-renders itself + the header via the Section
 *                      Rendering API. Without JS the dialog never opens and
 *                      the header cart icon links to /cart instead.
 *   <product-form>     Intercepts the add-to-cart submit, adds via /cart/add,
 *                      then opens the drawer with the fresh contents.
 *   <quantity-stepper> The − / + buttons next to each line item.
 *
 * Cart API + Section Rendering API:
 * https://shopify.dev/docs/api/ajax/reference/cart
 * https://shopify.dev/docs/storefronts/themes/architecture/sections/section-rendering-api
 */
(function () {
  'use strict';

  /** Sections re-rendered on every cart change. */
  const SECTIONS = ['cart-drawer', 'header'];

  /** POST JSON to a cart endpoint and return the parsed response. */
  async function postCart(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      // The Cart API returns { description, message } on errors (e.g. out of stock).
      throw new Error(data.description || data.message || 'Cart request failed');
    }
    return data;
  }

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.dialog = this.querySelector('[data-cart-dialog]');
      this.status = this.querySelector('[data-cart-status]');
      this.errorText = this.dataset.errorText || 'Something went wrong.';
      this.busy = false;

      this.changeUrl = this.dataset.cartChangeUrl;
      this.updateUrl = this.dataset.cartUpdateUrl;

      // Close on the close button or any element flagged to dismiss the drawer.
      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-cart-close]')) {
          event.preventDefault();
          this.close();
        }
      });

      // Click outside the inner panel (on the dialog backdrop area) closes.
      this.dialog.addEventListener('click', (event) => {
        if (event.target === this.dialog) this.close();
      });

      // Quantity stepper buttons.
      this.addEventListener('click', (event) => {
        const button = event.target.closest('[data-quantity-minus], [data-quantity-plus]');
        if (!button) return;
        event.preventDefault();
        this.onStepperClick(button);
      });

      // Manual quantity typing.
      this.addEventListener('change', (event) => {
        const input = event.target.closest('[data-quantity-input]');
        if (!input) return;
        const line = Number(input.dataset.line);
        const quantity = Math.max(0, parseInt(input.value, 10) || 0);
        this.updateLine(line, quantity);
      });

      // Remove links.
      this.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-remove]');
        if (!remove) return;
        event.preventDefault();
        this.updateLine(Number(remove.dataset.line), 0);
      });

      // Debounced order note.
      this.addEventListener('input', (event) => {
        const note = event.target.closest('[data-cart-note]');
        if (!note) return;
        clearTimeout(this.noteTimer);
        this.noteTimer = setTimeout(() => this.updateNote(note.value), 500);
      });

      // Cart icon (or any opener) toggles the drawer; falls back to its href
      // when JS is unavailable.
      document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-cart-drawer-open]');
        if (!opener) return;
        event.preventDefault();
        this.opener = opener;
        this.open();
      });

      // Other components (e.g. <product-form>) ask the drawer to open/refresh.
      document.addEventListener('cart:refresh', (event) => {
        if (event.detail && event.detail.sections) this.renderSections(event.detail.sections);
        if (!event.detail || event.detail.open !== false) this.open();
      });
    }

    get isOpen() {
      return this.dialog.hasAttribute('open');
    }

    open() {
      if (this.isOpen) return;
      this.dialog.showModal();
      // Move focus to the close button for a predictable starting point.
      const close = this.dialog.querySelector('[data-cart-close]');
      if (close) close.focus();
    }

    close() {
      if (!this.isOpen) return;
      this.dialog.close();
      // Return focus to whatever opened the drawer.
      if (this.opener && document.contains(this.opener)) this.opener.focus();
    }

    onStepperClick(button) {
      const stepper = button.closest('[data-line]');
      const input = stepper.querySelector('[data-quantity-input]');
      const current = parseInt(input.value, 10) || 0;
      const next = button.hasAttribute('data-quantity-plus') ? current + 1 : current - 1;
      const quantity = Math.max(0, next);
      input.value = quantity;
      this.updateLine(Number(stepper.dataset.line), quantity);
    }

    setBusy(state) {
      this.busy = state;
      this.dialog.setAttribute('aria-busy', String(state));
    }

    async updateLine(line, quantity) {
      if (this.busy || !line) return;
      this.setBusy(true);
      try {
        const data = await postCart(`${this.changeUrl}.js`, {
          line,
          quantity,
          sections: SECTIONS,
          sections_url: window.location.pathname,
        });
        this.renderSections(data.sections);
        this.announce(this.querySelector('[data-cart-count-text]')?.textContent.trim());
      } catch (error) {
        this.announce(this.errorText);
        console.error('[cart-drawer]', error);
      } finally {
        this.setBusy(false);
      }
    }

    async updateNote(note) {
      try {
        await postCart(`${this.updateUrl}.js`, { note });
      } catch (error) {
        console.error('[cart-drawer]', error);
      }
    }

    /** Swap in freshly rendered HTML for the drawer body and the header count. */
    renderSections(sections) {
      if (!sections) return;

      const drawerHtml = sections['cart-drawer'];
      if (drawerHtml) {
        const doc = new DOMParser().parseFromString(drawerHtml, 'text/html');
        const newContent = doc.querySelector('[data-cart-content]');
        const oldContent = this.querySelector('[data-cart-content]');
        if (newContent && oldContent) oldContent.replaceWith(newContent);

        const newCount = doc.querySelector('[data-cart-count-text]');
        const oldCount = this.querySelector('[data-cart-count-text]');
        if (newCount && oldCount) oldCount.textContent = newCount.textContent;
      }

      const headerHtml = sections['header'];
      if (headerHtml) {
        const doc = new DOMParser().parseFromString(headerHtml, 'text/html');
        const newCount = doc.querySelector('[data-cart-count]');
        const oldCount = document.querySelector('[data-cart-count]');
        if (oldCount) {
          if (newCount) oldCount.replaceWith(newCount);
          else oldCount.remove();
        } else if (newCount) {
          const link = document.querySelector('[data-cart-drawer-open]');
          if (link) link.prepend(newCount);
        }
      }
    }

    announce(message) {
      if (this.status && message) this.status.textContent = message;
    }
  }

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;
      this.submitButton = this.querySelector('[type="submit"]');
      this.form.addEventListener('submit', (event) => this.onSubmit(event));
    }

    async onSubmit(event) {
      // Only intercept the add-to-cart button (or an Enter-key submit, which
      // has no submitter). Accelerated/dynamic checkout buttons fall through
      // to their native behaviour.
      if (event.submitter && event.submitter.name !== 'add') return;

      event.preventDefault();
      const drawer = document.querySelector('cart-drawer');
      if (!drawer) {
        this.form.submit();
        return;
      }

      this.setLoading(true);
      try {
        const formData = new FormData(this.form);
        formData.append('sections', SECTIONS.join(','));
        formData.append('sections_url', window.location.pathname);

        const response = await fetch(`${this.dataset.cartAddUrl}.js`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.description || data.message);

        drawer.opener = this.submitButton;
        document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { sections: data.sections } }));
      } catch (error) {
        // Fall back to the native cart page so the customer is never stuck.
        console.error('[product-form]', error);
        window.location.href = this.dataset.cartUrl || '/cart';
      } finally {
        this.setLoading(false);
      }
    }

    setLoading(state) {
      if (!this.submitButton) return;
      this.submitButton.toggleAttribute('aria-busy', state);
      this.submitButton.disabled = state;
    }
  }

  // Defined so the markup can use it as a styling/JS hook; behaviour lives in
  // the delegated handlers on <cart-drawer>.
  class QuantityStepper extends HTMLElement {}

  if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);
  if (!customElements.get('product-form')) customElements.define('product-form', ProductForm);
  if (!customElements.get('quantity-stepper')) customElements.define('quantity-stepper', QuantityStepper);
})();
