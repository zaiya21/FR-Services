'use client';

import { useState, useEffect } from 'react';

export default function Page(){
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // Read straight off the URL rather than next/navigation's
    // useSearchParams(), which would force this whole page out of static
    // rendering just to catch one query param on a page that's already
    // entirely client-interactive.
    setFailed(new URLSearchParams(window.location.search).get('confirm') === 'failed');
  }, []);

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e){
    e.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/auth/owner/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ maxWidth:420, width:'100%' }}>
        <h1 style={{ fontSize:24, marginBottom:10 }}>Reset your password</h1>

        {failed && !sent && (
          <p style={{ color:'var(--danger, #B91C1C)', fontWeight:600, marginBottom:16, lineHeight:1.5 }}>
            That link has expired or was already used. Request a new one below.
          </p>
        )}

        {sent ? (
          <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6 }}>
            If <b>{email.trim()}</b> has an account, we&rsquo;ve emailed it a link to set a new
            password. Check your inbox (and spam folder) - the link is single-use and expires
            after a while, so use it soon.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:20 }}>
              Enter the email on your account and we&rsquo;ll send a link to set a new password.
            </p>
            <label style={{ display:'block', marginBottom:16 }}>
              <span style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:6 }}>Email</span>
              <input
                type="email" required autoComplete="email" placeholder="you@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #ccc', fontSize:15 }}
              />
            </label>
            <button className="btn btn-i btn-lg" type="submit" disabled={busy} style={{ width:'100%' }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ marginTop:24 }}>
          <a href="/admin" style={{ fontWeight:600 }}>Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
