/* =====================================================================
   NAV-TOGGLE - the mobile menu button that replaces .nlinks below
   720px (see globals.css: .nlinks{display:none} there, with nothing to
   reach Rent/How it works/For companies/Emergency tow/Admin-or-Platform
   otherwise - that was the actual gap this fixes).

   Runs on every page. The nav is copied markup, not a shared component
   (same reason every page's script list is copied too), but #navToggle
   and nav.top are the same ids/classes everywhere it appears, so one
   script covers all of them.
   ===================================================================== */
(function(){
  const btn = document.getElementById('navToggle');
  const nav = document.querySelector('nav.top');
  if (!btn || !nav) return;

  function isOpen(){ return nav.classList.contains('navopen'); }
  function setOpen(open){
    nav.classList.toggle('navopen', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(!isOpen());
  });
  document.addEventListener('click', e => {
    if (isOpen() && !nav.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });
  /* Back/forward out of bfcache can restore this page with the menu
     still open from when it was left - same reason page-transition.js
     clears its own overlay on pageshow. */
  window.addEventListener('pageshow', () => setOpen(false));
})();
