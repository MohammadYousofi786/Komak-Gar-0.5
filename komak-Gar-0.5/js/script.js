(() => {
  const STORAGE_KEY = 'atlas_tailor_db';
  let currentMode = 'men';
  let isInchUnit = true;
  let savedCustomers = [];
  let engineFrame = 0;

  const el = (id) => document.getElementById(id);

  function safeReadCustomers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('خطا در خواندن داده‌های مشتریان:', error);
      return [];
    }
  }

  function setOutput(id, value) {
    const node = el(id);
    if (node) node.textContent = value;
  }

  function initChart() {
    const canvas = el('patternCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function updateUnitText() {
    const node = el('currentUnitDisplay');
    if (node) {
      node.textContent = isInchUnit ? 'اینچ (Inch)' : 'سانتی‌متر (Cm)';
    }
  }

  function switchMode(mode) {
    if (mode !== 'men' && mode !== 'women') return;

    currentMode = mode;
    const tMen = el('tabMen');
    const tWomen = el('tabWomen');

    if (tMen && tWomen) {
      if (mode === 'men') {
        tMen.className = 'tab-btn active-men';
        tWomen.className = 'tab-btn';
      } else {
        tMen.className = 'tab-btn';
        tWomen.className = 'tab-btn active-women';
      }
    }

    runEngine();
  }

  function drawTailorPatterns(daman, ezar, kheshtak, dahan, sleeveLen, armhole) {
    const canvas = el('patternCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = 3.5;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#E9B949';
    ctx.fillStyle = 'rgba(233, 185, 73, 0.15)';
    ctx.font = '12px Tahoma';
    ctx.textAlign = 'center';

    const shirtX = 20;
    const shirtY = 40;
    const shirtW = Math.max(30, daman * scale);
    const shirtH = 140;

    ctx.beginPath();
    ctx.rect(shirtX, shirtY, shirtW, shirtH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('تنه پیراهن', shirtX + shirtW / 2, shirtY - 10);
    ctx.fillText(`بر: ${Number(daman || 0).toFixed(1)}`, shirtX + shirtW / 2, shirtY + shirtH / 2);

    const sLen = (sleeveLen > 0 ? sleeveLen : 20) * scale;
    const aHole = (armhole > 0 ? armhole : 22) * scale;
    let slvX = shirtX + shirtW + 30;
    const slvY = 40;

    if (slvX + sLen > canvas.width) slvX = 20;

    ctx.beginPath();
    ctx.moveTo(slvX, slvY);
    ctx.lineTo(slvX + aHole, slvY);
    ctx.lineTo(slvX + aHole - 10, slvY + sLen);
    ctx.lineTo(slvX + 10, slvY + sLen);
    ctx.closePath();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.strokeStyle = '#38bdf8';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('آستین', slvX + aHole / 2, slvY - 10);

    const pantX = 40;
    const pantY = 220;
    const pantW = Math.max(30, ezar * scale);
    const pantH = 180;
    const crotchH = Math.max(18, kheshtak * scale);
    const ankleW = Math.max(8, dahan * scale);

    ctx.beginPath();
    ctx.moveTo(pantX, pantY);
    ctx.lineTo(pantX + pantW, pantY);
    ctx.lineTo(pantX + pantW, pantY + pantH);
    ctx.lineTo(pantX + pantW - ankleW, pantY + pantH);
    ctx.lineTo(pantX, pantY + crotchH);
    ctx.closePath();

    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = '#34d399';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('الگوی برش تنبان', pantX + pantW / 2, pantY - 10);
    ctx.fillText(`خشتک: ${Number(kheshtak || 0).toFixed(1)}`, pantX + 20, pantY + crotchH - 10);
  }

  function runEngine() {
    const qpEl = el('qadPirahan');
    const qeEl = el('qadEzar');
    const bodyStyleEl = el('bodyStyle');

    const qp = qpEl ? (parseFloat(qpEl.value) || 0) : 0;
    const qe = qeEl ? (parseFloat(qeEl.value) || 0) : 0;
    const bodyStyle = bodyStyleEl ? bodyStyleEl.value : 'motavaset';

    if (qp === 0 && qe === 0) {
      setOutput('outBarDaman', '0');
      setOutput('outBarEzar', '0');
      setOutput('outKheshtak', '0');
      setOutput('outDahanEzar', '0');
      setOutput('outGoliP', '0');
      setOutput('outJayAstin', '0');
      initChart();
      return;
    }

    const f = bodyStyle === 'chagh' ? 1.1 : bodyStyle === 'laghar' ? 0.95 : 1;
    let barDaman = qp * 0.35 * f;
    let barEzar = qe * 0.45 * f;
    let kheshtak = qe >= 36 ? (bodyStyle === 'chagh' ? 18 : 17) : qe * 0.45;
    let dahanEzar = qe * 0.18;
    const goliP = qp * 0.18;
    const jayAstin = qp ? 7 : 0;

    if (currentMode === 'women') {
      barEzar = qe * 0.65 * f;
      dahanEzar = qe * 0.72;
    }

    const multiplier = isInchUnit ? 1 : 2.54;
    setOutput('outBarDaman', (barDaman * multiplier).toFixed(1));
    setOutput('outBarEzar', (barEzar * multiplier).toFixed(1));
    setOutput('outKheshtak', (kheshtak * multiplier).toFixed(1));
    setOutput('outDahanEzar', (dahanEzar * multiplier).toFixed(1));
    setOutput('outGoliP', (goliP * multiplier).toFixed(1));
    setOutput('outJayAstin', (jayAstin * multiplier).toFixed(1));

    drawTailorPatterns(barDaman, barEzar, kheshtak, dahanEzar, 22, jayAstin);
  }

  function toggleUnitSystem() {
    isInchUnit = !isInchUnit;
    updateUnitText();
    runEngine();
  }

  function scheduleEngine() {
    if (engineFrame) cancelAnimationFrame(engineFrame);
    engineFrame = requestAnimationFrame(() => {
      engineFrame = 0;
      runEngine();
    });
  }

  function saveCustomer() {
    const nameNode = el('custName');
    if (!nameNode) return;

    const name = nameNode.value.trim();
    if (!name) {
      window.alert('لطفاً نام مشتری را وارد کنید.');
      return;
    }

    const record = {
      id: Date.now(),
      name,
      phone: el('custPhone') ? el('custPhone').value || 'ثبت نشده' : 'ثبت نشده',
      mode: currentMode === 'men' ? 'مردانه' : 'زنانه',
      unit: isInchUnit ? 'اینچ' : 'سانتی‌متر',
      qp: el('qadPirahan') ? el('qadPirahan').value || '0' : '0',
      qe: el('qadEzar') ? el('qadEzar').value || '0' : '0',
      sleeve: el('astin') ? el('astin').value || '0' : '0',
      shoulder: el('shana') ? el('shana').value || '0' : '0',
      chest: el('baghal') ? el('baghal').value || '0' : '0',
      bodyStyle: el('bodyStyle') ? el('bodyStyle').value : 'motavaset',
      daman: el('outBarDaman') ? el('outBarDaman').textContent : '0',
      kheshtak: el('outKheshtak') ? el('outKheshtak').textContent : '0'
    };

    savedCustomers.push(record);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCustomers));
    } catch (error) {
      console.error('خطا در ذخیره‌سازی:', error);
    }

    updateCustomerTable();
    setOutput('statTotal', savedCustomers.length);
  }

  function updateCustomerTable() {
    const tbody = el('customerTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    setOutput('statTotal', savedCustomers.length);
    savedCustomers.forEach((customer) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${customer.name}</td>
        <td>${customer.phone}</td>
        <td>${customer.mode}</td>
        <td>${customer.qp}</td>
        <td>${customer.qe}</td>
        <td>${customer.daman}</td>
        <td>${customer.kheshtak}</td>
        <td><button type="button" onclick="deleteCustomer(${customer.id})">حذف</button></td>
      `;
      tbody.appendChild(row);
    });
  }

  function deleteCustomer(id) {
    savedCustomers = savedCustomers.filter((customer) => customer.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCustomers));
    } catch (error) {
      console.error('خطا در حذف مشتری:', error);
    }
    updateCustomerTable();
  }

  function clearAllData() {
    savedCustomers = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('خطا در پاک کردن داده‌ها:', error);
    }
    updateCustomerTable();
  }

  function bindEvents() {
    const qadPirahan = el('qadPirahan');
    const qadEzar = el('qadEzar');
    const bodyStyle = el('bodyStyle');
    const unitToggle = el('unitToggle');
    const tMen = el('tabMen');
    const tWomen = el('tabWomen');

    if (qadPirahan) qadPirahan.addEventListener('input', scheduleEngine);
    if (qadEzar) qadEzar.addEventListener('input', scheduleEngine);
    if (bodyStyle) bodyStyle.addEventListener('change', scheduleEngine);
    if (unitToggle) unitToggle.addEventListener('click', toggleUnitSystem);
    if (tMen) tMen.addEventListener('click', () => switchMode('men'));
    if (tWomen) tWomen.addEventListener('click', () => switchMode('women'));
  }

  function boot() {
    savedCustomers = safeReadCustomers();
    updateUnitText();
    updateCustomerTable();
    initChart();
    bindEvents();
    runEngine();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.switchMode = switchMode;
  window.runEngine = runEngine;
  window.toggleUnitSystem = toggleUnitSystem;
  window.saveCustomer = saveCustomer;
  window.deleteCustomer = deleteCustomer;
  window.clearAllData = clearAllData;
  window.initChart = initChart;
})();