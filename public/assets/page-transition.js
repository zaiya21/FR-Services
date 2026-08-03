/* =====================================================================
   PAGE-TRANSITION OVERLAY

   Every internal link here is a plain <a href>, not client-side routing -
   clicking one is a real page load, and the browser keeps showing the
   CURRENT page, fully rendered (signed-in nav, dashboard content, whatever
   was on screen) until the new page's response arrives. On a slow
   connection that gap is long enough to read as "the wrong page flashed
   before the right one showed up" - which it did, briefly, because it's
   real.

   The fix belongs on the page being LEFT, not the one being loaded: show
   a full-screen overlay the instant a same-tab internal link is clicked,
   so whatever's underneath - logged-in or not - is never what's on
   screen during the wait.
   ===================================================================== */
(function(){
  if (window.__pageTransitionInit) return;
  window.__pageTransitionInit = true;

  const style = document.createElement('style');
  style.textContent = `
    #pageTransitionOverlay{
      position:fixed;inset:0;z-index:99999;display:none;
      align-items:center;justify-content:center;
      background:var(--bg,#FBFAF7);
    }
    #pageTransitionOverlay img{
      width:56px;height:56px;animation:pt-pulse 1.1s ease-in-out infinite;
    }
    @keyframes pt-pulse{
      0%,100%{opacity:.35;transform:scale(.92)}
      50%{opacity:1;transform:scale(1)}
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'pageTransitionOverlay';
  overlay.innerHTML = '<img src="/logo.png" alt="" />';
  document.body.appendChild(overlay);

  function showOverlay(){ overlay.style.display = 'flex'; }

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    let url;
    try { url = new URL(href, location.href); } catch { return; }
    if (url.origin !== location.origin) return; // external - no overlay, new tab/site handles its own load
    showOverlay();
  }, true);

  // Back/forward out of bfcache can restore this page with the overlay
  // still up from when it was left - clear it so returning here works.
  window.addEventListener('pageshow', () => { overlay.style.display = 'none'; });
})();
