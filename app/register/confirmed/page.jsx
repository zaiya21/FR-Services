export const metadata = {
  title: "Email confirmed - FR Services",
  robots: { index: false, follow: false }
};

export default function Page(){
  return (
    <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ maxWidth:520, width:'100%', textAlign:'center' }}>
        <div style={{
          width:64, height:64, borderRadius:'50%', background:'#E8F6EC',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px'
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#057A2F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l6 6L20 6" />
          </svg>
        </div>

        <h1 style={{ fontSize:26, marginBottom:10 }}>Your email is confirmed</h1>
        <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:8 }}>
          Your account is active. FR Services still needs to check the three documents
          you submitted - DTI registration, mayor&rsquo;s permit and BIR 2303 - with the
          issuing offices before your company appears on the marketplace. That usually
          takes about 24 hours, longer on weekends.
        </p>
        <p style={{ color:'var(--ink-3, #55606b)', lineHeight:1.6, marginBottom:28 }}>
          You can sign in to your dashboard any time to check on that, add your fleet,
          or upload anything you didn&rsquo;t attach yet.
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a className="btn btn-i btn-lg" href="/admin">Sign in to your dashboard</a>
          <a className="btn btn-w btn-lg" href="/">Back to home</a>
        </div>
      </div>
    </div>
  );
}
