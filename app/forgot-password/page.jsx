'use client';

import { useState } from 'react';

export default function Page(){
  const [step, setStep] = useState('ask'); // 'ask' | 'code' | 'done'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function requestCode(e){
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
      setStep('code');
    }
  }

  async function confirmCode(e){
    e.preventDefault();
    setError('');
    if (pass !== pass2){ setError('The two passwords do not match.'); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/owner/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), password: pass })
      });
      const data = await res.json();
      if (!data.ok){ setError(data.error || 'Something went wrong.'); return; }
      setStep('done');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #ccc', fontSize:15 };
  const labelSpan = { display:'block', fontSize:13, fontWeight:600, marginBottom:6 };

  return (
    <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ maxWidth:420, width:'100%' }}>
        <h1 style={{ fontSize:24, marginBottom:10 }}>Reset your password</h1>

        {step === 'ask' && (
          <form onSubmit={requestCode}>
            <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:20 }}>
              Enter the email on your account and we&rsquo;ll send a 6-digit code.
            </p>
            <label style={{ display:'block', marginBottom:16 }}>
              <span style={labelSpan}>Email</span>
              <input
                type="email" required autoComplete="email" placeholder="you@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </label>
            <button className="btn btn-i btn-lg" type="submit" disabled={busy} style={{ width:'100%' }}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={confirmCode}>
            <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:20 }}>
              If <b>{email.trim()}</b> has an account, we&rsquo;ve emailed it a code. It expires in
              10 minutes and works once. Enter it below along with your new password.
            </p>
            {error && (
              <p style={{ color:'var(--danger, #B91C1C)', fontWeight:600, marginBottom:12 }}>{error}</p>
            )}
            <label style={{ display:'block', marginBottom:14 }}>
              <span style={labelSpan}>Verification code</span>
              <input
                type="text" required inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                placeholder="12345678"
                value={code} onChange={e => setCode(e.target.value)}
                style={{ ...inputStyle, letterSpacing:'0.3em', textAlign:'center', fontWeight:700 }}
              />
            </label>
            <label style={{ display:'block', marginBottom:14 }}>
              <span style={labelSpan}>New password</span>
              <input
                type="password" required autoComplete="new-password"
                value={pass} onChange={e => setPass(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display:'block', marginBottom:20 }}>
              <span style={labelSpan}>Confirm password</span>
              <input
                type="password" required autoComplete="new-password"
                value={pass2} onChange={e => setPass2(e.target.value)}
                style={inputStyle}
              />
            </label>
            <button className="btn btn-i btn-lg" type="submit" disabled={busy} style={{ width:'100%' }}>
              {busy ? 'Saving…' : 'Set new password'}
            </button>
            <button
              type="button" onClick={() => setStep('ask')}
              style={{ display:'block', width:'100%', textAlign:'center', marginTop:14, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}
            >
              Use a different email
            </button>
          </form>
        )}

        {step === 'done' && (
          <>
            <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:20 }}>
              Your password is changed. Sign in with it at <a href="/admin">/admin</a>.
            </p>
            <a className="btn btn-i btn-lg" href="/admin">Sign in</a>
          </>
        )}

        {step === 'ask' && (
          <p style={{ marginTop:24 }}>
            <a href="/admin" style={{ fontWeight:600 }}>Back to sign in</a>
          </p>
        )}
      </div>
    </div>
  );
}
