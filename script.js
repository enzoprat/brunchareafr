/* ===================================================================
   BRUNCH AREA — interactions
   =================================================================== */
(function () {
  'use strict';

  /* ---------- DONNÉES MENU ---------- */
  const MENU = [
    {
      cat: 'salee', emoji: '🍔', title: 'Smash Burgers',
      items: [
        { n: 'Smash Burger Classic', d: 'Steaks smashés, cheddar fondant, salade, tomate, sauce crème maison, oignons confits.', p: '12,50 €', alt: '14,90 € avec Patatarea' },
        { n: 'Smash Burger Bacon Fines Herbes', d: 'Cheddar fondant, bacon croustillant, sauce crème maison, salade, tomate, oignons confits.', p: '13,50 €', alt: '15,90 € avec Patatarea' },
        { n: 'Smash Burger Avocado', d: 'Cheddar fondant, avocat frais, salade, tomate, sauce crème maison, oignons confits.', p: '13,50 €', alt: '15,90 € avec Patatarea' },
        { n: 'Smash Burger Chèvre Miel', d: 'Chèvre fondant, miel, salade, tomate, sauce crème maison, oignons confits.', p: '13,50 €', alt: '15,90 € avec Patatarea' },
      ]
    },
    {
      cat: 'salee', emoji: '🥪', title: 'Tartines', note: 'Toutes nos tartines sont servies par deux.',
      items: [
        { n: 'Tartine Avocat & Saumon Fumé', d: 'Pain au levain toasté à l\'huile d\'olive, avocat frais, saumon fumé et fromage frais.', p: '14,00 €' },
        { n: 'Tartine Œuf Bacon', d: 'Pain au levain toasté, œufs brouillés, bacon croustillant, fromage frais, oignons confits et figue.', p: '14,00 €' },
        { n: 'Tartine Burrata', d: 'Pain au levain toasté, guacamole maison, tomate et burrata au pesto.', p: '15,00 €' },
      ]
    },
    {
      cat: 'salee', emoji: '🍳', title: 'Œufs Bénédictes & Brunchie',
      items: [
        { n: 'Œufs Bénédictes', d: 'Œufs pochés, sauce fromagère maison, sur pains muffins ronds, avec saumon ou bacon au choix.', p: '14,50 €' },
        { n: 'Assiette Brunchie', d: 'Œufs brouillés ou au plat, feta, bacon ou saumon, roquette, fruits du moment, crème balsamique et tartines.', p: '14,50 €', alt: 'Option veggie avec Patatarea' },
      ]
    },
    {
      cat: 'salee', emoji: '🥚', title: 'Egg Muffins',
      items: [
        { n: 'Classique', d: 'Le muffin signature, généreux et fondant.', p: '6,90 €', alt: '9,90 € avec Patatarea' },
        { n: 'Bacon', d: 'Avec bacon croustillant.', p: '7,90 €', alt: '10,90 € avec Patatarea' },
        { n: 'Saumon', d: 'Avec saumon fumé.', p: '7,90 €', alt: '10,90 € avec Patatarea' },
      ]
    },
    {
      cat: 'salee', emoji: '🧀', title: 'Crocs Monsieur', note: 'Tous nos crocs sont préparés avec emmental et béchamel maison.',
      items: [
        { n: 'Bacon', d: 'Bacon croustillant, emmental, béchamel maison.', p: '7,90 €', alt: '10,90 € avec Patatarea' },
        { n: 'Saumon', d: 'Saumon, emmental, béchamel maison.', p: '7,90 €', alt: '10,90 € avec Patatarea' },
        { n: 'Chèvre-Miel', d: 'Chèvre, miel, emmental, béchamel maison.', p: '7,90 €', alt: '10,90 € avec Patatarea' },
      ]
    },
    {
      cat: 'salee', emoji: '🌯', title: 'Le Sambi', note: 'Msemen (crêpe du Maghreb) farci. 12,90 € — 16,00 € avec Patatarea.',
      items: [
        { n: 'Poulet Mariné / Feta', d: 'Poulet mariné aux épices et huile d\'olive, fromage frais / feta, abricot et oignons confits.', p: '12,90 €' },
        { n: 'Viande Hachée / Mozza', d: 'Viande hachée marinée aux dattes, boursin / mozzarella et oignons confits.', p: '12,90 €' },
        { n: 'Saumon / Feta', d: 'Saumon, feta, herbes fraîches et oignons confits.', p: '12,90 €' },
        { n: 'Œufs Brouillés / Mozza', d: 'Œufs brouillés fondants, cumin, mozzarella et oignons confits.', p: '12,90 €' },
      ]
    },
    {
      cat: 'salee', emoji: '🥞', title: 'Le Dakasoula', note: 'Pancakes faits maison (x3), guacamole, oignons confits, sauce crème maison, cheddar, œuf au plat et sirop d\'érable.',
      items: [
        { n: 'Lardons', d: 'La version généreuse aux lardons.', p: '13,90 €' },
        { n: 'Saumon', d: 'La version au saumon fumé.', p: '13,90 €' },
      ]
    },
    {
      cat: 'salee', emoji: '🥯', title: 'Le Crof\'sou', note: 'Sandwich à base de Croffle.',
      items: [
        { n: 'Lardons', d: 'Croffle garni de lardon, œuf, fromage frais, tomate et figue.', p: '13,90 €' },
        { n: 'Saumon', d: 'Croffle garni de saumon, œuf, fromage frais, avocat, tomate et pesto.', p: '13,90 €' },
      ]
    },
    {
      cat: 'sucree', emoji: '🥞', title: 'Les Bases',
      items: [
        { n: 'Pancakes', d: 'Moelleux et généreux, à napper et garnir au choix.', p: '9,50 €' },
        { n: 'Pain Perdu', d: 'Le classique réconfortant, façon maison.', p: '8,50 €' },
        { n: 'Msemen', d: 'Crêpe feuilletée du Maghreb.', p: '6,90 €' },
        { n: 'Msemen Nature', d: 'Crêpe feuilletée nature.', p: '2,50 €' },
        { n: 'Croffle', d: 'Gaufre à base de pâte à croissant.', p: '6,90 €' },
        { n: 'Bol de Muesli', d: 'Fromage blanc au muesli, fruits du moment, miel ou sirop d\'érable.', p: '6,90 €' },
      ]
    },
    {
      cat: 'sucree', emoji: '🍯', title: 'Nappages, Toppings & Suppléments', note: 'À composer sur votre base sucrée.',
      items: [
        { n: 'Nappages', d: 'Fruits rouges · Fruit de la passion · Nutella · Caramel beurre salé · Sirop d\'érable · Miel.', p: 'inclus' },
        { n: 'Toppings', d: 'Fruits du moment · Oreo · Spéculoos.', p: 'inclus' },
        { n: 'Chantilly', d: 'Supplément gourmand.', p: '+1,00 €' },
        { n: 'Boule de glace vanille', d: 'Pour encore plus de plaisir.', p: '+1,50 €' },
      ]
    },
    {
      cat: 'boissons', emoji: '🥤', title: 'Jus Frais',
      items: [
        { n: 'Orange Pressé', d: 'Pressé minute.', p: '3,50 €' },
        { n: 'Orange / Fraise', d: '', p: '4,90 €' },
        { n: 'Avocat / Dattes', d: 'Onctueux et énergisant.', p: '5,50 €' },
        { n: 'Orange / Banane', d: '', p: '4,90 €' },
        { n: 'Bissap', d: 'Boisson d\'hibiscus.', p: '4,90 €' },
      ]
    },
    {
      cat: 'boissons', emoji: '☕', title: 'Boissons Chaudes',
      items: [
        { n: 'Thé à la Menthe', d: '', p: '2,50 €' },
        { n: 'Expresso / Allongé', d: '', p: '1,70 €' },
        { n: 'Capuccino', d: '', p: '3,90 €' },
        { n: 'Chocolat Viennois', d: '', p: '4,90 €' },
        { n: 'Moka', d: '', p: '3,90 €' },
      ]
    },
    {
      cat: 'boissons', emoji: '🧊', title: 'Soft',
      items: [
        { n: 'Chill', d: '', p: '2,90 €' },
        { n: 'Eau 50cl', d: '', p: '1,50 €' },
        { n: 'Perrier', d: '', p: '1,90 €' },
      ]
    },
    {
      cat: 'formules', emoji: '✨', title: 'Formule Sucrée', note: 'Le meilleur rapport plaisir-prix pour un brunch sucré complet.',
      items: [
        { n: 'Formule Sucrée', d: 'Une pause sucrée au choix (Pancakes, Pain perdu, Msemen, Croffle ou Bol de muesli) + une boisson chaude (+1,00 € option chocolat viennois) + un jus d\'orange pressé.', p: '13,90 €' },
      ]
    },
    {
      cat: 'extras', emoji: '🍟', title: 'Sides',
      items: [
        { n: 'Patatarea', d: 'Pommes grenailles rôties au four, sauce oignons confits et sauce fromagère maison.', p: '5,90 €' },
        { n: 'Pastels Sénégalaises', d: 'Pastels au bœuf mariné (x4), sauce oignons confits et sauce fromagère maison.', p: '7,50 €' },
        { n: 'Accras de Morue', d: 'Beignets antillais de morue, herbes et épices (x5), sauces maison.', p: '7,50 €' },
      ]
    },
  ];

  /* ---------- PRIX : helpers ---------- */
  // Extrait une valeur numérique depuis un libellé ("12,50 €" -> 12.5).
  // Renvoie null si non chiffrable ("inclus") -> article non commandable.
  function parsePrice(p) {
    const m = /(\d+)[,.](\d{2})/.exec(p || '');
    return m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 100 : null;
  }
  function formatPrice(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
  function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

  /* ---------- RENDU DU MENU ---------- */
  const groupsEl = document.getElementById('menuGroups');
  function renderMenu() {
    const html = MENU.map(function (g, gi) {
      const items = g.items.map(function (it, ii) {
        const price = parsePrice(it.p);
        const id = g.cat + '-' + gi + '-' + ii;
        const addBtn = price != null
          ? '<button class="add-btn" data-id="' + id + '" data-name="' + escAttr(it.n) +
              '" data-price="' + price + '" aria-label="Ajouter ' + escAttr(it.n) + ' au panier">+ Ajouter</button>'
          : '';
        return (
          '<div class="menu-item">' +
            '<div class="menu-item__head">' +
              '<span class="menu-item__name">' + it.n + '</span>' +
              '<span class="menu-item__dots"></span>' +
              '<span class="menu-item__price">' + it.p + '</span>' +
            '</div>' +
            (it.d ? '<p class="menu-item__desc">' + it.d + '</p>' : '') +
            (it.alt ? '<p class="menu-item__desc menu-item__alt">' + it.alt + '</p>' : '') +
            addBtn +
          '</div>'
        );
      }).join('');
      return (
        '<div class="menu-group reveal" data-cat="' + g.cat + '">' +
          '<h3 class="menu-group__title"><span class="emoji">' + g.emoji + '</span>' + g.title + '</h3>' +
          (g.note ? '<p class="menu-group__note">' + g.note + '</p>' : '') +
          '<div class="menu-items">' + items + '</div>' +
        '</div>'
      );
    }).join('');
    groupsEl.innerHTML = html;
    observeReveals();
  }

  /* ---------- FILTRES MENU ---------- */
  function setupFilters() {
    const filters = document.getElementById('menuFilters');
    filters.addEventListener('click', function (e) {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      filters.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      const cat = chip.dataset.cat;
      groupsEl.querySelectorAll('.menu-group').forEach(function (g) {
        const show = cat === 'all' || g.dataset.cat === cat;
        g.style.display = show ? '' : 'none';
        if (show) { g.classList.remove('is-in'); requestAnimationFrame(function () { g.classList.add('is-in'); }); }
      });
    });
  }

  /* ---------- GALERIE ---------- */
  function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const photos = [
      { src: 'IMG_5112.webp', alt: 'Pancakes banane et sirop d\'érable' },
      { src: 'IMG_5110.webp', alt: 'Assiette Brunchie' },
      { src: 'IMG_5105.webp', alt: 'Croffle gourmand' },
      { src: 'IMG_5107.webp', alt: 'Le Sambi' },
      { src: 'IMG_5111.webp', alt: 'Tablée brunch et jus frais' },
      { src: 'IMG_5106.webp', alt: 'Egg Muffin bacon' },
      { src: 'IMG_5108.webp', alt: 'Pancakes fruit de la passion' },
      { src: 'IMG_5109.webp', alt: 'Assortiment de plats brunch' },
    ];
    grid.innerHTML = photos.map(function (p) {
      return '<a class="gallery__item reveal" href="https://www.instagram.com/brunchareafr" target="_blank" rel="noopener">' +
        '<img src="' + p.src + '" alt="' + p.alt + '" loading="lazy" width="500" height="500" /></a>';
    }).join('');
    observeReveals();
  }

  /* ---------- REVEAL ON SCROLL ---------- */
  let io;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            entry.target.style.transitionDelay = (Math.min(i, 6) * 60) + 'ms';
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    }
    document.querySelectorAll('.reveal:not(.is-in)').forEach(function (el) { io.observe(el); });
  }

  /* ---------- NAV SCROLL + STICKY CTA ---------- */
  function setupScroll() {
    const nav = document.getElementById('nav');
    const sticky = document.getElementById('stickyCta');
    const hero = document.getElementById('hero');
    function onScroll() {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 20);
      const heroBottom = hero.offsetHeight - 200;
      sticky.classList.toggle('is-visible', y > heroBottom);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- MENU MOBILE ---------- */
  function setupMobileMenu() {
    const burger = document.getElementById('navBurger');
    const menu = document.getElementById('mobileMenu');
    function close() { burger.classList.remove('is-open'); menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
    burger.addEventListener('click', function () {
      const open = burger.classList.toggle('is-open');
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
  }

  /* ---------- COMPTEURS ANIMÉS ---------- */
  function setupCounters() {
    const nums = document.querySelectorAll('.stat__num');
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const dec = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const dur = 1400; const start = performance.now();
        function tick(now) {
          const prog = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - prog, 3);
          el.textContent = (target * eased).toFixed(dec) + suffix;
          if (prog < 1) requestAnimationFrame(tick);
          else el.textContent = target.toFixed(dec) + suffix;
        }
        requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { obs.observe(n); });
  }

  /* ---------- HORAIRES : jour courant + statut ---------- */
  function setupHours() {
    const schedule = { 0: [630, 990], 2: [630, 990], 3: [630, 990], 4: [630, 990], 5: [1080, 1320], 6: [630, 990] }; // minutes
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    document.querySelectorAll('.hours li').forEach(function (li) {
      if (parseInt(li.dataset.day, 10) === day) li.classList.add('is-today');
    });
    const status = document.getElementById('openStatus');
    let isOpen = false;
    if (schedule[day]) { isOpen = mins >= schedule[day][0] && mins <= schedule[day][1]; }
    if (isOpen) {
      status.className = 'infos__status is-open-now';
      status.innerHTML = '<span class="dot"></span>Ouvert maintenant';
    } else {
      status.className = 'infos__status is-closed-now';
      status.innerHTML = '<span class="dot"></span>Fermé actuellement';
    }
  }

  /* ===================================================================
     CLICK & COLLECT — panier, commande, ticket
     =================================================================== */

  // Horaires d'ouverture (minutes depuis minuit). Mar..Dim, ven 18h-22h.
  const SCHEDULE = { 0: [630, 990], 2: [630, 990], 3: [630, 990], 4: [630, 990], 5: [1080, 1320], 6: [630, 990] };
  const LEAD_MIN = 20;   // délai mini de préparation
  const SLOT_STEP = 15;  // pas des créneaux (min)
  const SHOP = {
    name: 'BRUNCH AREA', addr: '20 Avenue Jean Cordier, 33600 Pessac', phone: '06 71 57 32 72'
  };

  let CART = loadCart();

  function loadCart() {
    try { return JSON.parse(localStorage.getItem('ba_cart')) || []; } catch (e) { return []; }
  }
  function saveCart() { localStorage.setItem('ba_cart', JSON.stringify(CART)); }
  function cartCount() { return CART.reduce(function (s, l) { return s + l.qty; }, 0); }
  function cartTotal() { return CART.reduce(function (s, l) { return s + l.qty * l.price; }, 0); }

  function addToCart(id, name, price) {
    const line = CART.find(function (l) { return l.id === id; });
    if (line) line.qty += 1; else CART.push({ id: id, name: name, price: price, qty: 1 });
    saveCart(); renderCart(); pulseCart();
  }
  function setQty(id, qty) {
    const i = CART.findIndex(function (l) { return l.id === id; });
    if (i < 0) return;
    if (qty <= 0) CART.splice(i, 1); else CART[i].qty = qty;
    saveCart(); renderCart();
  }

  /* ---------- Injection du DOM (bouton panier, drawer, modale) ---------- */
  function injectOrderUI() {
    // Bouton panier dans la nav (déjà présent dans le HTML : #cartBtn)
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer'; drawer.id = 'cartDrawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="cart-drawer__overlay" data-close></div>' +
      '<aside class="cart-drawer__panel" role="dialog" aria-label="Votre panier">' +
        '<header class="cart-drawer__head">' +
          '<h3>Votre commande</h3>' +
          '<button class="cart-drawer__close" data-close aria-label="Fermer">✕</button>' +
        '</header>' +
        '<p class="cart-drawer__pickup">🛍️ À récupérer sur place · paiement au retrait</p>' +
        '<div class="cart-drawer__lines" id="cartLines"></div>' +
        '<footer class="cart-drawer__foot">' +
          '<div class="cart-drawer__total"><span>Total</span><strong id="cartTotal">0,00 €</strong></div>' +
          '<button class="btn btn--primary btn--lg btn--block" id="goCheckout">Commander</button>' +
        '</footer>' +
      '</aside>';
    document.body.appendChild(drawer);

    const modal = document.createElement('div');
    modal.className = 'checkout'; modal.id = 'checkoutModal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="checkout__overlay" data-close></div>' +
      '<div class="checkout__card" role="dialog" aria-label="Finaliser la commande">' +
        '<button class="checkout__close" data-close aria-label="Fermer">✕</button>' +
        '<div id="checkoutBody"></div>' +
      '</div>';
    document.body.appendChild(modal);
  }

  /* ---------- Ouverture/fermeture ---------- */
  function openDrawer() { document.getElementById('cartDrawer').classList.add('is-open'); document.body.style.overflow = 'hidden'; renderCart(); }
  function closeDrawer() { document.getElementById('cartDrawer').classList.remove('is-open'); document.body.style.overflow = ''; }
  function openCheckout() { document.getElementById('checkoutModal').classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeCheckout() { document.getElementById('checkoutModal').classList.remove('is-open'); document.body.style.overflow = ''; }

  function pulseCart() {
    const b = document.getElementById('cartBtn');
    if (!b) return; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
  }

  /* ---------- Rendu panier ---------- */
  function renderCart() {
    const badge = document.getElementById('cartBadge');
    const count = cartCount();
    if (badge) { badge.textContent = count; badge.classList.toggle('is-visible', count > 0); }

    const lines = document.getElementById('cartLines');
    const totalEl = document.getElementById('cartTotal');
    const go = document.getElementById('goCheckout');
    if (!lines) return;

    if (!CART.length) {
      lines.innerHTML = '<p class="cart-empty">Votre panier est vide.<br>Ajoutez vos plats préférés depuis le menu 🥞</p>';
      if (go) go.disabled = true;
    } else {
      lines.innerHTML = CART.map(function (l) {
        return '<div class="cart-line">' +
            '<div class="cart-line__info"><span class="cart-line__name">' + l.name + '</span>' +
              '<span class="cart-line__unit">' + formatPrice(l.price) + '</span></div>' +
            '<div class="cart-line__qty">' +
              '<button class="qty-btn" data-dec="' + l.id + '" aria-label="Retirer un">−</button>' +
              '<span>' + l.qty + '</span>' +
              '<button class="qty-btn" data-inc="' + l.id + '" aria-label="Ajouter un">+</button>' +
            '</div>' +
            '<span class="cart-line__sum">' + formatPrice(l.qty * l.price) + '</span>' +
          '</div>';
      }).join('');
      if (go) go.disabled = false;
    }
    if (totalEl) totalEl.textContent = formatPrice(cartTotal());
  }

  /* ---------- Créneaux de retrait ---------- */
  function buildSlots() {
    const now = new Date();
    const groups = []; // { label, options:[{value,label}] }
    for (let off = 0; off < 8 && groups.length < 2; off++) {
      const d = new Date(now); d.setDate(now.getDate() + off);
      const day = d.getDay();
      if (!SCHEDULE[day]) continue;
      const open = SCHEDULE[day][0], close = SCHEDULE[day][1];
      let start = open;
      if (off === 0) {
        const nowMin = now.getHours() * 60 + now.getMinutes() + LEAD_MIN;
        start = Math.max(open, Math.ceil(nowMin / SLOT_STEP) * SLOT_STEP);
      }
      const opts = [];
      for (let m = start; m <= close; m += SLOT_STEP) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0') + 'T' + hh + ':' + mm;
        opts.push({ value: iso, label: hh + 'h' + mm });
      }
      if (opts.length) {
        const label = off === 0 ? "Aujourd'hui" :
          d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        groups.push({ label: label.charAt(0).toUpperCase() + label.slice(1), options: opts });
      }
    }
    return groups;
  }

  /* ---------- Tunnel de commande ---------- */
  function renderCheckout() {
    const slots = buildSlots();
    const body = document.getElementById('checkoutBody');
    if (!slots.length) {
      body.innerHTML = '<h3 class="checkout__title">Commande en ligne</h3>' +
        '<p class="checkout__sub">Le service click &amp; collect est fermé pour le moment. ' +
        'Retrouvez nos horaires ou commandez sur place. À très vite !</p>';
      return;
    }
    const optsHtml = slots.map(function (g) {
      return '<optgroup label="' + g.label + '">' +
        g.options.map(function (o) { return '<option value="' + o.value + '">' + o.label + '</option>'; }).join('') +
        '</optgroup>';
    }).join('');

    body.innerHTML =
      '<h3 class="checkout__title">Finaliser ma commande</h3>' +
      '<p class="checkout__sub">Retrait sur place au ' + SHOP.addr + '. Paiement à la boutique (CB ou espèces).</p>' +
      '<form id="checkoutForm" class="checkout__form" novalidate>' +
        '<div class="field"><label for="co-first">Prénom</label>' +
          '<input id="co-first" name="first" type="text" autocomplete="given-name" required placeholder="Votre prénom" /></div>' +
        '<div class="field"><label for="co-phone">Téléphone</label>' +
          '<input id="co-phone" name="phone" type="tel" autocomplete="tel" required placeholder="06 00 00 00 00" /></div>' +
        '<div class="field field--full"><label for="co-slot">Heure de retrait</label>' +
          '<select id="co-slot" name="slot" required>' + optsHtml + '</select></div>' +
        '<div class="field field--full"><label for="co-note">Note (optionnel)</label>' +
          '<input id="co-note" name="note" type="text" placeholder="Allergie, sans oignon, etc." /></div>' +
        '<div class="checkout__recap" id="checkoutRecap"></div>' +
        '<button type="submit" class="btn btn--primary btn--lg btn--block">Valider la commande</button>' +
        '<p class="checkout__legal">En validant, votre commande est transmise à la boutique. ' +
          'Vous réglez au retrait. Pas de paiement en ligne.</p>' +
      '</form>';

    const recap = document.getElementById('checkoutRecap');
    recap.innerHTML = CART.map(function (l) {
      return '<div class="recap-line"><span>' + l.qty + '× ' + l.name + '</span><span>' + formatPrice(l.qty * l.price) + '</span></div>';
    }).join('') + '<div class="recap-line recap-line--total"><span>Total à régler sur place</span><strong>' + formatPrice(cartTotal()) + '</strong></div>';

    document.getElementById('checkoutForm').addEventListener('submit', onSubmitOrder);
  }

  /* ---------- Numéro de commande ---------- */
  function genOrderNumber() {
    const d = new Date();
    const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return 'BA-' + ymd + '-' + rnd;
  }

  /* ---------- Soumission de commande ---------- */
  function onSubmitOrder(e) {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const slotIso = fd.get('slot');
    const order = {
      number: genOrderNumber(),
      createdAt: new Date().toISOString(),
      pickupAt: slotIso,
      pickupLabel: new Date(slotIso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
      customer: { first: fd.get('first').trim(), phone: fd.get('phone').trim() },
      note: (fd.get('note') || '').trim(),
      items: CART.map(function (l) { return { name: l.name, qty: l.qty, price: l.price }; }),
      total: cartTotal(),
      payment: 'Sur place'
    };

    submitOrder(order);
  }

  // ===================================================================
  // ENVOI DE LA COMMANDE AU BACKEND
  // -------------------------------------------------------------------
  // Le site et le backend sont servis depuis la même origine (Render),
  // donc on poste sur le chemin relatif /api/orders. Le serveur met la
  // commande dans la file d'impression ; l'imprimante Epson TM-m30III
  // la récupère via Server Direct Print et imprime le bon.
  //
  // Si le backend est injoignable (ex. site ouvert via un simple serveur
  // statique en local), on bascule sur l'impression locale du bon 80 mm
  // pour ne jamais bloquer le client.
  // ===================================================================
  const ORDER_API = '/api/orders';

  function submitOrder(order) {
    try {
      const hist = JSON.parse(localStorage.getItem('ba_orders') || '[]');
      hist.push(order); localStorage.setItem('ba_orders', JSON.stringify(hist));
    } catch (err) { /* ignore */ }

    CART = []; saveCart(); renderCart();
    showConfirmation(order);          // feedback immédiat
    setConfirmStatus('pending');

    fetch(ORDER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function () { setConfirmStatus('sent'); })
      .catch(function () {
        setConfirmStatus('offline');
        printTicket(order);           // filet de sécurité : bon imprimable côté client
      });
  }

  function setConfirmStatus(state) {
    const el = document.getElementById('confirmStatus');
    if (!el) return;
    if (state === 'pending') {
      el.className = 'confirm__status';
      el.textContent = 'Transmission au restaurant…';
    } else if (state === 'sent') {
      el.className = 'confirm__status confirm__status--ok';
      el.textContent = '✓ Commande transmise au restaurant. Présentez votre n° au retrait.';
    } else {
      el.className = 'confirm__status confirm__status--warn';
      el.textContent = '⚠ Connexion impossible. Conservez ce bon et présentez-le au comptoir.';
    }
  }

  /* ---------- Écran de confirmation ---------- */
  function showConfirmation(order) {
    const body = document.getElementById('checkoutBody');
    body.innerHTML =
      '<div class="confirm">' +
        '<div class="confirm__check">✓</div>' +
        '<h3>Commande confirmée&nbsp;!</h3>' +
        '<p class="confirm__num">N° <strong>' + order.number + '</strong></p>' +
        '<p class="confirm__pickup">Retrait : <strong>' + order.pickupLabel + '</strong><br>' +
          SHOP.addr + '</p>' +
        '<p class="confirm__pay">💳 À régler sur place : <strong>' + formatPrice(order.total) + '</strong></p>' +
        '<p class="confirm__status" id="confirmStatus">Transmission au restaurant…</p>' +
        '<div class="confirm__actions">' +
          '<button class="btn btn--ghost btn--block" id="reprintBtn">Imprimer / enregistrer le bon</button>' +
          '<button class="btn btn--primary btn--block" id="confirmClose">Terminer</button>' +
        '</div>' +
      '</div>';
    document.getElementById('reprintBtn').addEventListener('click', function () { printTicket(order); });
    document.getElementById('confirmClose').addEventListener('click', closeCheckout);
  }

  /* ---------- Bon imprimable 80 mm (via iframe) ---------- */
  function printTicket(order) {
    const linesHtml = order.items.map(function (it) {
      return '<tr><td class="q">' + it.qty + '×</td><td class="n">' + it.name + '</td>' +
        '<td class="p">' + formatPrice(it.qty * it.price) + '</td></tr>';
    }).join('');
    const created = new Date(order.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    const html =
      '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>' + order.number + '</title><style>' +
      '@page{size:80mm auto;margin:0;}' +
      'body{width:80mm;margin:0;padding:6mm 4mm;font-family:"Courier New",monospace;color:#000;}' +
      'h1{font-size:18px;text-align:center;margin:0 0 2mm;letter-spacing:1px;}' +
      '.sub{text-align:center;font-size:11px;margin:0 0 3mm;}' +
      '.cc{text-align:center;font-weight:bold;border:2px solid #000;padding:2mm;margin:0 0 3mm;font-size:13px;}' +
      '.num{text-align:center;font-size:22px;font-weight:bold;margin:0 0 1mm;}' +
      '.pickup{text-align:center;font-size:16px;font-weight:bold;margin:0 0 3mm;}' +
      '.meta{font-size:12px;margin:0 0 3mm;}' +
      'hr{border:none;border-top:1px dashed #000;margin:2mm 0;}' +
      'table{width:100%;border-collapse:collapse;font-size:13px;}' +
      'td{vertical-align:top;padding:1mm 0;}' +
      'td.q{width:12%;font-weight:bold;}td.p{width:24%;text-align:right;white-space:nowrap;}' +
      '.total{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;margin-top:2mm;}' +
      '.note{font-size:12px;border:1px dashed #000;padding:1.5mm;margin-top:2mm;}' +
      '.foot{text-align:center;font-size:11px;margin-top:4mm;}' +
      '</style></head><body>' +
      '<h1>' + SHOP.name + '</h1>' +
      '<p class="sub">' + SHOP.addr + '<br>' + SHOP.phone + '</p>' +
      '<div class="cc">CLICK &amp; COLLECT</div>' +
      '<p class="num">' + order.number + '</p>' +
      '<p class="pickup">RETRAIT : ' + order.pickupLabel.toUpperCase() + '</p>' +
      '<div class="meta">Client : ' + order.customer.first + '<br>Tél : ' + order.customer.phone +
        '<br>Commandé le : ' + created + '</div>' +
      '<hr>' +
      '<table>' + linesHtml + '</table>' +
      '<hr>' +
      '<div class="total"><span>TOTAL</span><span>' + formatPrice(order.total) + '</span></div>' +
      '<div class="total" style="font-size:13px;"><span>Paiement</span><span>SUR PLACE</span></div>' +
      (order.note ? '<div class="note">⚠ ' + order.note + '</div>' : '') +
      '<p class="foot">Merci et à tout de suite ! 💜</p>' +
      '</body></html>';

    let frame = document.getElementById('ticketFrame');
    if (frame) frame.remove();
    frame = document.createElement('iframe');
    frame.id = 'ticketFrame';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    frame.contentWindow.focus();
    setTimeout(function () { try { frame.contentWindow.print(); } catch (e) { /* ignore */ } }, 250);
  }

  /* ---------- Câblage des événements ---------- */
  function setupCart() {
    injectOrderUI();

    // Boutons "Ajouter" du menu (délégation)
    groupsEl.addEventListener('click', function (e) {
      const btn = e.target.closest('.add-btn');
      if (!btn) return;
      addToCart(btn.dataset.id, btn.dataset.name, parseFloat(btn.dataset.price));
      openDrawer();
    });

    // Bouton panier de la nav
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.addEventListener('click', openDrawer);

    // Drawer : fermeture + quantités + checkout
    const drawer = document.getElementById('cartDrawer');
    drawer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) { closeDrawer(); return; }
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      if (inc) { const l = CART.find(function (x) { return x.id === inc.dataset.inc; }); if (l) setQty(l.id, l.qty + 1); }
      if (dec) { const l = CART.find(function (x) { return x.id === dec.dataset.dec; }); if (l) setQty(l.id, l.qty - 1); }
    });
    document.getElementById('goCheckout').addEventListener('click', function () {
      if (!CART.length) return;
      closeDrawer(); renderCheckout(); openCheckout();
    });

    // Modale : fermeture
    document.getElementById('checkoutModal').addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) closeCheckout();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); closeCheckout(); }
    });

    renderCart();
  }

  /* ---------- INIT ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
  renderMenu();
  setupFilters();
  renderGallery();
  setupScroll();
  setupMobileMenu();
  setupCounters();
  setupHours();
  setupCart();
  observeReveals();
})();
