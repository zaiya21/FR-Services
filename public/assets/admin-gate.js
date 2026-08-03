/* =====================================================================
   ADMIN-GATE - the real sign-in gate for a company's own console.

   Blocks _LegacyScripts.jsx from ever loading /pages/admin.js until this
   decides who's asking (see app/admin/page.jsx's waitEvents) - the same
   reason /platform's gate exists, but the rule here is stricter: this
   console belongs to one company's own owner/staff, full stop. A signed-in
   FR Services (platform) account is refused too, not just a stranger -
   platform has its own console at /platform and no business using this
   one. Support access, if ever needed, is a /platform-side tool to build
   later, not a door left open on the owner's own console.

   Renders its sign-in form and every refusal state directly into
   #bootOverlay (see markup.jsx / page.css) rather than needing separate
   gate markup - the overlay already covers the whole page from first
   paint, so it doubles as the gate's home.
   ===================================================================== */
(async () => {
  const overlay = document.getElementById('bootOverlay');
  if (!overlay){ window.dispatchEvent(new Event('admin-gate-ready')); return; }

  const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));

  function renderSignIn(message){
    overlay.innerHTML =
      '<div class="admin-gate-card">' +
        '<h2>Sign in to your dashboard</h2>' +
        '<p>' + (message || 'This console is for a registered company’s own owner or staff.') + '</p>' +
        '<p class="gerr" id="agErr"></p>' +
        '<form id="agForm">' +
          '<label>Email<input type="email" id="agEmail" required autocomplete="username" /></label>' +
          '<label>Password<input type="password" id="agPass" required autocomplete="current-password" /></label>' +
          '<button class="btn btn-i btn-lg" type="submit" style="width:100%">Sign in</button>' +
        '</form>' +
        '<div class="glinks"><a href="/forgot-password">Forgot password?</a><a href="/register">Register a company</a></div>' +
      '</div>';
    document.getElementById('agForm').addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('agEmail').value.trim();
      const pass = document.getElementById('agPass').value;
      const err = document.getElementById('agErr');
      err.textContent = '';
      const r = await companyAuthSignIn(email, pass, false);
      if (!r.ok){ err.textContent = r.error; return; }
      location.reload();
    });
  }

  function renderMessage(title, bodyHtml, opts){
    opts = opts || {};
    overlay.innerHTML =
      '<div class="admin-gate-card">' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + bodyHtml + '</p>' +
        '<div class="glinks"><a href="/">Back to marketplace</a>' +
        (opts.signOut ? '<a href="#" id="agSignOut">Sign out</a>' : '') +
        '</div>' +
      '</div>';
    if (opts.signOut){
      document.getElementById('agSignOut').addEventListener('click', async e => {
        e.preventDefault();
        await companyAuthSignOut();
        location.reload();
      });
    }
  }

  let sb = window.supabaseBrowser;
  if (!sb){
    /* This used to wait forever if the ready event never fired for any
       reason - a real hang, not an error, which is exactly what "the page
       is just blank" looks like: renderMessage() never gets a chance to
       run. A page must never wait indefinitely on something outside its
       own control; 5 seconds and then fail visibly instead. */
    sb = await new Promise(resolve => {
      window.addEventListener('supabase-browser-ready', () => resolve(window.supabaseBrowser), { once:true });
      setTimeout(() => resolve(window.supabaseBrowser || null), 5000);
    });
  }
  if (!sb || typeof companyAuthSession !== 'function'){
    renderMessage('Something went wrong', 'Reload the page. If this keeps happening, the database connection did not start correctly.');
    return;
  }

  const wantId = new URLSearchParams(location.search).get('c');
  const session = await companyAuthSession();

  if (!session){
    renderSignIn();
    return;
  }

  if (session.role === 'platform'){
    renderMessage(
      'This isn’t FR Services’ console',
      'You’re signed in as FR Services staff. A company’s dashboard belongs to its own owner - use <a href="/platform">/platform</a> for marketplace-wide oversight.',
      { signOut: true }
    );
    return;
  }

  if (!wantId){
    const { data } = await sb.from('company_members').select('company_id').eq('user_id', session.id);
    const ids = (data || []).map(r => r.company_id);
    if (ids.length === 1){
      location.replace('/admin?c=' + encodeURIComponent(ids[0]));
      return;
    }
    if (ids.length > 1){
      renderMessage(
        'Which company?',
        'Your account belongs to more than one company: ' +
          ids.map(id => `<a href="/admin?c=${encodeURIComponent(id)}">${esc(id)}</a>`).join(', ') + '.',
        { signOut: true }
      );
      return;
    }
    renderMessage(
      'No company to administer yet',
      'This console manages a registered company. <a href="/register">Register one</a> first and its dashboard appears here.',
      { signOut: true }
    );
    return;
  }

  const { data: membership } = await sb
    .from('company_members')
    .select('company_id')
    .eq('user_id', session.id)
    .eq('company_id', wantId)
    .maybeSingle();

  if (!membership){
    renderMessage(
      'Not your company',
      'Your account isn’t a member of this company, so its dashboard isn’t yours to see.',
      { signOut: true }
    );
    return;
  }

  overlay.remove();
  window.dispatchEvent(new Event('admin-gate-ready'));
})();
