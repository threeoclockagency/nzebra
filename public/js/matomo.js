/* Matomo (Cloud) loader — cookieless, privacy-friendly. Served from our own
   origin so the CSP stays script-src 'self' https://cdn.matomo.cloud. The
   instance host and site id are passed as data-* attributes on the script tag
   (no inline JS), e.g.:
     <script src="/js/matomo.js" data-host="example.matomo.cloud" data-site-id="1" defer></script>
   IP anonymisation is enabled in the Matomo dashboard (server side). */
(function () {
  'use strict';
  var el = document.currentScript;
  if (!el) return;
  var host = el.getAttribute('data-host');
  var siteId = el.getAttribute('data-site-id');
  if (!host || !siteId) return;

  var _paq = (window._paq = window._paq || []);
  _paq.push(['disableCookies']); // no cookies -> no consent banner needed
  _paq.push(['enableLinkTracking']);
  _paq.push(['setTrackerUrl', 'https://' + host + '/matomo.php']);
  _paq.push(['setSiteId', siteId]);
  _paq.push(['trackPageView']);

  var g = document.createElement('script');
  g.async = true;
  g.src = 'https://cdn.matomo.cloud/' + host + '/matomo.js';
  document.head.appendChild(g);
})();
