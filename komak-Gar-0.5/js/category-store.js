(() => {
  const cards = [...document.querySelectorAll('.product-card')];
  if (!cards.length) return;

  document.body.insertAdjacentHTML('beforeend', `
    <aside class="cart-drawer" id="cartDrawer" aria-label="سبد خرید">
      <div class="cart-header"><h3>سبد خرید</h3><button type="button" class="close-cart" aria-label="بستن سبد خرید">×</button></div>
      <div class="cart-items" id="cartItems"><p class="empty-cart">سبد خرید شما خالی است.</p></div>
      <div class="cart-footer"><div class="cart-total"><span>جمع کل</span><strong id="cartTotal">0 AFN</strong></div><button type="button" class="btn-primary cart-checkout" id="cartCheckoutButton">ثبت سفارش</button></div>
    </aside>
    <div class="checkout-modal" id="checkoutModal" aria-hidden="true">
      <div class="checkout-modal-dialog"><button class="checkout-close" type="button" aria-label="بستن فرم سفارش">×</button>
        <div class="checkout-head"><span class="badge">تکمیل خرید</span><h3>ثبت سفارش</h3></div>
        <div class="checkout-layout"><div class="checkout-summary"><h4>لیست سفارش</h4><div class="checkout-items" id="checkoutItems"></div><div class="checkout-total-row"><span>جمع کل</span><strong id="checkoutTotal">0 AFN</strong></div></div>
          <form class="checkout-form" id="checkoutForm"><div class="field-row"><div class="field-group"><label for="categoryCheckoutName">نام</label><input id="categoryCheckoutName" type="text" placeholder="نام کامل" required /></div><div class="field-group"><label for="categoryCheckoutPhone">شماره تماس</label><input id="categoryCheckoutPhone" type="tel" placeholder="0785718208" minlength="10" maxlength="10" required /></div></div><div class="field-group"><label for="categoryCheckoutAddress">آدرس دقیق</label><textarea id="categoryCheckoutAddress" rows="4" placeholder="آدرس کامل و دقیق" required></textarea></div><div class="field-row"><div class="field-group"><label for="categoryCheckoutPayment">روش پرداخت</label><select id="categoryCheckoutPayment"><option value="پرداخت هنگام تحویل">پرداخت هنگام تحویل</option><option value="پرداخت نقدی حضوری">پرداخت نقدی حضوری</option></select></div><div class="field-group"><label for="categoryCheckoutDeliveryDate">تاریخ پیشنهادی تحویل</label><input id="categoryCheckoutDeliveryDate" type="date" /></div></div><button type="submit" class="btn-submit">تأیید نهایی سفارش</button></form>
        </div>
      </div>
    </div>
    <div class="product-modal" id="productModal" aria-hidden="true"><div class="product-modal-dialog"><button class="modal-close" type="button" aria-label="بستن">×</button><div class="modal-body"><img id="categoryModalImage" src="" alt="محصول" /><div class="modal-copy"><span class="badge">جزئیات محصول</span><h3 id="categoryModalTitle">عنوان محصول</h3><p>این محصول برای سفارش آماده است.</p><div class="modal-meta"><span>دسته: <strong>محصولات</strong></span><span>قیمت: <strong id="categoryModalPrice">0 AFN</strong></span></div><button type="button" class="btn-primary add-to-cart-modal">افزودن به سبد</button></div></div></div></div>
    <button type="button" class="cart-toggle" id="cartToggle" aria-label="نمایش سبد خرید" title="نمایش سبد خرید"><span class="cart-icon" aria-hidden="true">🛒</span><span id="cartCount">0</span></button>
  `);

  const cartDrawer = document.getElementById('cartDrawer');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const cartCount = document.getElementById('cartCount');
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutItems = document.getElementById('checkoutItems');
  const checkoutTotal = document.getElementById('checkoutTotal');
  const productModal = document.getElementById('productModal');
  let selectedProduct = null;
  let cart = JSON.parse(localStorage.getItem('helpgar-cart') || '[]');

  const money = (value) => `${Number(value).toLocaleString('fa-AF')} AFN`;
  const productFromCard = (card) => ({
    name: card.dataset.name,
    image: card.dataset.image,
    price: Number(card.dataset.price),
    category: card.dataset.category
  });

  cards.forEach((card) => {
    const name = card.querySelector('h4')?.textContent.trim() || 'محصول';
    const image = card.querySelector('img')?.getAttribute('src') || '';
    const priceText = card.querySelector('.price')?.textContent || '0';
    card.dataset.name = name;
    card.dataset.image = image;
    card.dataset.price = priceText.replace(/[^0-9]/g, '') || '0';
    card.dataset.category = document.querySelector('.badge')?.textContent.trim() || 'محصولات';
    const productInfo = card.querySelector('.product-info');
    if (productInfo && !productInfo.querySelector('.product-actions')) {
      const actions = document.createElement('div');
      actions.className = 'product-actions';
      actions.innerHTML = '<button type="button" class="btn-mini btn-view" aria-label="نمایش جزئیات" title="نمایش جزئیات">⌕</button><button type="button" class="btn-mini btn-cart" aria-label="افزودن به سبد" title="افزودن به سبد">🛒</button>';
      productInfo.appendChild(actions);
    }

    const cardImage = card.querySelector('img');
    if (cardImage) cardImage.loading = 'lazy';
  });

  function saveCart() { localStorage.setItem('helpgar-cart', JSON.stringify(cart)); }
  function updateCart() {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = money(total);
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartItems.innerHTML = cart.length ? cart.map((item) => `<div class="cart-item"><img src="${item.image}" alt="${item.name}" /><div><h4>${item.name}</h4><div class="cart-item-meta"><span>${item.quantity} عدد</span><strong>${money(item.price * item.quantity)}</strong></div></div></div>`).join('') : '<p class="empty-cart">سبد خرید شما خالی است.</p>';
    checkoutItems.innerHTML = cart.length ? cart.map((item) => `<div class="checkout-item"><img src="${item.image}" alt="${item.name}" /><div class="checkout-item-copy"><h5>${item.name}</h5><div class="checkout-qty"><button type="button" data-action="decrease" data-name="${item.name}" aria-label="کم کردن تعداد">−</button><span>${item.quantity}</span><button type="button" data-action="increase" data-name="${item.name}" aria-label="افزایش تعداد">+</button></div></div><strong>${money(item.price * item.quantity)}</strong></div>`).join('') : '<p class="empty-cart">سبد خرید شما خالی است.</p>';
    checkoutTotal.textContent = money(total);
  }
  function addToCart(product) {
    const existing = cart.find((item) => item.name === product.name);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    saveCart(); updateCart(); cartDrawer.classList.add('open');
  }
  function closeModal() { productModal.classList.remove('open'); productModal.setAttribute('aria-hidden', 'true'); }

  document.querySelectorAll('.btn-view').forEach((button) => button.addEventListener('click', () => {
    selectedProduct = productFromCard(button.closest('.product-card'));
    document.getElementById('categoryModalImage').src = selectedProduct.image;
    document.getElementById('categoryModalTitle').textContent = selectedProduct.name;
    document.getElementById('categoryModalPrice').textContent = money(selectedProduct.price);
    productModal.classList.add('open'); productModal.setAttribute('aria-hidden', 'false');
  }));
  document.querySelectorAll('.btn-cart').forEach((button) => button.addEventListener('click', () => addToCart(productFromCard(button.closest('.product-card')))));
  document.querySelector('.add-to-cart-modal').addEventListener('click', () => { if (selectedProduct) addToCart(selectedProduct); closeModal(); });
  document.querySelector('.modal-close').addEventListener('click', closeModal);
  document.getElementById('cartToggle').addEventListener('click', () => cartDrawer.classList.toggle('open'));
  document.querySelector('.close-cart').addEventListener('click', () => cartDrawer.classList.remove('open'));
  document.getElementById('cartCheckoutButton').addEventListener('click', () => { if (cart.length) { checkoutModal.classList.add('open'); checkoutModal.setAttribute('aria-hidden', 'false'); } });
  document.querySelector('.checkout-close').addEventListener('click', () => checkoutModal.classList.remove('open'));
  checkoutItems.addEventListener('click', (event) => { const button = event.target.closest('button[data-name]'); if (!button) return; const item = cart.find((entry) => entry.name === button.dataset.name); if (!item) return; item.quantity += button.dataset.action === 'increase' ? 1 : -1; if (item.quantity <= 0) cart = cart.filter((entry) => entry.name !== button.dataset.name); saveCart(); updateCart(); });
  document.getElementById('checkoutForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('.btn-submit');
    button.disabled = true;
    button.textContent = 'در حال ثبت سفارش...';

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('categoryCheckoutName').value.trim(),
          phone: document.getElementById('categoryCheckoutPhone').value.trim(),
          address: document.getElementById('categoryCheckoutAddress').value.trim(),
          paymentMethod: document.getElementById('categoryCheckoutPayment').value,
          deliveryDate: document.getElementById('categoryCheckoutDeliveryDate').value,
          items: cart
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'ثبت سفارش انجام نشد.');

      button.textContent = `سفارش ثبت شد: ${result.order.id}`;
      cart = [];
      saveCart();
      updateCart();
      setTimeout(() => {
        form.reset();
        button.textContent = 'تأیید نهایی سفارش';
        button.disabled = false;
        checkoutModal.classList.remove('open');
      }, 1800);
    } catch (error) {
      button.textContent = error.message;
      button.disabled = false;
    }
  });
  updateCart();
})();
