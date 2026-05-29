/**
 * Sustenance — supportive nutrition guidance
 * Dark mode, mock AI responses, and follow-up handling
 */

(function () {
  'use strict';

  const DARK_KEY = 'sustenance-dark';
  const cravingInput = document.getElementById('cravingInput');
  const considerSelect = document.getElementById('considerSelect');
  const submitCraving = document.getElementById('submitCraving');
  const aiResponsePlaceholder = document.getElementById('aiResponsePlaceholder');
  const aiResponseContent = document.getElementById('aiResponseContent');
  const followUpInput = document.getElementById('followUpInput');
  const submitFollowUp = document.getElementById('submitFollowUp');
  const darkToggle = document.getElementById('darkToggle');
  const darkIcon = document.getElementById('darkIcon');
  const pageRail = document.getElementById('pageRail');
  const recipeDrawer = document.getElementById('recipeDrawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBody = document.getElementById('drawerBody');
  const closeDrawer = document.getElementById('closeDrawer');
  const instructionsContent = document.getElementById('instructionsContent');
  const accentColor = document.getElementById('accentColor');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsMenu = document.getElementById('settingsMenu');
  const goalCalories = document.getElementById('goalCalories');
  const goalProtein = document.getElementById('goalProtein');
  const goalCarbs = document.getElementById('goalCarbs');
  const goalFat = document.getElementById('goalFat');
  const goalFiber = document.getElementById('goalFiber');
  const saveGoals = document.getElementById('saveGoals');
  const resetDay = document.getElementById('resetDay');
  const progressBars = document.getElementById('progressBars');
  const progressNote = document.getElementById('progressNote');
  const mealsList = document.getElementById('mealsList');

  let lastCraving = '';
  let lastContext = '';
  let lastFollowUp = '';
  let lastRecipeSet = [];
  let selectedRecipeIndex = 0;
  let drawerGoals = new Set(['balanced']);
  // ingredient swap state: key=original ingredient string, value={ chosen: string, mode:'auto'|'manual' }
  let ingredientSwaps = new Map();
  let eatenState = { goals: { cal: 2000, p: 120, c: 250, f: 70, fiber: 30 }, meals: [] };

  const ACCENT_KEY = 'sustenance-accent';
  const GOALS_KEY = 'sustenance-goals';
  const EATEN_KEY_PREFIX = 'sustenance-eaten-';

  // —— Dark mode ——
  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function setDark(enabled) {
    if (enabled) {
      document.documentElement.classList.add('dark');
      try { localStorage.setItem(DARK_KEY, '1'); } catch (_) {}
      darkIcon.textContent = '☀️';
    } else {
      document.documentElement.classList.remove('dark');
      try { localStorage.setItem(DARK_KEY, '0'); } catch (_) {}
      darkIcon.textContent = '🌙';
    }
  }

  function initDark() {
    let stored = null;
    try { stored = localStorage.getItem(DARK_KEY); } catch (_) {}
    const preferDark = stored === '1' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(preferDark);
  }

  if (darkToggle) darkToggle.addEventListener('click', function () { setDark(!isDark()); });
  initDark();

  // —— Settings dropdown ——
  function closeSettingsMenu() {
    if (!settingsMenu || !settingsToggle) return;
    settingsMenu.classList.add('hidden');
    settingsToggle.setAttribute('aria-expanded', 'false');
  }

  function toggleSettingsMenu() {
    if (!settingsMenu || !settingsToggle) return;
    const isOpen = !settingsMenu.classList.contains('hidden');
    if (isOpen) closeSettingsMenu();
    else {
      settingsMenu.classList.remove('hidden');
      settingsToggle.setAttribute('aria-expanded', 'true');
    }
  }

  if (settingsToggle) {
    settingsToggle.addEventListener('click', function (e) {
      e.preventDefault();
      toggleSettingsMenu();
    });
  }

  document.addEventListener('click', function (e) {
    if (!settingsMenu || !settingsToggle) return;
    const t = e.target;
    if (!t) return;
    if (settingsMenu.contains(t) || settingsToggle.contains(t)) return;
    closeSettingsMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSettingsMenu();
  });

  // —— Accent color (CSS variable) ——
  function darkenHex(hex, amount) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#4a6b56';
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const f = (v) => clamp(Math.round(v * (1 - amount)), 0, 255);
    const rr = f(r).toString(16).padStart(2, '0');
    const gg = f(g).toString(16).padStart(2, '0');
    const bb = f(b).toString(16).padStart(2, '0');
    return ('#' + rr + gg + bb).toLowerCase();
  }

  function hexToRgba(hex, alpha) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 'rgba(91, 124, 106, ' + alpha + ')';
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function setAccent(hex) {
    const safe = (hex && /^#[0-9a-f]{6}$/i.test(hex)) ? hex : '#5b7c6a';
    document.documentElement.style.setProperty('--accent', safe);
    document.documentElement.style.setProperty('--accent-hover', darkenHex(safe, 0.12));
    document.documentElement.style.setProperty('--accent-soft', hexToRgba(safe, 0.18));
    try { localStorage.setItem(ACCENT_KEY, safe); } catch (_) {}
    if (accentColor) accentColor.value = safe;
  }

  function initAccent() {
    let stored = null;
    try { stored = localStorage.getItem(ACCENT_KEY); } catch (_) {}
    setAccent(stored || '#5b7c6a');
  }

  if (accentColor) {
    accentColor.addEventListener('input', function () {
      setAccent(accentColor.value);
    });
  }
  initAccent();

  // —— Mock response content (supportive, non-judgmental) ——
  const summaries = [
    'That sounds really comforting—sweet and warm can be exactly what we need sometimes.',
    'We hear you. Craving something satisfying like that is totally normal and okay.',
    'That craving makes sense. Let\'s find ways to honor it and nourish you at the same time.',
  ];

  const recipes = {
    chocolate: [
      { name: 'Warm cocoa with a little nut butter', ingredients: ['1 tbsp cocoa', '1 cup milk or plant milk', '1 tsp nut butter', 'Pinch of cinnamon'], steps: ['Warm the milk gently.', 'Whisk in cocoa and nut butter until smooth.', 'Top with cinnamon.'] },
      { name: 'Small chocolate–oat bites', ingredients: ['Rolled oats', 'Cocoa powder', 'Ripe banana or dates', 'Pinch of salt'], steps: ['Mash banana (or blend dates).', 'Mix with oats, cocoa, salt.', 'Shape into small balls and chill or eat soft.'] },
      { name: 'Yogurt with cocoa and fruit', ingredients: ['Plain or Greek yogurt', '1 tsp cocoa', 'Berries or banana', 'Optional: honey or maple syrup'], steps: ['Stir cocoa into yogurt.', 'Top with fruit and a little sweetness if you like.'] },
    ],
    sweet: [
      { name: 'Baked apple or pear with cinnamon', ingredients: ['1 apple or pear', 'Cinnamon', 'Optional: raisins, nuts'], steps: ['Core fruit, add cinnamon (and raisins/nuts).', 'Bake at 350°F until soft, 20–25 min.'] },
      { name: 'Banana "nice cream"', ingredients: ['Frozen banana', 'Splash of milk', 'Optional: vanilla, cocoa'], steps: ['Blend frozen banana with a little milk until creamy.', 'Add vanilla or cocoa if you like.'] },
      { name: 'Oatmeal with fruit and a drizzle', ingredients: ['Rolled oats', 'Sliced banana or berries', 'Maple syrup or honey'], steps: ['Cook oats as usual.', 'Top with fruit and a small drizzle of sweetness.'] },
    ],
    warm: [
      { name: 'Simple lentil soup', ingredients: ['Canned or cooked lentils', 'Vegetable broth', 'Onion, carrot', 'Cumin, salt'], steps: ['Sauté onion and carrot.', 'Add lentils, broth, spices. Simmer 15 min.'] },
      { name: 'Warm toast with toppings', ingredients: ['Whole-grain bread', 'Avocado or nut butter', 'Tomato or banana'], steps: ['Toast bread.', 'Add avocado or nut butter and a topping you like.'] },
      { name: 'Herbal tea with a small snack', ingredients: ['Herbal tea (e.g. chamomile)', 'A few crackers and cheese or nut butter'], steps: ['Brew tea.', 'Have a small, satisfying snack alongside.'] },
    ],
    crunchy: [
      { name: 'Apple slices with nut butter', ingredients: ['Apple', 'Nut butter'], steps: ['Slice apple.', 'Dip in nut butter.'] },
      { name: 'Roasted chickpeas', ingredients: ['Canned chickpeas', 'Olive oil', 'Salt, paprika'], steps: ['Drain and dry chickpeas.', 'Toss with oil and spices, roast at 400°F ~25 min until crisp.'] },
      { name: 'Veggie sticks and hummus', ingredients: ['Carrots, cucumber, bell pepper', 'Hummus'], steps: ['Cut veggies into sticks.', 'Serve with hummus.'] },
    ],
    default: [
      { name: 'Balanced bowl', ingredients: ['Grain (rice, quinoa)', 'Protein (beans, egg)', 'Veggies', 'Sauce or dressing'], steps: ['Cook grain and protein.', 'Add veggies and a dressing you like.'] },
      { name: 'Smoothie', ingredients: ['Fruit', 'Milk or yogurt', 'Optional: spinach, nut butter'], steps: ['Blend fruit with milk or yogurt.', 'Add greens or nut butter if you like.'] },
      { name: 'Toast and sides', ingredients: ['Whole-grain bread', 'Topping (avocado, egg)', 'Side of fruit or veg'], steps: ['Toast bread and add topping.', 'Serve with a simple side.'] },
    ],
  };

  const lighterNotes = [
    'Lighter option: use less sweetener, smaller portion, or swap in extra fruit.',
    'For a lighter version: reduce added fats and sugars, and add more veggies or fruit.',
    'You can make it lighter by using less oil/sugar and bulking up with vegetables or fruit.',
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function openDrawer() {
    if (!recipeDrawer || !pageRail) return;
    recipeDrawer.classList.remove('-translate-x-full');
    recipeDrawer.setAttribute('aria-hidden', 'false');
    // Push the whole page content right on larger screens (drawer overlays on small screens).
    pageRail.classList.add('lg:translate-x-[14rem]');
    document.body.classList.add('overflow-x-hidden');
  }

  function closeRecipeDrawer() {
    if (!recipeDrawer || !pageRail) return;
    recipeDrawer.classList.add('-translate-x-full');
    recipeDrawer.setAttribute('aria-hidden', 'true');
    pageRail.classList.remove('lg:translate-x-[14rem]');
  }

  function normalizeIngredient(s) {
    return (s || '')
      .toLowerCase()
      .replace(/[–—]/g, '-')
      .replace(/[(),]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function todayKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  function eatenStorageKey() {
    return EATEN_KEY_PREFIX + todayKey();
  }

  function readNumberInput(el, fallback) {
    if (!el) return fallback;
    const raw = String(el.value || el.placeholder || '').trim();
    const n = Number(raw);
    return isFinite(n) && n > 0 ? n : fallback;
  }

  function loadGoals() {
    let stored = null;
    try { stored = localStorage.getItem(GOALS_KEY); } catch (_) {}
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.cal && parsed.p && parsed.c && parsed.f && parsed.fiber) {
          eatenState.goals = parsed;
        }
      } catch (_) {}
    }
    if (goalCalories) goalCalories.value = String(eatenState.goals.cal);
    if (goalProtein) goalProtein.value = String(eatenState.goals.p);
    if (goalCarbs) goalCarbs.value = String(eatenState.goals.c);
    if (goalFat) goalFat.value = String(eatenState.goals.f);
    if (goalFiber) goalFiber.value = String(eatenState.goals.fiber);
  }

  function saveGoalsToStorage() {
    eatenState.goals = {
      cal: readNumberInput(goalCalories, eatenState.goals.cal),
      p: readNumberInput(goalProtein, eatenState.goals.p),
      c: readNumberInput(goalCarbs, eatenState.goals.c),
      f: readNumberInput(goalFat, eatenState.goals.f),
      fiber: readNumberInput(goalFiber, eatenState.goals.fiber),
    };
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(eatenState.goals)); } catch (_) {}
    renderProgress();
  }

  function loadEatenDay() {
    let stored = null;
    try { stored = localStorage.getItem(eatenStorageKey()); } catch (_) {}
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.meals)) eatenState.meals = parsed.meals;
      } catch (_) {}
    }
    renderProgress();
  }

  function saveEatenDay() {
    try { localStorage.setItem(eatenStorageKey(), JSON.stringify({ meals: eatenState.meals })); } catch (_) {}
    renderProgress();
  }

  function sumMealsMacros() {
    const total = { cal: 0, p: 0, c: 0, f: 0, fiber: 0 };
    eatenState.meals.forEach(function (m) {
      if (!m || !m.macros) return;
      total.cal += Number(m.macros.cal || 0);
      total.p += Number(m.macros.p || 0);
      total.c += Number(m.macros.c || 0);
      total.f += Number(m.macros.f || 0);
      total.fiber += Number(m.macros.fiber || 0);
    });
    return {
      cal: Math.round(total.cal),
      p: Math.round(total.p),
      c: Math.round(total.c),
      f: Math.round(total.f),
      fiber: Math.round(total.fiber),
    };
  }

  function renderProgress() {
    if (!progressBars || !mealsList) return;
    const goals = eatenState.goals;
    const totals = sumMealsMacros();

    function ringCard(label, value, goal, unit, hint) {
      const pct = goal > 0 ? (value / goal) * 100 : 0;
      const pctShown = clamp(pct, 0, 100);
      const pctText = goal > 0 ? Math.round(pct) : 0;
      const over = goal > 0 && value > goal;
      return (
        '<div class="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/30 p-4 shadow-soft dark:shadow-soft-dark">' +
        '<div class="flex items-center gap-4">' +
        '<div class="ring-chart shrink-0" style="--pct:' + pctShown.toFixed(0) + ';">' +
        '<div class="ring-center">' +
        '<div>' +
        '<p class="text-base font-semibold text-slate-800 dark:text-white leading-none">' + escapeHtml(String(pctText)) + '%</p>' +
        '<p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">' + escapeHtml(label) + '</p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="min-w-0">' +
        '<p class="text-sm font-semibold text-slate-800 dark:text-white truncate">' + escapeHtml(label) + '</p>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">' + escapeHtml(String(value)) + escapeHtml(unit) + ' / ' + escapeHtml(String(goal)) + escapeHtml(unit) + '</p>' +
        (hint ? '<p class="text-xs text-slate-600 dark:text-slate-300 mt-2">' + escapeHtml(hint) + '</p>' : '') +
        (over ? '<p class="text-xs text-slate-500 dark:text-slate-400 mt-2">Over by ' + escapeHtml(String(Math.round(value - goal))) + escapeHtml(unit) + ' (not inherently “bad”).</p>' : '') +
        '</div>' +
        '</div>' +
        '</div>'
      );
    }

    let rings = '';
    rings += ringCard('Calories', totals.cal, goals.cal, ' kcal', 'Energy for your day');
    rings += ringCard('Protein', totals.p, goals.p, ' g', 'Supports fullness + muscle');
    rings += ringCard('Carbs', totals.c, goals.c, ' g', 'Main fuel (especially active days)');
    rings += ringCard('Fat', totals.f, goals.f, ' g', 'Hormones + satisfaction');
    rings += ringCard('Fiber', totals.fiber, goals.fiber, ' g', 'Digestion + fullness');
    progressBars.innerHTML = rings;

    if (progressNote) {
      progressNote.textContent =
        eatenState.meals.length
          ? ('Tracking ' + eatenState.meals.length + ' meal' + (eatenState.meals.length === 1 ? '' : 's') + ' for ' + todayKey() + '.')
          : ('No meals marked as eaten yet for ' + todayKey() + '.');
    }

    if (!eatenState.meals.length) {
      mealsList.innerHTML = '<div class="text-sm text-slate-500 dark:text-slate-400">Nothing logged yet. Mark a recipe as eaten to see it here.</div>';
      return;
    }

    mealsList.innerHTML = eatenState.meals.map(function (m) {
      const time = m && m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const name = (m && m.name) ? m.name : 'Meal';
      const mc = m && m.macros ? m.macros : { cal: 0, p: 0, c: 0, f: 0, fiber: 0 };
      return (
        '<div class="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/30 p-4">' +
        '<div class="flex items-start justify-between gap-3">' +
        '<div class="min-w-0">' +
        '<p class="text-sm font-semibold text-slate-800 dark:text-white truncate">' + escapeHtml(name) + '</p>' +
        '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">' + escapeHtml(time) + ' • ' +
        escapeHtml(String(mc.cal || 0)) + ' kcal • ' +
        escapeHtml(String(mc.p || 0)) + 'P ' +
        escapeHtml(String(mc.c || 0)) + 'C ' +
        escapeHtml(String(mc.f || 0)) + 'F</p>' +
        '</div>' +
        '<button type="button" class="remove-meal px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-sage-100 dark:hover:bg-slate-700 transition-colors" data-meal-id="' + escapeHtml(String(m.id)) + '">Remove</button>' +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  function stableKeyForIngredient(ingredientText) {
    // Keeps per-ingredient swap state even if spacing varies.
    return normalizeIngredient(ingredientText);
  }

  function ingredientIconSvg(ingredientText) {
    const t = normalizeIngredient(ingredientText);

    // Minimal inline SVG icons (no external assets).
    const wrap = (pathD) =>
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="w-5 h-5">' +
      '<path d="' + pathD + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />' +
      '</svg>';

    if (/(milk|almond milk|oat milk|soy milk|plant milk)/.test(t)) return wrap('M8 3h8l1 4v14H7V7l1-4Zm0 4h10');
    if (/(yogurt|skyr|kefir|cottage)/.test(t)) return wrap('M8 7h8l1 2v12H7V9l1-2Zm-1 2h10');
    if (/(oats|oatmeal|oat bran|quinoa flakes|quinoa|rice)/.test(t)) return wrap('M6 10c2-4 10-4 12 0M7 10v8m10-8v8M9 14h6');
    if (/(banana|apple|pear|berries|fruit|dates)/.test(t)) return wrap('M12 7c-2 0-3-2-3-3 2 0 3 1 3 3Zm-4 6c0-2 2-4 4-4s4 2 4 4-2 8-4 8-4-6-4-8Z');
    if (/(nut butter|peanut|almond butter|tahini|sunflower)/.test(t)) return wrap('M9 10c0-2 6-2 6 0v9H9v-9Zm-2 2h10');
    if (/(chickpea|lentil|beans|edamame|soy nuts)/.test(t)) return wrap('M8 14c0-3 8-3 8 0s-2 6-4 6-4-3-4-6Z');
    if (/(honey|maple|sweetener|cinnamon|cocoa|cacao|carob)/.test(t)) return wrap('M12 4v16m-6-6h12');
    if (/(bread|toast|wrap|pita|cracker|rice cake)/.test(t)) return wrap('M6 8c0-2 12-2 12 0v12H6V8Zm0 4h12');
    return wrap('M12 6v12m-6-6h12');
  }

  // Very rough nutrition estimates for common ingredients (per "base serving").
  // Numbers are approximate and intended for UI guidance rather than precision.
  const nutritionDB = [
    { match: /greek yogurt|skyr|plain yogurt|yogurt/, base: { qty: 170, unit: 'g' }, macros: { cal: 110, p: 18, c: 7, f: 0, fiber: 0 } },
    { match: /kefir/, base: { qty: 1, unit: 'cup' }, macros: { cal: 150, p: 9, c: 12, f: 8, fiber: 0 } },
    { match: /cottage cheese/, base: { qty: 0.5, unit: 'cup' }, macros: { cal: 110, p: 14, c: 5, f: 4, fiber: 0 } },
    { match: /milk/, base: { qty: 1, unit: 'cup' }, macros: { cal: 120, p: 8, c: 12, f: 5, fiber: 0 } },
    { match: /plant milk|almond milk|oat milk|soy milk/, base: { qty: 1, unit: 'cup' }, macros: { cal: 80, p: 3, c: 8, f: 3, fiber: 1 } },
    { match: /unsweetened almond milk/, base: { qty: 1, unit: 'cup' }, macros: { cal: 35, p: 1, c: 1, f: 3, fiber: 0 } },
    { match: /soy milk/, base: { qty: 1, unit: 'cup' }, macros: { cal: 95, p: 7, c: 4, f: 4, fiber: 1 } },
    { match: /ultra-filtered milk/, base: { qty: 1, unit: 'cup' }, macros: { cal: 120, p: 13, c: 6, f: 5, fiber: 0 } },
    { match: /cocoa|cacao/, base: { qty: 1, unit: 'tbsp' }, macros: { cal: 12, p: 1, c: 3, f: 1, fiber: 2 } },
    { match: /carob/, base: { qty: 1, unit: 'tbsp' }, macros: { cal: 15, p: 0, c: 3, f: 0, fiber: 1 } },
    { match: /nut butter|peanut butter|almond butter/, base: { qty: 1, unit: 'tbsp' }, macros: { cal: 95, p: 4, c: 3, f: 8, fiber: 1 } },
    { match: /powdered peanut butter|pb2/, base: { qty: 2, unit: 'tbsp' }, macros: { cal: 60, p: 6, c: 5, f: 1.5, fiber: 2 } },
    { match: /chia/, base: { qty: 1, unit: 'tbsp' }, macros: { cal: 60, p: 2, c: 5, f: 4, fiber: 5 } },
    { match: /flax/, base: { qty: 1, unit: 'tbsp' }, macros: { cal: 55, p: 2, c: 3, f: 4, fiber: 3 } },
    { match: /pumpkin pur[eé]e|pumpkin puree/, base: { qty: 0.5, unit: 'cup' }, macros: { cal: 40, p: 2, c: 10, f: 0, fiber: 3 } },
    { match: /rolled oats|oats|oatmeal/, base: { qty: 0.5, unit: 'cup' }, macros: { cal: 150, p: 5, c: 27, f: 3, fiber: 4 } },
    { match: /oat bran/, base: { qty: 0.5, unit: 'cup' }, macros: { cal: 110, p: 7, c: 24, f: 2, fiber: 6 } },
    { match: /quinoa flakes/, base: { qty: 0.5, unit: 'cup' }, macros: { cal: 160, p: 6, c: 28, f: 3, fiber: 3 } },
    { match: /banana/, base: { qty: 1, unit: 'medium' }, macros: { cal: 105, p: 1, c: 27, f: 0, fiber: 3 } },
    { match: /dates?/, base: { qty: 2, unit: 'medjool' }, macros: { cal: 132, p: 1, c: 36, f: 0, fiber: 3 } },
    { match: /berries|strawberr|blueberr|raspberr/, base: { qty: 1, unit: 'cup' }, macros: { cal: 65, p: 1, c: 16, f: 0, fiber: 8 } },
    { match: /apple/, base: { qty: 1, unit: 'medium' }, macros: { cal: 95, p: 1, c: 25, f: 0, fiber: 4 } },
    { match: /pear/, base: { qty: 1, unit: 'medium' }, macros: { cal: 100, p: 1, c: 27, f: 0, fiber: 6 } },
    { match: /lentils?/, base: { qty: 1, unit: 'cup' }, macros: { cal: 230, p: 18, c: 40, f: 1, fiber: 16 } },
    { match: /chickpeas?|garbanzo/, base: { qty: 1, unit: 'cup' }, macros: { cal: 270, p: 15, c: 45, f: 4, fiber: 12 } },
    { match: /soy nuts/, base: { qty: 0.25, unit: 'cup' }, macros: { cal: 200, p: 20, c: 10, f: 9, fiber: 6 } },
    { match: /edamame/, base: { qty: 1, unit: 'cup' }, macros: { cal: 190, p: 17, c: 15, f: 8, fiber: 8 } },
    { match: /hummus/, base: { qty: 0.25, unit: 'cup' }, macros: { cal: 160, p: 5, c: 14, f: 9, fiber: 4 } },
    { match: /bread|toast/, base: { qty: 2, unit: 'slices' }, macros: { cal: 200, p: 8, c: 36, f: 3, fiber: 6 } },
    { match: /thin-sliced bread/, base: { qty: 2, unit: 'slices' }, macros: { cal: 140, p: 6, c: 26, f: 2, fiber: 4 } },
    { match: /rice cake/, base: { qty: 2, unit: 'cakes' }, macros: { cal: 70, p: 2, c: 14, f: 0, fiber: 0 } },
    { match: /high-protein bread/, base: { qty: 2, unit: 'slices' }, macros: { cal: 200, p: 14, c: 24, f: 6, fiber: 10 } },
    { match: /whole-grain|seeded bread/, base: { qty: 2, unit: 'slices' }, macros: { cal: 200, p: 8, c: 36, f: 3, fiber: 8 } },
    { match: /avocado/, base: { qty: 0.5, unit: 'avocado' }, macros: { cal: 160, p: 2, c: 9, f: 15, fiber: 7 } },
    { match: /egg/, base: { qty: 2, unit: 'large' }, macros: { cal: 140, p: 12, c: 1, f: 10, fiber: 0 } },
    { match: /quinoa/, base: { qty: 1, unit: 'cup' }, macros: { cal: 220, p: 8, c: 39, f: 4, fiber: 5 } },
    { match: /rice/, base: { qty: 1, unit: 'cup' }, macros: { cal: 205, p: 4, c: 45, f: 0, fiber: 1 } },
    { match: /honey|maple/, base: { qty: 1, unit: 'tbsp' }, macros: { cal: 64, p: 0, c: 17, f: 0, fiber: 0 } },
    { match: /monk fruit|stevia/, base: { qty: 1, unit: 'tsp' }, macros: { cal: 0, p: 0, c: 0, f: 0, fiber: 0 } },
    { match: /cinnamon/, base: { qty: 1, unit: 'tsp' }, macros: { cal: 6, p: 0, c: 2, f: 0, fiber: 1 } },
  ];

  function parseQty(ingredientText) {
    const t = normalizeIngredient(ingredientText);
    // simple patterns like "1 tbsp", "1 tsp", "1 cup"
    const m = t.match(/^(\d+(\.\d+)?)\s*(tbsp|tsp|cup)\b/);
    if (m) return { qty: Number(m[1]), unit: m[3] };
    if (t.startsWith('pinch')) return { qty: 0, unit: 'pinch' };
    if (t.includes('optional')) return { qty: 0, unit: 'optional' };
    return null;
  }

  function estimateMacros(ingredients) {
    const total = { cal: 0, p: 0, c: 0, f: 0, fiber: 0 };
    let hits = 0;

    (ingredients || []).forEach(function (ing) {
      const t = normalizeIngredient(ing);
      const match = nutritionDB.find(entry => entry.match.test(t));
      if (!match) return;
      hits += 1;

      const qty = parseQty(ing);
      let factor = 1;
      if (qty && match.base && qty.unit === match.base.unit && match.base.qty) {
        factor = qty.qty / match.base.qty;
      }

      total.cal += match.macros.cal * factor;
      total.p += match.macros.p * factor;
      total.c += match.macros.c * factor;
      total.f += match.macros.f * factor;
      total.fiber += match.macros.fiber * factor;
    });

    const rounded = {
      cal: Math.round(total.cal),
      p: Math.round(total.p),
      c: Math.round(total.c),
      f: Math.round(total.f),
      fiber: Math.round(total.fiber),
      confidence: hits >= 2 ? 'medium' : hits === 1 ? 'low' : 'unknown',
    };
    return rounded;
  }

  function ensureSwapStateForRecipe(recipe) {
    ingredientSwaps = new Map();
    (recipe && recipe.ingredients ? recipe.ingredients : []).forEach(function (ing) {
      const key = stableKeyForIngredient(ing);
      ingredientSwaps.set(key, { chosen: ing, mode: 'auto' });
    });
  }

  function getAppliedIngredients(recipe) {
    const base = (recipe && recipe.ingredients) ? recipe.ingredients : [];
    return base.map(function (ing) {
      const key = stableKeyForIngredient(ing);
      const st = ingredientSwaps.get(key);
      return st && st.chosen ? st.chosen : ing;
    });
  }

  function goalIs(goal) {
    return drawerGoals.has(goal);
  }

  function setGoals(nextGoals) {
    drawerGoals = new Set(nextGoals && nextGoals.length ? nextGoals : ['balanced']);
    if (drawerGoals.size > 1) drawerGoals.delete('balanced');
    if (drawerGoals.size === 0) drawerGoals.add('balanced');
  }

  function suggestSubstitutes(ingredientText) {
    const t = normalizeIngredient(ingredientText);
    const wantsProtein = goalIs('protein');
    const wantsFiber = goalIs('fiber');
    const wantsLowerCal = goalIs('lowercal');

    function pack(label, reason) {
      return { label, reason };
    }

    // taste-forward substitutions with goal-aware picks
    if (/(milk|plant milk|almond milk|oat milk|soy milk)/.test(t)) {
      if (wantsProtein) return [pack('Soy milk', 'Creamy like milk, typically higher protein.'), pack('Ultra-filtered milk', 'Similar taste; higher protein per cup.')];
      if (wantsLowerCal) return [pack('Unsweetened almond milk', 'Keeps it creamy with fewer calories.'), pack('Unsweetened cashew milk', 'Neutral + creamy, often lower calorie.')];
      return [pack('Oat milk', 'Naturally sweet/creamy.'), pack('Soy milk', 'Creamy with more body.')];
    }
    if (/(yogurt|greek yogurt|skyr)/.test(t)) {
      if (wantsProtein) return [pack('Skyr or 0% Greek yogurt', 'Tangy/creamy, often even higher protein.'), pack('Cottage cheese (blended)', 'Creamy texture + high protein.')];
      if (wantsLowerCal) return [pack('0% Greek yogurt', 'Keeps thickness with fewer calories.'), pack('Plain nonfat yogurt', 'Similar tang with lighter macros.')];
      return [pack('Greek yogurt', 'Thicker + tangy like yogurt.'), pack('Kefir (drinkable)', 'Tart and creamy, great for no-cook.')];
    }
    if (/(nut butter|peanut butter|almond butter)/.test(t)) {
      if (wantsLowerCal) return [pack('Powdered peanut butter (PB2) + water', 'Nutty taste with fewer calories.'), pack('Pumpkin purée', 'Creamy body with lower calories.')];
      if (wantsProtein) return [pack('Powdered peanut butter (PB2)', 'Nutty taste + extra protein per calorie.'), pack('Greek yogurt + a little vanilla', 'Creamy and higher protein.')];
      return [pack('Tahini', 'Toasty, nutty vibe.'), pack('Sunflower seed butter', 'Similar texture; different but familiar taste.')];
    }
    if (/(cocoa|cacao)/.test(t)) {
      return [pack('Cacao powder', 'Very similar chocolate flavor.'), pack('Carob powder', 'Chocolate-adjacent, naturally sweeter.')];
    }
    if (/(oats|rolled oats|oatmeal)/.test(t)) {
      if (wantsFiber) return [pack('Oat bran', 'Similar flavor, higher fiber.'), pack('Chia seeds (small amount)', 'Adds gel/chew + lots of fiber.')];
      if (wantsProtein) return [pack('Protein oats (add a scoop of protein)', 'Keeps oat taste while boosting protein.'), pack('Quinoa flakes', 'Similar porridge vibe with more protein.')];
      if (wantsLowerCal) return [pack('Zucchini oats (add shredded zucchini)', 'Same bowl, more volume for fewer calories.'), pack('Cauliflower “oats” (riced)', 'Neutral base; keeps volume very light.')];
      return [pack('Quinoa flakes', 'Warm and comforting like oats.'), pack('Granola (lighter portion)', 'Crunchy oat flavor.')];
    }
    if (/(banana)/.test(t)) {
      if (wantsLowerCal) return [pack('Frozen berries', 'Sweet/cold like banana but typically lower calorie per volume.'), pack('Pumpkin purée', 'Sweet, creamy texture with fewer calories.')];
      if (wantsFiber) return [pack('Mashed pear', 'Soft sweetness + more fiber.'), pack('Chia gel', 'Helps bind + adds fiber.')];
      return [pack('Applesauce', 'Similar sweetness + moisture.'), pack('Dates (a little)', 'Caramel sweetness, great for bites.')];
    }
    if (/(honey|maple syrup|sweetener)/.test(t)) {
      if (wantsLowerCal) return [pack('Monk fruit / stevia (small amount)', 'Sweetness with fewer calories.'), pack('Extra berries or cinnamon', 'Boosts “sweet” perception without much sugar.')];
      return [pack('Maple syrup', 'Warm sweetness.'), pack('Honey', 'Floral sweetness.')];
    }
    if (/(lentil)/.test(t)) {
      if (wantsProtein) return [pack('Chicken or turkey (if you eat it)', 'Similar “hearty” feel with higher protein.'), pack('Extra lentils + less rice/bread', 'Boosts protein within the same flavor.')];
      return [pack('Chickpeas', 'Similar hearty texture.'), pack('White beans', 'Creamy, mild, comforting.')];
    }
    if (/(chickpea|garbanzo)/.test(t)) {
      if (wantsLowerCal) return [pack('Air-fried chickpeas (less oil)', 'Same crunch with fewer calories from oil.'), pack('Edamame (roasted)', 'Crunchy + higher protein per calorie.')];
      if (wantsProtein) return [pack('Edamame', 'Similar bite; higher protein.'), pack('Roasted soy nuts', 'Crunchy, very high protein.')];
      return [pack('White beans', 'Mild + creamy.'), pack('Lentils', 'Earthy, hearty.')];
    }
    if (/(bread|toast)/.test(t)) {
      if (wantsFiber) return [pack('Whole-grain / seeded bread', 'Same format; more fiber.'), pack('High-fiber wrap', 'Similar convenience with added fiber.')];
      if (wantsLowerCal) return [pack('Thin-sliced bread', 'Same toast vibe, fewer calories.'), pack('Rice cake', 'Crunchy base with fewer calories (less cozy).')];
      if (wantsProtein) return [pack('High-protein bread', 'Same format; more protein.'), pack('Whole-grain pita + extra topping', 'Balances carbs with protein/fat.')];
      return [pack('Whole-grain bread', 'Similar taste, more staying power.'), pack('Sourdough', 'Tangy + satisfying.')];
    }

    // generic fallback
    const generic = [];
    if (wantsProtein) generic.push(pack('Add Greek yogurt / cottage cheese', 'Easy protein boost without changing flavor too much.'));
    if (wantsFiber) generic.push(pack('Add chia/flax or berries', 'Adds fiber and texture with familiar tastes.'));
    if (wantsLowerCal) generic.push(pack('Use a smaller portion + add fruit/veg volume', 'Keeps satisfaction while lowering calories.'));
    if (generic.length) return generic;
    return [pack('Swap for what you have', 'Keep the same “role” (creamy, crunchy, sweet) and it’ll usually work.')];
  }

  function applyAutoSwapsForGoals(recipe) {
    // Only update ingredients that haven't been manually set.
    const baseIngredients = (recipe && recipe.ingredients) ? recipe.ingredients : [];
    baseIngredients.forEach(function (ing) {
      const key = stableKeyForIngredient(ing);
      const st = ingredientSwaps.get(key);
      if (!st || st.mode === 'manual') return;
      const subs = suggestSubstitutes(ing);
      if (!subs || !subs.length) return;

      // If we're on "balanced", keep original. Otherwise pick the top suggestion.
      if (drawerGoals.has('balanced')) {
        ingredientSwaps.set(key, { chosen: ing, mode: 'auto' });
      } else {
        ingredientSwaps.set(key, { chosen: subs[0].label, mode: 'auto' });
      }
    });
  }

  function optionsForIngredient(ingredientText) {
    const subs = suggestSubstitutes(ingredientText);
    const options = [{ label: ingredientText, reason: 'Original' }];
    (subs || []).slice(0, 3).forEach(s => options.push({ label: s.label, reason: s.reason }));
    // de-dupe by normalized label
    const seen = new Set();
    return options.filter(function (o) {
      const k = normalizeIngredient(o.label);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function renderGoalPills() {
    const pills = [
      { id: 'balanced', label: 'Balanced' },
      { id: 'protein', label: 'More protein' },
      { id: 'fiber', label: 'More fiber' },
      { id: 'lowercal', label: 'Less calories' },
    ];

    return (
      '<div class="flex flex-wrap gap-2 mt-2">' +
      pills.map(function (p) {
        const active = drawerGoals.has(p.id);
        const cls = active
          ? 'bg-accent text-white border-accent'
          : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sage-100 dark:hover:bg-slate-700';
        return (
          '<button type="button" class="drawer-goal px-3 py-2 rounded-xl border text-xs font-medium transition-colors ' +
          cls +
          '" data-goal="' + escapeHtml(p.id) + '">' +
          escapeHtml(p.label) +
          '</button>'
        );
      }).join('') +
      '</div>'
    );
  }

  function renderDrawer(recipe) {
    if (!drawerBody || !drawerTitle) return;
    if (!recipe) {
      drawerTitle.textContent = 'Recipe details';
      drawerBody.innerHTML = '<div class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">Choose a recipe to see macros, ingredients, and easy substitutes.</div>';
      return;
    }

    applyAutoSwapsForGoals(recipe);
    const appliedIngredients = getAppliedIngredients(recipe);
    const macros = estimateMacros(appliedIngredients);
    drawerTitle.textContent = recipe.name || 'Recipe';

    const macroCard = function (label, value, sub) {
      return (
        '<div class="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/60 p-4 shadow-soft dark:shadow-soft-dark">' +
        '<p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">' + escapeHtml(label) + '</p>' +
        '<p class="text-2xl font-semibold text-slate-800 dark:text-white mt-1">' + escapeHtml(String(value)) + '</p>' +
        (sub ? '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">' + escapeHtml(sub) + '</p>' : '') +
        '</div>'
      );
    };

    const confidenceText =
      macros.confidence === 'medium'
        ? 'Estimated from common portions'
        : macros.confidence === 'low'
          ? 'Very rough estimate'
          : 'Not enough info to estimate';

    let html = '';
    html += '<div class="space-y-6">';

    html += '<div>';
    html += '<p class="text-sm font-medium text-slate-700 dark:text-slate-200">Optimize substitutions for</p>';
    html += renderGoalPills();
    html += '</div>';

    html += '<div>';
    html += '<div class="flex items-center justify-between gap-3 mb-3">';
    html += '<p class="text-sm font-medium text-slate-700 dark:text-slate-200">Macros</p>';
    html += '<p class="text-xs text-slate-500 dark:text-slate-400">' + escapeHtml(confidenceText) + '</p>';
    html += '</div>';
    html += '<div class="grid grid-cols-2 gap-3">';
    html += macroCard('Calories', macros.cal ? (macros.cal + ' kcal') : '—', '');
    html += macroCard('Protein', macros.p ? (macros.p + ' g') : '—', '');
    html += macroCard('Carbs', macros.c ? (macros.c + ' g') : '—', '');
    html += macroCard('Fat', macros.f ? (macros.f + ' g') : '—', '');
    html += '</div>';
    html += '<div class="mt-3">';
    html += macroCard('Fiber', macros.fiber ? (macros.fiber + ' g') : '—', 'Often key for fullness + gut support');
    html += '</div>';
    html += '</div>';

    html += '<div class="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/60 p-5 shadow-soft dark:shadow-soft-dark">';
    html += '<p class="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Ingredients</p>';
    html += '<div class="space-y-3">';
    (recipe.ingredients || []).forEach(function (ing) {
      const key = stableKeyForIngredient(ing);
      const st = ingredientSwaps.get(key) || { chosen: ing, mode: 'auto' };
      const opts = optionsForIngredient(ing);
      const applied = st && st.chosen ? st.chosen : ing;
      const isSwapped = normalizeIngredient(applied) !== normalizeIngredient(ing);
      html += '<div class="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/30 p-4">';
      html += '<div class="flex items-start gap-3">';
      html += '<div class="w-10 h-10 rounded-2xl bg-sage-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/70 dark:border-slate-700/70">';
      html += ingredientIconSvg(ing);
      html += '</div>';
      html += '<div class="min-w-0 flex-1">';
      html += '<p class="text-sm font-semibold text-slate-800 dark:text-white truncate">' + escapeHtml(ing) + '</p>';
      html += '<div class="mt-2 flex items-center gap-2">';
      html += '<label class="text-xs text-slate-500 dark:text-slate-400" for="swap_' + escapeHtml(key) + '">Applied</label>';
      html += '<select id="swap_' + escapeHtml(key) + '" class="ingredient-swap w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 text-sm" data-ingredient="' + escapeHtml(key) + '">';
      opts.forEach(function (o) {
        const selected = normalizeIngredient(o.label) === normalizeIngredient(applied) ? ' selected' : '';
        html += '<option value="' + escapeHtml(o.label) + '"' + selected + '>' + escapeHtml(o.label) + '</option>';
      });
      html += '</select>';
      html += '</div>';
      html += '<p class="text-xs mt-2 ' + (isSwapped ? 'text-accent' : 'text-slate-500 dark:text-slate-400') + '">';
      html += isSwapped ? ('Using: ' + escapeHtml(applied) + (st.mode === 'manual' ? ' (locked)' : ' (auto)')) : 'Using original ingredient';
      html += '</p>';
      html += '<div class="mt-3 flex flex-wrap gap-2">';
      html += '<button type="button" class="swap-lock px-3 py-2 rounded-xl border text-xs font-medium transition-colors ' +
        (st.mode === 'manual'
          ? 'bg-accent text-white border-accent'
          : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sage-100 dark:hover:bg-slate-700') +
        '" data-ingredient="' + escapeHtml(key) + '" data-action="toggle-lock">' + (st.mode === 'manual' ? 'Locked' : 'Lock') + '</button>';
      html += '<button type="button" class="swap-reset px-3 py-2 rounded-xl border text-xs font-medium transition-colors bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-sage-100 dark:hover:bg-slate-700" data-ingredient="' + escapeHtml(key) + '" data-action="reset">Reset</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    html += '</div>';

    drawerBody.innerHTML = html;
  }

  function detailedStepFor(line) {
    const t = normalizeIngredient(line);
    if (t.includes('warm') || t.includes('heat') || t.includes('simmer') || t.includes('bake') || t.includes('roast')) {
      return 'Keep heat gentle; stop when it smells fragrant (don’t scorch). If it thickens too much, add a splash of liquid.';
    }
    if (t.includes('whisk') || t.includes('stir') || t.includes('mix')) {
      return 'Mix until smooth—small lumps are fine. If it’s too thick, add 1–2 tsp liquid; too thin, add a little more dry ingredient.';
    }
    if (t.includes('blend')) {
      return 'Start low and add liquid slowly. Scrape down once; blend again for a creamier texture.';
    }
    if (t.includes('top') || t.includes('serve')) {
      return 'Taste first, then adjust: pinch of salt for flavor, cinnamon for warmth, or a little extra fruit for sweetness.';
    }
    if (t.includes('shape') || t.includes('chill')) {
      return 'If it’s sticky, wet your hands. Chill 10–20 min to firm up, or eat right away for a softer bite.';
    }
    return 'Go by taste and texture—this is flexible. Small adjustments are totally okay.';
  }

  function renderInstructions(recipe) {
    if (!instructionsContent) return;
    if (!recipe) {
      instructionsContent.innerHTML =
        '<p>Submit a craving to generate ideas. Then hit <span class="font-medium">View recipe</span> to see step-by-step directions here.</p>' +
        '<ul class="mt-3 space-y-2">' +
        '<li><span class="font-medium">Faster:</span> ask for “quick” in the adjustment box.</li>' +
        '<li><span class="font-medium">No-cook:</span> ask for “no cook”.</li>' +
        '<li><span class="font-medium">Diet goals:</span> use the right panel’s swap goals (protein/fiber/less calories).</li>' +
        '</ul>';
      return;
    }

    const steps = recipe.steps || [];
    let html = '';
    html += '<div class="space-y-4">';
    const eatenId = recipe && recipe._eatenId ? String(recipe._eatenId) : '';
    const isEaten = eatenId && eatenState.meals.some(m => String(m.id) === eatenId);

    html += '<div class="rounded-2xl bg-sage-100/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 p-4">';
    html += '<p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected recipe</p>';
    html += '<p class="text-base font-semibold text-slate-800 dark:text-white mt-1">' + escapeHtml(recipe.name || 'Recipe') + '</p>';
    html += '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Tip: use the swap dropdowns on the right to adjust ingredients—macros update automatically.</p>';
    html += '<div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">';
    html += '<button type="button" id="toggleEaten" class="px-4 py-2 rounded-xl border text-sm font-medium transition-colors ' +
      (isEaten ? 'bg-accent text-white border-accent bg-accent-hover' : 'bg-white/70 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:bg-sage-100 dark:hover:bg-slate-700') +
      '" data-eaten-id="' + escapeHtml(eatenId) + '">' + (isEaten ? 'Eaten ✓ (undo)' : 'Mark as eaten') + '</button>';
    html += '<p class="text-xs text-slate-500 dark:text-slate-400">Adds this meal to today’s progress using the current ingredient swaps.</p>';
    html += '</div>';
    html += '</div>';

    html += '<ol class="space-y-3">';
    steps.forEach(function (s, idx) {
      html += '<li class="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/25 p-4">';
      html += '<div class="flex items-start gap-3">';
      html += '<div class="shrink-0 w-9 h-9 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-center text-sm font-semibold text-slate-700 dark:text-slate-200">' + escapeHtml(String(idx + 1)) + '</div>';
      html += '<div class="min-w-0">';
      html += '<p class="text-sm font-medium text-slate-800 dark:text-white">' + escapeHtml(s) + '</p>';
      html += '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">' + escapeHtml(detailedStepFor(s)) + '</p>';
      html += '</div>';
      html += '</div>';
      html += '</li>';
    });
    html += '</ol>';

    html += '<div class="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/30 p-4">';
    html += '<p class="text-sm font-semibold text-slate-800 dark:text-white">Make it easier</p>';
    html += '<ul class="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">';
    html += '<li><span class="font-medium">No-cook shortcut:</span> choose a yogurt/parfait-style option or use pre-cooked staples.</li>';
    html += '<li><span class="font-medium">Less dishes:</span> mix in the serving bowl; rinse tools immediately.</li>';
    html += '<li><span class="font-medium">Better texture:</span> add liquid slowly; adjust thickness at the end.</li>';
    html += '</ul>';
    html += '</div>';

    html += '</div>';
    instructionsContent.innerHTML = html;
  }

  function selectRecipe(index) {
    selectedRecipeIndex = clamp(index, 0, (lastRecipeSet || []).length - 1);
    const recipe = (lastRecipeSet || [])[selectedRecipeIndex];
    ensureSwapStateForRecipe(recipe);
    if (recipe && !recipe._eatenId) recipe._eatenId = (todayKey() + '-' + selectedRecipeIndex + '-' + Math.random().toString(16).slice(2));
    renderDrawer(recipe);
    renderInstructions(recipe);
    openDrawer();
  }

  function getRecipeSet(craving) {
    const lower = craving.toLowerCase();
    if (lower.includes('chocolate') || lower.includes('cocoa')) return recipes.chocolate;
    if (lower.includes('sweet') || lower.includes('sugar') || lower.includes('dessert')) return recipes.sweet;
    if (lower.includes('warm') || lower.includes('comfort') || lower.includes('soup')) return recipes.warm;
    if (lower.includes('crunch') || lower.includes('crisp')) return recipes.crunchy;
    return recipes.default;
  }

  function applyFollowUp(recipeSet, followUp) {
    const lower = (followUp || '').toLowerCase();
    const noCook = lower.includes("don't want to cook") || lower.includes('no cook') || lower.includes('without cooking');
    const noBanana = lower.includes('banana') && (lower.includes("don't have") || lower.includes('no '));
    const quicker = lower.includes('quicker') || lower.includes('faster') || lower.includes('quick');
    const lowerCal = lower.includes('lower calorie') || lower.includes('lighter') || lower.includes('low cal');

    let set = recipeSet.map(r => ({ ...r }));
    if (noCook) {
      set = [
        { name: 'No-cook yogurt parfait', ingredients: ['Yogurt', 'Granola or cereal', 'Fruit'], steps: ['Layer yogurt, fruit, and granola in a bowl.'] },
        { name: 'Hummus and veggie plate', ingredients: ['Hummus', 'Cucumber, carrot, pepper'], steps: ['Slice veggies and serve with hummus.'] },
        { name: 'Nut butter and fruit', ingredients: ['Apple or banana', 'Nut butter'], steps: ['Slice fruit and enjoy with nut butter.'] },
      ];
    }
    if (noBanana && set.some(r => r.ingredients.some(i => i.toLowerCase().includes('banana')))) {
      set = set.map(r => ({
        ...r,
        ingredients: r.ingredients.map(i => i.toLowerCase().includes('banana') ? 'Dates or applesauce' : i),
        steps: r.steps.map(s => s.replace(/banana/gi, 'dates or applesauce')),
      }));
    }
    if (quicker) {
      set.forEach(r => { r.steps = r.steps.slice(0, 2); });
    }
    if (lowerCal) {
      set.forEach(r => { r.lighter = true; });
    }
    return set;
  }

  function renderResponse(craving, context, followUp) {
    const recipeSet = getRecipeSet(craving);
    const withFollowUp = applyFollowUp(recipeSet, followUp);
    const summary = pick(summaries);
    const showLighter = withFollowUp.some(r => r.lighter) || (context === 'dieting' || context === 'healthy') || (followUp || '').toLowerCase().includes('lower calorie');

    let html = '';
    html += '<p class="text-slate-700 dark:text-slate-200 text-lg leading-relaxed mb-6">' + escapeHtml(summary) + '</p>';
    html += '<h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-4">A few gentle ideas</h3>';
    html += '<div class="space-y-6">';

    withFollowUp.slice(0, 3).forEach(function (r) {
      html += '<div class="border-l-4 border-accent-soft pl-4 py-2">';
      html += '<div class="flex items-start justify-between gap-3">';
      html += '<h4 class="font-medium text-slate-800 dark:text-white mb-2">' + escapeHtml(r.name) + '</h4>';
      html += '<button type="button" class="view-recipe shrink-0 text-xs px-3 py-2 rounded-xl bg-sage-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 hover:bg-sage-200 dark:hover:bg-slate-600 transition-colors" data-recipe="' + escapeHtml(String(withFollowUp.indexOf(r))) + '">View recipe</button>';
      html += '</div>';
      html += '<p class="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Ingredients</p>';
      html += '<ul class="list-disc list-inside text-slate-600 dark:text-slate-400 text-sm mb-2">';
      r.ingredients.forEach(function (i) {
        html += '<li>' + escapeHtml(i) + '</li>';
      });
      html += '</ul>';
      html += '<p class="text-xs text-slate-500 dark:text-slate-400">Full step-by-step instructions appear under the main button after you pick a recipe.</p>';
      if (r.lighter) {
        html += '<p class="text-sm text-accent mt-2">' + escapeHtml(pick(lighterNotes)) + '</p>';
      }
      html += '</div>';
    });

    html += '</div>';
    if (showLighter && !withFollowUp.some(r => r.lighter)) {
      html += '<p class="mt-6 text-sm text-slate-600 dark:text-slate-400">' + escapeHtml(pick(lighterNotes)) + '</p>';
    }

    return html;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showResponse(craving, context, followUp) {
    lastCraving = craving;
    lastContext = context;
    lastFollowUp = followUp;
    lastRecipeSet = applyFollowUp(getRecipeSet(craving), followUp).slice(0, 3);
    aiResponsePlaceholder.classList.add('hidden');
    aiResponseContent.classList.remove('hidden');
    aiResponseContent.innerHTML = renderResponse(craving, context, followUp);
    // Open the recipe drawer with the first suggestion by default.
    selectRecipe(0);
  }

  if (submitCraving) {
    submitCraving.addEventListener('click', function () {
      const craving = (cravingInput && cravingInput.value) ? cravingInput.value.trim() : 'something comforting';
      const context = considerSelect ? considerSelect.value : '';
      showResponse(craving, context, '');
      if (followUpInput) followUpInput.value = '';
      lastFollowUp = '';
    });
  }

  if (submitFollowUp) {
    submitFollowUp.addEventListener('click', function () {
      const followUp = followUpInput ? followUpInput.value.trim() : '';
      if (!lastCraving) {
        const craving = (cravingInput && cravingInput.value) ? cravingInput.value.trim() : 'something good';
        showResponse(craving, considerSelect ? considerSelect.value : '', followUp);
      } else {
        showResponse(lastCraving, lastContext, followUp);
      }
    });
  }

  if (cravingInput) {
    cravingInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (submitCraving) submitCraving.click();
      }
    });
  }
  if (followUpInput) {
    followUpInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (submitFollowUp) submitFollowUp.click();
      }
    });
  }

  if (aiResponseContent) {
    aiResponseContent.addEventListener('click', function (e) {
      const target = e.target;
      if (!target) return;
      const btn = target.closest ? target.closest('button.view-recipe') : null;
      if (!btn) return;
      const idx = Number(btn.getAttribute('data-recipe') || '0');
      selectRecipe(isNaN(idx) ? 0 : idx);
    });
  }

  if (drawerBody) {
    drawerBody.addEventListener('click', function (e) {
      const target = e.target;
      if (!target) return;
      const btn = target.closest ? target.closest('button.drawer-goal') : null;
      if (btn) {
        const goal = btn.getAttribute('data-goal');
        if (!goal) return;

        if (goal === 'balanced') {
          setGoals(['balanced']);
        } else {
          if (drawerGoals.has(goal)) drawerGoals.delete(goal);
          else drawerGoals.add(goal);
          setGoals(Array.from(drawerGoals));
        }

        // Re-render drawer with updated goals (this will also auto-apply swaps).
        const recipe = (lastRecipeSet || [])[selectedRecipeIndex];
        renderDrawer(recipe);
        return;
      }

      const swapBtn = target.closest ? target.closest('button.swap-lock, button.swap-reset') : null;
      if (!swapBtn) return;
      const key = swapBtn.getAttribute('data-ingredient');
      const action = swapBtn.getAttribute('data-action');
      if (!key || !action) return;
      const recipe = (lastRecipeSet || [])[selectedRecipeIndex];
      if (!recipe) return;

      const baseIng = (recipe.ingredients || []).find(i => stableKeyForIngredient(i) === key);
      if (!baseIng) return;

      const st = ingredientSwaps.get(key) || { chosen: baseIng, mode: 'auto' };
      if (action === 'toggle-lock') {
        st.mode = st.mode === 'manual' ? 'auto' : 'manual';
        ingredientSwaps.set(key, st);
      }
      if (action === 'reset') {
        ingredientSwaps.set(key, { chosen: baseIng, mode: 'auto' });
      }

      renderDrawer(recipe);
    });

    drawerBody.addEventListener('change', function (e) {
      const target = e.target;
      if (!target) return;
      const select = target.closest ? target.closest('select.ingredient-swap') : null;
      if (!select) return;
      const key = select.getAttribute('data-ingredient');
      const value = select.value;
      if (!key || !value) return;

      const recipe = (lastRecipeSet || [])[selectedRecipeIndex];
      if (!recipe) return;

      const st = ingredientSwaps.get(key) || { chosen: value, mode: 'manual' };
      st.chosen = value;
      // selecting a value implies user intent; lock it unless already auto and selecting original.
      st.mode = 'manual';
      ingredientSwaps.set(key, st);

      renderDrawer(recipe);
    });
  }

  if (closeDrawer) closeDrawer.addEventListener('click', closeRecipeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeRecipeDrawer();
  });

  // —— Progress / eaten tracking events ——
  if (saveGoals) saveGoals.addEventListener('click', saveGoalsToStorage);
  if (resetDay) {
    resetDay.addEventListener('click', function () {
      eatenState.meals = [];
      saveEatenDay();
    });
  }
  if (mealsList) {
    mealsList.addEventListener('click', function (e) {
      const t = e.target;
      if (!t) return;
      const btn = t.closest ? t.closest('button.remove-meal') : null;
      if (!btn) return;
      const id = btn.getAttribute('data-meal-id');
      if (!id) return;
      eatenState.meals = eatenState.meals.filter(m => String(m.id) !== String(id));
      saveEatenDay();
      // refresh instructions eaten button if it's the current meal
      const recipe = (lastRecipeSet || [])[selectedRecipeIndex];
      renderInstructions(recipe);
    });
  }

  if (instructionsContent) {
    instructionsContent.addEventListener('click', function (e) {
      const t = e.target;
      if (!t) return;
      const btn = t.closest ? t.closest('button#toggleEaten') : null;
      if (!btn) return;

      const recipe = (lastRecipeSet || [])[selectedRecipeIndex];
      if (!recipe) return;
      const eatenId = recipe._eatenId || btn.getAttribute('data-eaten-id') || '';
      if (!eatenId) return;

      const existing = eatenState.meals.find(m => String(m.id) === String(eatenId));
      if (existing) {
        eatenState.meals = eatenState.meals.filter(m => String(m.id) !== String(eatenId));
        saveEatenDay();
        renderInstructions(recipe);
        return;
      }

      // Snapshot current applied swaps into macros at eat-time.
      applyAutoSwapsForGoals(recipe);
      const appliedIngredients = getAppliedIngredients(recipe);
      const macros = estimateMacros(appliedIngredients);
      eatenState.meals.push({
        id: eatenId,
        name: recipe.name || 'Meal',
        ts: Date.now(),
        macros: { cal: macros.cal || 0, p: macros.p || 0, c: macros.c || 0, f: macros.f || 0, fiber: macros.fiber || 0 },
      });
      saveEatenDay();
      renderInstructions(recipe);
    });
  }

  // Initial render
  loadGoals();
  loadEatenDay();
})();
