'use client';

import { useState } from 'react';

export default function Page(){
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e){
    e.preventDefault();
    setError('');
    if (pass !== pass2){ setError('The two passwords do not match.'); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/owner/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });
      const data = await res.json();
      if (!data.ok){ setError(data.error || 'Something went wrong.'); return; }
      setDone(true);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ maxWidth:420, width:'100%' }}>
        <h1 style={{ fontSize:24, marginBottom:10 }}>Set a new password</h1>

        {done ? (
          <>
            <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:20 }}>
              Your password is changed and you&rsquo;re still signed in.
            </p>
            <a className="btn btn-i btn-lg" href="/admin">Go to your admin page</a>
          </>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:20 }}>
              At least 10 characters, with a letter and a number.
            </p>
            {error && (
              <p style={{ color:'var(--danger, #B91C1C)', fontWeight:600, marginBottom:12 }}>{error}</p>
            )}
            <label style={{ display:'block', marginBottom:14 }}>
              <span style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:6 }}>New password</span>
              <input
                type="password" required autoComplete="new-password"
                value={pass} onChange={e => setPass(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #ccc', fontSize:15 }}
              />
            </label>
            <label style={{ display:'block', marginBottom:20 }}>
              <span style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:6 }}>Confirm password</span>
              <input
                type="password" required autoComplete="new-password"
                value={pass2} onChange={e => setPass2(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #ccc', fontSize:15 }}
              />
            </label>
            <button className="btn btn-i btn-lg" type="submit" disabled={busy} style={{ width:'100%' }}>
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
