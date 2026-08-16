/**
 * Migra bookmarks legacy con hash (#/ruta) a rutas path-based de v2.
 * Debe cargarse antes del bootstrap de Angular (ver index.html / index.prod.html).
 */
(function migrateLegacyHashUrl() {
  var hash = window.location.hash;
  if (!hash || hash.charAt(0) !== '#') {
    return;
  }

  var path = hash.replace(/^#\/?/, '/');
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  path = mapLegacyPath(path);

  if (path === '/' || path === '') {
    path = '/dashboard';
  }

  var target = path + (window.location.search || '');
  if (window.location.pathname + window.location.search + window.location.hash !== target) {
    window.location.replace(target);
  }
})();

function mapLegacyPath(path) {
  var rules = [
    [/^\/inventories\/products\/edit\/(\d+)\/?$/, '/inventories/products/$1/general'],
    [/^\/inventories\/products\/step\/general\/(\d+)\/?$/, '/inventories/products/$1/general'],
    [/^\/inventories\/products\/step\/sizes\/(\d+)\/?$/, '/inventories/products/$1/sizes'],
    [/^\/inventories\/products\/step\/colors\/(\d+)\/?$/, '/inventories/products/$1/colors'],
    [/^\/inventories\/products\/step\/ecommerce\/(\d+)\/?$/, '/inventories/products/$1/ecommerce'],
    [/^\/inventories\/products\/step\/history\/(\d+)\/?$/, '/inventories/products/$1/history'],
    [/^\/inventories\/products\/kardex\/(\d+)\/?$/, '/inventories/products/$1/kardex'],
    [/^\/inventories\/purchase\b/, '/inventories/purchases'],
    [/^\/inventories\/reconciliation\b/, '/inventories/reconciliations'],
    [/^\/directory\/team\b/, '/directories/teams'],
    [/^\/directory\b/, '/directories'],
    [/^\/administration\b/, '/administrations'],
    [
      /^\/finance\/cash-movements\/admin-expenses\b/,
      '/expenses/admin-expenses',
    ],
    [
      /^\/finance\/cash-movements\/accumulated-expenses\b/,
      '/expenses/accumulated-expenses',
    ],
    [/^\/financial-summary\b/, '/reports/financial-summaries'],
    [/^\/sales\/pos\b/, '/finances/pos'],
    [/^\/sales\b/, '/finances/sales'],
    [/^\/finance\/cash-movements\b/, '/finances/cash-movements'],
    [/^\/finance\b/, '/finances'],
  ];

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (rule[0].test(path)) {
      return path.replace(rule[0], rule[1]);
    }
  }

  return path;
}
