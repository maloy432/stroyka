/**
 * TASHKENT ESTATE - Main Frontend Application Engine
 * Includes:
 * - Leaflet Map Integration (with grey-tile fix & resize listener)
 * - Dynamic Sticky Header on scroll
 * - Animated Counter-Up via IntersectionObserver
 * - Floating Action Button for Telegram
 * - USD $ ⟷ UZS сум Currency Switcher with dynamic price recalculation
 * - Wishlist (Favorites) System with localStorage & Telegram Export
 * - Real Estate Cost Calculator with Segmented Unit Toggle (м² ⟷ соток)
 * - Filter Synchronization between Hero & Catalog
 * - Robust Phone Input Mask (with Ctrl+A & Backspace fix)
 * - Booking & Callback Modal Windows
 */

// -------------------------------------------------------------
// ALWAYS START AT THE TOP ON REFRESH / RELOAD
// -------------------------------------------------------------
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

// -------------------------------------------------------------
// CONFIGURATION & GLOBAL STATE
// -------------------------------------------------------------
const CONFIG = {
  phone1: '+998 98 188 88 59',
  phone1Raw: '+998981888859',
  phone2: '+998 95 940 18 83',
  phone2Raw: '+998959401883',
  telegramUsername: 'Gafurjanovvv_u',
  exchangeRate: 12650, // 1 USD = 12,650 UZS
  get telegramUrl() {
    return `https://t.me/${this.telegramUsername}`;
  }
};

// Global state
let currentCurrency = localStorage.getItem('te_currency') || 'USD';
let currentCategory = 'all';
let currentDistrict = 'all';
let currentBudget = 'all';
let currentCalcUnit = 'm2'; // 'm2' or 'sotka'
let activeModalProperty = null;

// Wishlist Storage Helper
const Wishlist = {
  KEY: 'te_wishlist_ids',
  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  },
  has(id) {
    return this.get().includes(Number(id));
  },
  add(id) {
    const list = this.get();
    const numId = Number(id);
    if (!list.includes(numId)) {
      list.push(numId);
      localStorage.setItem(this.KEY, JSON.stringify(list));
    }
    updateWishlistCountBadges();
  },
  remove(id) {
    let list = this.get();
    const numId = Number(id);
    list = list.filter(item => item !== numId);
    localStorage.setItem(this.KEY, JSON.stringify(list));
    updateWishlistCountBadges();
  },
  toggle(id) {
    if (this.has(id)) {
      this.remove(id);
      return false;
    } else {
      this.add(id);
      return true;
    }
  }
};

// Catalog dataset
const PROPERTIES = [
  {
    id: 1,
    title: 'Коттедж 5 соток, евроремонт, 6 комнат',
    location: 'Мирзо-Улугбекский р-н, ориентир Циолковский',
    district: 'mirzo-ulugbek',
    category: 'houses',
    params: '5 соток • 380 м² • Въезд на 3 авто • Бассейн',
    rawPrice: 280000,
    badge: 'Эксклюзив',
    badgeClass: 'badge-exclusive',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    features: ['Бассейн 8х4 м', 'Зимняя кухня', 'Ландшафтный дизайн', 'Кадастр 100% готов']
  },
  {
    id: 2,
    title: '3-комнатная квартира в ЖК бизнес-класса',
    location: 'Яккасарайский р-н, ул. Шота Руставели',
    district: 'yakkasaray',
    category: 'apartments',
    params: '88 м² • 5/12 этаж • Кадастр готов',
    rawPrice: 115000,
    badge: 'Срочная продажа',
    badgeClass: 'badge-urgent',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    features: ['Премиум лифты Otis', 'Закрытый двор без машин', 'Рядом парк и супермаркеты']
  },
  {
    id: 3,
    title: 'Торговое помещение под шоурум или ресторан',
    location: 'Мирабадский р-н, первая линия',
    district: 'mirabad',
    category: 'commercial',
    params: '160 м² • Отдельный вход • Мощность 40 кВт',
    rawPrice: 290000,
    badge: 'Высокий трафик',
    badgeClass: 'badge-traffic',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    features: ['Витражные окна в пол', 'Готовая вытяжка', 'Интенсивный пешеходный поток']
  },
  {
    id: 4,
    title: 'Видовой пентхаус с панорамной террасой',
    location: 'Шайхантахурский р-н, Tashkent City, ЖК Boulevard',
    district: 'shaykhantakhur',
    category: 'apartments',
    params: '145 м² • 18/20 этаж • Дизайнерский ремонт',
    rawPrice: 260000,
    badge: 'Новинка',
    badgeClass: 'badge-new',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    features: ['Вид на парк и поющие фонтаны', 'Система «Умный дом»', '2 паркоместа']
  },
  {
    id: 5,
    title: 'Элитный особняк в махалле Юнусабад',
    location: 'Юнусабадский р-н, ориентир Зенит',
    district: 'yunusabad',
    category: 'houses',
    params: '6 соток • 450 м² • Сауна • Гараж на 2 авто',
    rawPrice: 340000,
    badge: 'Эксклюзив',
    badgeClass: 'badge-exclusive',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    features: ['Финская сауна', 'Зимний сад', 'Тихий респектабельный тупик']
  },
  {
    id: 6,
    title: 'Офисный особняк / Готовый арендный бизнес',
    location: 'Мирабадский р-н, ул. Нукусская',
    district: 'mirabad',
    category: 'commercial',
    params: '340 м² • 3 этажа • Парковка на 10 авто',
    rawPrice: 420000,
    badge: 'Высокий ROI',
    badgeClass: 'badge-traffic',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    features: ['Действующий надежный арендатор', 'Чистая доходность 11.5% годовых']
  }
];

// -------------------------------------------------------------
// PRICE & CURRENCY HELPERS
// -------------------------------------------------------------
function getFormattedPrice(usdAmount) {
  const uzsAmount = usdAmount * CONFIG.exchangeRate;
  if (currentCurrency === 'UZS') {
    return {
      main: uzsAmount.toLocaleString('ru-RU') + ' UZS',
      sub: '≈ $' + usdAmount.toLocaleString('en-US')
    };
  } else {
    return {
      main: '$' + usdAmount.toLocaleString('en-US'),
      sub: '≈ ' + uzsAmount.toLocaleString('ru-RU') + ' UZS'
    };
  }
}

function setCurrency(currency) {
  currentCurrency = currency;
  localStorage.setItem('te_currency', currency);
  updateCurrencyControls();
  renderCatalog();
  updateCalculatorPreview();
  
  // Update booking modal price if open
  if (activeModalProperty) {
    const prices = getFormattedPrice(activeModalProperty.rawPrice);
    const priceEl = document.getElementById('bookingModalPrice');
    if (priceEl) priceEl.textContent = `${prices.main} (${prices.sub})`;
  }
}

function updateCurrencyControls() {
  // Header buttons
  const hUsd = document.getElementById('headerCurrUsd');
  const hUzs = document.getElementById('headerCurrUzs');
  if (hUsd && hUzs) {
    if (currentCurrency === 'USD') {
      hUsd.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all duration-200 bg-blue-600 text-white shadow';
      hUzs.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all duration-200 text-slate-300 hover:text-white';
    } else {
      hUzs.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all duration-200 bg-blue-600 text-white shadow';
      hUsd.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all duration-200 text-slate-300 hover:text-white';
    }
  }

  // Catalog buttons
  const cUsd = document.getElementById('catCurrUsd');
  const cUzs = document.getElementById('catCurrUzs');
  if (cUsd && cUzs) {
    if (currentCurrency === 'USD') {
      cUsd.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-white text-slate-900 shadow-sm';
      cUzs.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900';
    } else {
      cUzs.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-white text-slate-900 shadow-sm';
      cUsd.className = 'px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900';
    }
  }
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  updateCurrencyControls();
  updateWishlistCountBadges();
  renderCatalog();
  initCategoryTabs();
  initDistrictFilter();
  initHeroFilter();
  initPhoneMasks();
  initCalculator();
  initModals();
  initMap();
  initMobileMenu();
  initStickyHeader();
  initCounters();
});

// -------------------------------------------------------------
// STICKY HEADER MICRO-ANIMATION
// -------------------------------------------------------------
function initStickyHeader() {
  const header = document.getElementById('siteHeader');
  const container = document.getElementById('headerContainer');
  if (!header || !container) return;

  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add('shadow-xl', 'shadow-slate-950/20', 'bg-slate-900/98', 'backdrop-blur-xl');
      header.classList.remove('bg-slate-900/90');
      container.classList.remove('h-20');
      container.classList.add('h-16');
    } else {
      header.classList.remove('shadow-xl', 'shadow-slate-950/20', 'bg-slate-900/98');
      header.classList.add('bg-slate-900/90');
      container.classList.remove('h-16');
      container.classList.add('h-20');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// -------------------------------------------------------------
// ANIMATED COUNTER-UP (INTERSECTION OBSERVER)
// -------------------------------------------------------------
function initCounters() {
  const counterContainer = document.getElementById('counterSection');
  if (!counterContainer) return;

  const counters = counterContainer.querySelectorAll('.stat-counter');
  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        counters.forEach(counter => {
          const target = parseInt(counter.dataset.target, 10) || 0;
          const suffix = counter.dataset.suffix || '';
          const prefix = counter.dataset.prefix || '';
          const duration = 1600;
          const startTime = performance.now();

          function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * ease);
            counter.textContent = `${prefix}${current}${suffix}`;

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              counter.textContent = `${prefix}${target}${suffix}`;
            }
          }

          requestAnimationFrame(animate);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.25 });

  observer.observe(counterContainer);
}

// -------------------------------------------------------------
// CATALOG RENDERING & FILTERING
// -------------------------------------------------------------
function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  const wishlistIds = Wishlist.get();

  const filtered = PROPERTIES.filter(item => {
    if (currentCategory === 'favorites') {
      return wishlistIds.includes(item.id);
    }

    const matchCategory = currentCategory === 'all' || item.category === currentCategory;
    const matchDistrict = currentDistrict === 'all' || item.district === currentDistrict;
    
    let matchBudget = true;
    if (currentBudget === 'up100') matchBudget = item.rawPrice <= 100000;
    else if (currentBudget === '100to200') matchBudget = item.rawPrice > 100000 && item.rawPrice <= 200000;
    else if (currentBudget === '200to350') matchBudget = item.rawPrice > 200000 && item.rawPrice <= 350000;
    else if (currentBudget === 'from350') matchBudget = item.rawPrice > 350000;

    return matchCategory && matchDistrict && matchBudget;
  });

  if (filtered.length === 0) {
    if (currentCategory === 'favorites') {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-100 p-8 shadow-sm animate-fade-in">
          <div class="w-16 h-16 mx-auto mb-4 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
            <i data-lucide="heart-off" class="w-8 h-8"></i>
          </div>
          <h4 class="text-xl font-bold text-slate-800 mb-2">В избранном пока нет объектов</h4>
          <p class="text-slate-500 max-w-md mx-auto mb-6">Нажимайте на сердечко на карточках объектов, чтобы сохранять их и отправлять риелтору единым списком.</p>
          <button onclick="setCategoryTab('all')" class="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition duration-200">
            <i data-lucide="layers" class="w-4 h-4"></i>
            Перейти ко всем объектам
          </button>
        </div>
      `;
    } else {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-100 p-8 shadow-sm animate-fade-in">
          <div class="w-16 h-16 mx-auto mb-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <i data-lucide="search-x" class="w-8 h-8"></i>
          </div>
          <h4 class="text-xl font-bold text-slate-800 mb-2">Объектов по данным фильтрам не найдено</h4>
          <p class="text-slate-500 max-w-md mx-auto mb-6">В нашей закрытой базе более 150 неопубликованных объектов. Напишите нам в Telegram — подберем персонально под ваш запрос!</p>
          <a href="${getTelegramLink('Здравствуйте! По моим параметрам в открытом каталоге нет объектов. Подберите, пожалуйста, из закрытой базы.')}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1e8bc2] text-white font-semibold px-6 py-3 rounded-xl transition duration-200">
            <i data-lucide="send" class="w-4 h-4"></i>
            Запросить подбор в Telegram
          </a>
        </div>
      `;
    }
    lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map((item, index) => {
    const isFav = wishlistIds.includes(item.id);
    const prices = getFormattedPrice(item.rawPrice);

    return `
      <div class="bg-white rounded-2xl overflow-hidden card-shadow border border-slate-100 flex flex-col transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-2xl hover:border-blue-400/30 animate-fade-in" style="animation-delay: ${index * 60}ms;">
        <div class="relative aspect-[16/10] overflow-hidden bg-slate-100">
          <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/25 pointer-events-none"></div>
          
          <!-- Badges -->
          <div class="absolute top-4 left-4 flex gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md ${item.badgeClass} group-hover:scale-105 transition-transform">
              ${item.badge}
            </span>
          </div>

          <!-- Top Right Controls: Wishlist Heart & Telegram Share -->
          <div class="absolute top-4 right-4 flex items-center gap-2">
            <!-- Wishlist Toggle Heart -->
            <button onclick="handleWishlistClick(${item.id}, event)" 
                    title="${isFav ? 'Удалить из избранного' : 'Добавить в избранное'}"
                    class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md backdrop-blur ${isFav ? 'bg-white text-rose-500 shadow-rose-500/20' : 'bg-slate-900/60 hover:bg-white text-white hover:text-rose-500'}">
              <i data-lucide="heart" class="w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}"></i>
            </button>

            <!-- Telegram Direct Inquiry -->
            <a href="${getTelegramLink(`Здравствуйте! Меня интересует объект: «${item.title}» (${prices.main}, ${item.location}). Хочу узнать подробнее.`)}" 
               target="_blank" 
               rel="noopener noreferrer"
               title="Спросить в Telegram"
               class="w-10 h-10 rounded-full bg-slate-900/60 hover:bg-[#229ED9] text-white backdrop-blur flex items-center justify-center transition-all shadow-md">
              <i data-lucide="send" class="w-4 h-4"></i>
            </a>
          </div>

          <div class="absolute bottom-3 left-4 right-4 text-white text-xs flex items-center gap-1.5 drop-shadow-md">
            <i data-lucide="map-pin" class="w-4 h-4 text-blue-400 shrink-0"></i>
            <span class="truncate font-medium">${item.location}</span>
          </div>
        </div>

        <div class="p-6 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2 leading-snug">
              ${item.title}
            </h3>
            
            <p class="text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 mb-4 border border-slate-100 font-medium">
              <span class="inline-block text-blue-600 mr-1">✦</span> ${item.params}
            </p>

            <ul class="space-y-1.5 mb-5 text-xs text-slate-500">
              ${item.features.map(f => `
                <li class="flex items-center gap-1.5">
                  <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i>
                  <span>${f}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="pt-4 border-t border-slate-100">
            <div class="flex items-baseline justify-between mb-4">
              <div>
                <span class="text-2xl font-extrabold text-slate-900 tracking-tight">${prices.main}</span>
                <span class="block text-xs font-medium text-slate-400">${prices.sub}</span>
              </div>
              <span class="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                0% комиссия
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button onclick="openBookingModal(${item.id})" class="w-full btn-touch bg-slate-900 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200">
                <i data-lucide="calendar" class="w-4 h-4"></i>
                <span>Просмотр</span>
              </button>
              <a href="${getTelegramLink(`Здравствуйте! Хочу посмотреть объект: «${item.title}» (${prices.main}). Когда удобно организовать выезд?`)}" target="_blank" rel="noopener noreferrer" class="w-full btn-touch bg-[#229ED9] hover:bg-[#1a8bc4] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200">
                <i data-lucide="send" class="w-4 h-4"></i>
                <span>Telegram</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// -------------------------------------------------------------
// CATEGORY TABS & FILTER SYNCHRONIZATION
// -------------------------------------------------------------
function setCategoryTab(category) {
  currentCategory = category;

  // Update Catalog Tabs Styling
  document.querySelectorAll('.category-tab').forEach(tab => {
    if (tab.dataset.category === category) {
      tab.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-100');
      tab.classList.add('bg-slate-900', 'text-white', 'shadow-md');
    } else {
      tab.classList.remove('bg-slate-900', 'text-white', 'shadow-md');
      tab.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-100');
    }
  });

  // Synchronize with Hero Type Selector
  const heroType = document.getElementById('heroType');
  if (heroType) {
    if (category === 'favorites') {
      // Keep hero type as all or unchanged
    } else {
      heroType.value = category;
    }
  }

  renderCatalog();
}

function initCategoryTabs() {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setCategoryTab(tab.dataset.category);
    });
  });
}

function initDistrictFilter() {
  const districtSelect = document.getElementById('catalogDistrictSelect');
  const heroDistrict = document.getElementById('heroDistrict');

  if (districtSelect) {
    districtSelect.addEventListener('change', (e) => {
      currentDistrict = e.target.value;
      // Synchronize with Hero District
      if (heroDistrict) {
        heroDistrict.value = e.target.value;
      }
      renderCatalog();
    });
  }
}

function initHeroFilter() {
  const heroBtn = document.getElementById('heroSearchBtn');
  const heroType = document.getElementById('heroType');
  const heroDistrict = document.getElementById('heroDistrict');
  const heroBudget = document.getElementById('heroBudget');
  const tabBuy = document.getElementById('heroTabBuy');
  const tabSell = document.getElementById('heroTabSell');

  let mode = 'buy';

  // 1. Synchronize Hero Type change with Catalog
  if (heroType) {
    heroType.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      document.querySelectorAll('.category-tab').forEach(tab => {
        if (tab.dataset.category === e.target.value) {
          tab.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-100');
          tab.classList.add('bg-slate-900', 'text-white', 'shadow-md');
        } else {
          tab.classList.remove('bg-slate-900', 'text-white', 'shadow-md');
          tab.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-100');
        }
      });
      renderCatalog();
    });
  }

  // 2. Synchronize Hero District change with Catalog District
  if (heroDistrict) {
    heroDistrict.addEventListener('change', (e) => {
      currentDistrict = e.target.value;
      const catalogDistSelect = document.getElementById('catalogDistrictSelect');
      if (catalogDistSelect) catalogDistSelect.value = e.target.value;
      renderCatalog();
    });
  }

  // 3. Hero Buy / Sell Tabs
  if (tabBuy && tabSell) {
    tabBuy.addEventListener('click', () => {
      mode = 'buy';
      tabBuy.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
      tabBuy.classList.remove('text-slate-300');
      tabSell.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
      tabSell.classList.add('text-slate-300');
      if (heroBtn) heroBtn.innerHTML = `<span>Найти варианты</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
      lucide.createIcons();
    });

    tabSell.addEventListener('click', () => {
      mode = 'sell';
      tabSell.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
      tabSell.classList.remove('text-slate-300');
      tabBuy.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
      tabBuy.classList.add('text-slate-300');
      if (heroBtn) heroBtn.innerHTML = `<span>Оценить и продать</span><i data-lucide="trending-up" class="w-4 h-4"></i>`;
      lucide.createIcons();
    });
  }

  // 4. Hero Search Button Click
  if (heroBtn) {
    heroBtn.addEventListener('click', () => {
      if (mode === 'sell') {
        const calcSection = document.getElementById('calculator');
        if (calcSection) {
          calcSection.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      const typeVal = heroType ? heroType.value : 'all';
      currentCategory = typeVal;

      document.querySelectorAll('.category-tab').forEach(t => {
        if (t.dataset.category === typeVal) {
          t.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-100');
          t.classList.add('bg-slate-900', 'text-white', 'shadow-md');
        } else {
          t.classList.remove('bg-slate-900', 'text-white', 'shadow-md');
          t.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-100');
        }
      });

      if (heroDistrict) {
        currentDistrict = heroDistrict.value;
        const catalogDistSelect = document.getElementById('catalogDistrictSelect');
        if (catalogDistSelect) catalogDistSelect.value = heroDistrict.value;
      }

      if (heroBudget) {
        currentBudget = heroBudget.value;
      }

      renderCatalog();

      const catalogEl = document.getElementById('catalog');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

// -------------------------------------------------------------
// WISHLIST (FAVORITES) LOGIC
// -------------------------------------------------------------
function updateWishlistCountBadges() {
  const count = Wishlist.get().length;
  const headerBadge = document.getElementById('headerWishlistBadge');
  const tabBadge = document.getElementById('tabWishlistBadge');

  if (headerBadge) {
    headerBadge.textContent = count;
    if (count > 0) {
      headerBadge.classList.remove('hidden');
    } else {
      headerBadge.classList.add('hidden');
    }
  }

  if (tabBadge) {
    tabBadge.textContent = count;
  }
}

function handleWishlistClick(id, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const isAdded = Wishlist.toggle(id);
  const prop = PROPERTIES.find(p => p.id === Number(id));
  const title = prop ? `«${prop.title}»` : 'Объект';

  if (isAdded) {
    showToast(`${title} добавлен в избранное ❤️`);
  } else {
    showToast(`${title} удален из избранного`);
  }

  renderCatalog();
  renderWishlistModalItems();
}

function openWishlistModal() {
  closeAllModals();
  renderWishlistModalItems();
  const modal = document.getElementById('wishlistModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function renderWishlistModalItems() {
  const container = document.getElementById('wishlistItemsContainer');
  const footer = document.getElementById('wishlistFooter');
  if (!container) return;

  const wishlistIds = Wishlist.get();
  const items = PROPERTIES.filter(p => wishlistIds.includes(p.id));

  if (items.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center">
        <div class="w-14 h-14 mx-auto mb-3 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
          <i data-lucide="heart" class="w-7 h-7"></i>
        </div>
        <h4 class="text-base font-bold text-slate-800">Список избранного пуст</h4>
        <p class="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Добавляйте объекты нажатием на сердечко в каталоге, чтобы быстро отправить их риелтору.</p>
      </div>
    `;
    if (footer) footer.classList.add('hidden');
    lucide.createIcons();
    return;
  }

  if (footer) footer.classList.remove('hidden');

  container.innerHTML = items.map(item => {
    const prices = getFormattedPrice(item.rawPrice);
    return `
      <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 group hover:border-slate-200 transition">
        <div class="flex items-center gap-3 min-w-0">
          <img src="${item.image}" alt="${item.title}" class="w-16 h-16 rounded-xl object-cover shrink-0">
          <div class="min-w-0">
            <h5 class="text-xs sm:text-sm font-bold text-slate-900 truncate">${item.title}</h5>
            <p class="text-[11px] text-slate-500 truncate">${item.location}</p>
            <div class="mt-0.5 flex items-baseline gap-1.5">
              <span class="text-xs sm:text-sm font-extrabold text-blue-600">${prices.main}</span>
              <span class="text-[10px] text-slate-400">${prices.sub}</span>
            </div>
          </div>
        </div>

        <button onclick="handleWishlistClick(${item.id}, event)" title="Удалить из избранного" class="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white transition shrink-0">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function sendWishlistToTelegram() {
  const wishlistIds = Wishlist.get();
  const items = PROPERTIES.filter(p => wishlistIds.includes(p.id));
  if (items.length === 0) return;

  let message = `Здравствуйте! Меня заинтересовали объекты из каталога Tashkent Estate (${items.length} шт.):%0A%0A`;
  items.forEach((item, index) => {
    const prices = getFormattedPrice(item.rawPrice);
    message += `${index + 1}. *${encodeURIComponent(item.title)}*%0A` +
               `   Локация: ${encodeURIComponent(item.location)}%0A` +
               `   Цена: ${encodeURIComponent(prices.main)}%0A%0A`;
  });
  message += `Пожалуйста, подскажите актуальность данных объектов и когда удобно организовать выезд на просмотр.`;

  window.open(`https://t.me/${CONFIG.telegramUsername}?text=${message}`, '_blank');
}

// -------------------------------------------------------------
// PHONE MASK & INPUT HANDLING (ROBUST ERASE & CTRL+A)
// -------------------------------------------------------------
function initPhoneMasks() {
  const inputs = document.querySelectorAll('input[type="tel"]');
  inputs.forEach(input => {
    input.setAttribute('inputmode', 'tel');
    input.placeholder = '+998 (__) ___-__-__';

    input.addEventListener('focus', () => {
      if (!input.value.trim()) {
        input.value = '+998 ';
      }
    });

    input.addEventListener('blur', () => {
      const digits = input.value.replace(/\D/g, '');
      if (digits.length <= 3) {
        input.value = '';
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selLen = input.selectionEnd - input.selectionStart;
        // If user selected all or almost all text, clear completely
        if (selLen >= input.value.length - 1) {
          input.value = '';
          return;
        }
        if (input.value === '+998 ' || input.value === '+998') {
          e.preventDefault();
          input.value = '';
          return;
        }
      }
    });

    input.addEventListener('input', (e) => {
      let val = input.value.replace(/\D/g, '');

      // If completely erased or backspaced below prefix
      if (val.length === 0 || (e.inputType && e.inputType.startsWith('delete') && val.length <= 3)) {
        input.value = '';
        return;
      }

      if (val.startsWith('998')) {
        val = val.substring(3);
      }

      if (val.length === 0) {
        input.value = '+998 ';
        return;
      }

      let formatted = '+998 (' + val.substring(0, 2);
      if (val.length >= 2) {
        formatted += ') ' + val.substring(2, 5);
      }
      if (val.length >= 5) {
        formatted += '-' + val.substring(5, 7);
      }
      if (val.length >= 7) {
        formatted += '-' + val.substring(7, 9);
      }
      input.value = formatted;
    });
  });
}

// -------------------------------------------------------------
// CALCULATOR WITH UNIT TOGGLE (м² ⟷ соток)
// -------------------------------------------------------------
function setCalcUnit(unit) {
  currentCalcUnit = unit;
  const btnM2 = document.getElementById('calcUnitM2');
  const btnSotka = document.getElementById('calcUnitSotka');
  const unitLabel = document.getElementById('calcAreaUnitLabel');
  const areaInput = document.getElementById('calcArea');

  if (unit === 'm2') {
    if (btnM2) btnM2.className = 'px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all bg-blue-600 text-white shadow-sm';
    if (btnSotka) btnSotka.className = 'px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all text-slate-400 hover:text-white';
    if (unitLabel) unitLabel.textContent = 'м²';
    if (areaInput) areaInput.placeholder = 'Например: 85';
  } else {
    if (btnSotka) btnSotka.className = 'px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all bg-blue-600 text-white shadow-sm';
    if (btnM2) btnM2.className = 'px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all text-slate-400 hover:text-white';
    if (unitLabel) unitLabel.textContent = 'соток';
    if (areaInput) areaInput.placeholder = 'Например: 6';
  }

  updateCalculatorPreview();
}

const DISTRICT_RATES = {
  'mirabad': { m2Min: 1400, m2Max: 2200, sotkaMin: 35000, sotkaMax: 65000 },
  'yakkasaray': { m2Min: 1300, m2Max: 1900, sotkaMin: 30000, sotkaMax: 55000 },
  'mirzo-ulugbek': { m2Min: 1200, m2Max: 1800, sotkaMin: 28000, sotkaMax: 50000 },
  'shaykhantakhur': { m2Min: 1300, m2Max: 2100, sotkaMin: 32000, sotkaMax: 58000 },
  'yunusabad': { m2Min: 1050, m2Max: 1550, sotkaMin: 25000, sotkaMax: 42000 },
  'chilanzar': { m2Min: 950, m2Max: 1400, sotkaMin: 22000, sotkaMax: 38000 },
  'uchtepa': { m2Min: 850, m2Max: 1200, sotkaMin: 18000, sotkaMax: 30000 },
  'sergeli': { m2Min: 800, m2Max: 1150, sotkaMin: 15000, sotkaMax: 25000 },
  'yashnabad': { m2Min: 900, m2Max: 1350, sotkaMin: 18000, sotkaMax: 32000 }
};

function updateCalculatorPreview() {
  const typeSelect = document.getElementById('calcType');
  const districtSelect = document.getElementById('calcDistrict');
  const areaInput = document.getElementById('calcArea');
  const resultContainer = document.getElementById('calcResultBox');
  const resultRange = document.getElementById('calcResultPrice');
  const resultRangeSub = document.getElementById('calcResultPriceSub');
  const calcTgBtn = document.getElementById('calcTgBtn');
  const calcPhone = document.getElementById('calcPhone');

  if (!typeSelect || !districtSelect || !areaInput) return;

  const type = typeSelect.value;
  const district = districtSelect.value;
  const area = parseFloat(areaInput.value) || 0;
  const rates = DISTRICT_RATES[district] || DISTRICT_RATES['mirabad'];

  let minPriceUsd = 0;
  let maxPriceUsd = 0;

  // Transparent calculation without arbitrary area <= 30 heuristics
  if (type === 'house' || type === 'land') {
    let sotka = 0;
    if (currentCalcUnit === 'sotka') {
      sotka = area;
    } else {
      // If area is in m², 1 sotka = 100 m²
      sotka = area / 100;
    }

    minPriceUsd = Math.round(sotka * rates.sotkaMin);
    maxPriceUsd = Math.round(sotka * rates.sotkaMax);

    if (type === 'house') {
      minPriceUsd += Math.round(sotka * 15000);
      maxPriceUsd += Math.round(sotka * 35000);
    }
  } else {
    let multiplier = 1;
    if (type === 'commercial') multiplier = 1.35;
    if (type === 'apartment_old') multiplier = 0.85;

    let m2Area = 0;
    if (currentCalcUnit === 'sotka') {
      m2Area = area * 100;
    } else {
      m2Area = area;
    }

    minPriceUsd = Math.round(m2Area * rates.m2Min * multiplier);
    maxPriceUsd = Math.round(m2Area * rates.m2Max * multiplier);
  }

  if (area > 0 && minPriceUsd > 0) {
    const minUzs = minPriceUsd * CONFIG.exchangeRate;
    const maxUzs = maxPriceUsd * CONFIG.exchangeRate;

    if (resultRange && resultRangeSub) {
      if (currentCurrency === 'UZS') {
        resultRange.textContent = `${minUzs.toLocaleString('ru-RU')} - ${maxUzs.toLocaleString('ru-RU')} UZS`;
        resultRangeSub.textContent = `≈ $${minPriceUsd.toLocaleString('en-US')} - $${maxPriceUsd.toLocaleString('en-US')}`;
      } else {
        resultRange.textContent = `$${minPriceUsd.toLocaleString('en-US')} - $${maxPriceUsd.toLocaleString('en-US')}`;
        resultRangeSub.textContent = `≈ ${minUzs.toLocaleString('ru-RU')} - ${maxUzs.toLocaleString('ru-RU')} UZS`;
      }
    }

    if (resultContainer) {
      resultContainer.classList.remove('hidden');
    }

    const typeText = typeSelect.options[typeSelect.selectedIndex].text;
    const districtText = districtSelect.options[districtSelect.selectedIndex].text;
    const phoneVal = calcPhone ? calcPhone.value : '';
    const unitName = currentCalcUnit === 'sotka' ? 'соток' : 'м²';

    const msg = `Здравствуйте! Хочу получить экспресс-оценку недвижимости в Ташкенте:%0A` +
      `• Тип объекта: ${encodeURIComponent(typeText)}%0A` +
      `• Район: ${encodeURIComponent(districtText)}%0A` +
      `• Площадь: ${area} ${encodeURIComponent(unitName)}%0A` +
      `• Расчетный диапазон: $${minPriceUsd.toLocaleString('en-US')} - $${maxPriceUsd.toLocaleString('en-US')}%0A` +
      (phoneVal ? `• Телефон для связи: ${encodeURIComponent(phoneVal)}%0A` : '') +
      `Жду консультацию эксперта Tashkent Estate.`;

    if (calcTgBtn) {
      calcTgBtn.href = `https://t.me/${CONFIG.telegramUsername}?text=${msg}`;
    }
  } else {
    if (resultContainer) resultContainer.classList.add('hidden');
    if (calcTgBtn) {
      calcTgBtn.href = getTelegramLink('Здравствуйте! Хочу получить экспресс-оценку стоимости моей недвижимости в Ташкенте.');
    }
  }
}

function initCalculator() {
  const typeSelect = document.getElementById('calcType');
  const districtSelect = document.getElementById('calcDistrict');
  const areaInput = document.getElementById('calcArea');
  const calcPhone = document.getElementById('calcPhone');

  if (typeSelect) typeSelect.addEventListener('change', updateCalculatorPreview);
  if (districtSelect) districtSelect.addEventListener('change', updateCalculatorPreview);
  if (areaInput) areaInput.addEventListener('input', updateCalculatorPreview);
  if (calcPhone) calcPhone.addEventListener('input', updateCalculatorPreview);
}

// -------------------------------------------------------------
// MODALS HANDLING
// -------------------------------------------------------------
function initModals() {
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  const callbackForm = document.getElementById('callbackForm');
  if (callbackForm) {
    callbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('callbackName').value;
      const phone = document.getElementById('callbackPhone').value;
      closeAllModals();
      showToast(`Спасибо, ${name}! Мы свяжемся с вами по номеру ${phone} в течение 10 минут.`);
      callbackForm.reset();
    });
  }

  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('bookingName').value;
      const objTitle = activeModalProperty ? activeModalProperty.title : 'Объект';
      closeAllModals();
      showToast(`Заявка на просмотр «${objTitle}» принята! Риелтор свяжется с вами.`);
      bookingForm.reset();
    });
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName').value;
      showToast(`Спасибо, ${name}! Ваша заявка успешно отправлена.`);
      contactForm.reset();
    });
  }
}

function openCallbackModal() {
  closeAllModals();
  const modal = document.getElementById('callbackModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const input = modal.querySelector('input[type="text"]');
    if (input) setTimeout(() => input.focus(), 100);
  }
}

function openBookingModal(propertyId) {
  closeAllModals();
  const prop = PROPERTIES.find(p => p.id === propertyId);
  activeModalProperty = prop;

  const modal = document.getElementById('bookingModal');
  if (modal && prop) {
    const titleEl = document.getElementById('bookingModalTitle');
    const priceEl = document.getElementById('bookingModalPrice');
    const locEl = document.getElementById('bookingModalLoc');
    const imgEl = document.getElementById('bookingModalImg');
    const tgBtn = document.getElementById('bookingTgDirectBtn');

    const prices = getFormattedPrice(prop.rawPrice);

    if (titleEl) titleEl.textContent = prop.title;
    if (priceEl) priceEl.textContent = `${prices.main} (${prices.sub})`;
    if (locEl) locEl.textContent = prop.location;
    if (imgEl) imgEl.src = prop.image;

    if (tgBtn) {
      tgBtn.href = getTelegramLink(`Здравствуйте! Хочу записаться на просмотр объекта: «${prop.title}» (${prices.main}, ${prop.location}).`);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function openCallSelectorModal() {
  closeAllModals();
  const modal = document.getElementById('callSelectorModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });
}

// Toast Notification System
function showToast(message) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'fixed top-6 right-6 z-50 max-w-sm bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 transition-all duration-300 transform translate-y-[-20px] opacity-0 pointer-events-none';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
      <i data-lucide="check-circle" class="w-5 h-5"></i>
    </div>
    <div class="text-sm font-medium leading-snug">${message}</div>
  `;
  lucide.createIcons();

  toast.classList.remove('translate-y-[-20px]', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.add('translate-y-[-20px]', 'opacity-0', 'pointer-events-none');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 4200);
}

function getTelegramLink(message) {
  const encoded = encodeURIComponent(message || 'Здравствуйте! Интересует недвижимость в Ташкенте.');
  return `https://t.me/${CONFIG.telegramUsername}?text=${encoded}`;
}

// -------------------------------------------------------------
// LEAFLET MAP (WITH INVALIDATESIZE FIX & RESIZE LISTENER)
// -------------------------------------------------------------
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  const officeCoords = [41.2995, 69.2720];

  const map = L.map('map', {
    center: officeCoords,
    zoom: 14,
    scrollWheelZoom: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | © OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Fix 1: Invalidate size after DOM layout & fonts are settled to prevent grey tiles
  setTimeout(() => {
    map.invalidateSize();
  }, 350);

  // Fix 2: Window resize listener for responsive grid adjustments & mobile orientation
  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  }, { passive: true });

  const customIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div class="w-10 h-10 bg-[#0F172A] border-2 border-blue-500 rounded-full flex items-center justify-center text-white shadow-xl transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const marker = L.marker(officeCoords, { icon: customIcon }).addTo(map);

  marker.bindPopup(`
    <div class="text-slate-900 py-1">
      <div class="font-bold text-sm text-slate-900 mb-1">TASHKENT ESTATE — Главный Офис</div>
      <div class="text-xs text-slate-500 mb-2">г. Ташкент, Мирабадский р-н, ул. Афросиаб, 14</div>
      <div class="space-y-1 mb-3 text-xs">
        <div><a href="tel:${CONFIG.phone1Raw}" class="font-bold text-blue-600 hover:underline">${CONFIG.phone1}</a></div>
        <div><a href="tel:${CONFIG.phone2Raw}" class="font-bold text-blue-600 hover:underline">${CONFIG.phone2}</a></div>
      </div>
      <div class="flex gap-2">
        <a href="https://yandex.uz/maps/?text=Ташкент+улица+Афросиаб+14" target="_blank" rel="noopener noreferrer" class="text-xs bg-slate-900 text-white px-2.5 py-1.5 rounded-md font-medium hover:bg-blue-600 transition">
          Яндекс.Карты ↗
        </a>
        <a href="${CONFIG.telegramUrl}" target="_blank" rel="noopener noreferrer" class="text-xs bg-[#229ED9] text-white px-2.5 py-1.5 rounded-md font-medium hover:bg-[#1b81b3] transition">
          Telegram
        </a>
      </div>
    </div>
  `).openPopup();
}

// -------------------------------------------------------------
// MOBILE NAVIGATION
// -------------------------------------------------------------
function initMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.add('hidden');
      });
    });
  }
}
