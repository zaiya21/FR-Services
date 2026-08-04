'use client';

export default function Markup(){
  return (
    <>
      <div className="boot-overlay" id="bootOverlay"><img src="/logo.png" alt="" /></div>

      <nav className="top">
        <div className="wrap nbar">
          <a className="logo" href="/">
            <span className="m"><img src="/logo.png" alt="FR Services" /></span>
            <span className="wm">FR Services<small>Fleet Rental</small></span>
          </a>
          <div className="nlinks" id="navLinks">
            <a href="/">Rent</a>
            <a href="/#how">How it works</a>
            <a href="/register">For companies</a>
            <a href="/tow">Emergency tow</a>
            <a href="/admin" id="adminNavLink" hidden>Admin</a>
          </div>
          <div className="nright">
            <span className="nauth" id="authNav"><a className="btn btn-i" href="/platform">Sign in</a></span>
            <button className="navToggle" id="navToggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <header className="howhero">
        <div className="wrap">
          <span className="tag">How FR Services works</span>
          <h1>Three ways to book, walked through step by step.</h1>
          <p className="lede">
            Pick the path that fits you. Every demo below runs on the real numbers
            already on the marketplace today - not screenshots, not placeholders.
          </p>

          <div className="howtabs" role="tablist" aria-label="Choose a flow to walk through">
            <button className="howtab on" id="tab-browse" role="tab" aria-selected="true" aria-controls="flow-browse" data-flow="browse">
              Browse &amp; match
            </button>
            <button className="howtab" id="tab-company" role="tab" aria-selected="false" tabIndex={-1} aria-controls="flow-company" data-flow="company">
              Go straight to a company
            </button>
            <button className="howtab" id="tab-tow" role="tab" aria-selected="false" tabIndex={-1} aria-controls="flow-tow" data-flow="tow">
              Emergency towing
            </button>
          </div>

          <button className="howplay" id="howPlay" type="button" aria-pressed="true">
            <svg id="howPlayIcon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            <span id="howPlayLabel">Pause step autoplay</span>
          </button>
        </div>
      </header>

      {/* ================= BROWSE & MATCH ================= */}
      <section className="flowpanel" id="flow-browse" data-flow="browse" role="tabpanel" aria-labelledby="tab-browse">
        <div className="wrap">
          <p className="flowlede">
            Don't know which company yet? This is the default path - the marketplace
            narrows itself down to your area automatically, no account needed.
          </p>
          <div className="stepwrap">
            <nav className="steprail" aria-label="Steps in this flow">
              <button className="railstep on" data-step="browse-1"><span className="stepnum">1</span><span>We find your area</span></button>
              <button className="railstep" data-step="browse-2"><span className="stepnum">2</span><span>Browse what matches</span></button>
              <button className="railstep" data-step="browse-3"><span className="stepnum">3</span><span>Compare at a glance</span></button>
              <button className="railstep" data-step="browse-4"><span className="stepnum">4</span><span>Open their page &amp; book</span></button>
            </nav>
            <div className="stepbody">

              <article className="stepsec reveal on in" id="step-browse-1" data-step="browse-1">
                <span className="stepnum lg">1</span>
                <h2>We find your area</h2>
                <p>
                  We never prompt for your exact location on the first visit - "Use my
                  exact location" is a deliberate click, not a popup to dismiss. Until
                  then we start from a default city, and you can change it any time by
                  searching - every result on the page re-sorts the moment you do.
                </p>
                <div className="demo demo-city">
                  <label className="demolbl" htmlFor="demoCityInput">Try it - search a city</label>
                  <input id="demoCityInput" type="text" placeholder="Type a city…" autoComplete="off" />
                  <div className="demoresults" id="demoCityResults"></div>
                  <p className="demonote" id="demoCityChosen"></p>
                </div>
              </article>

              <article className="stepsec reveal" id="step-browse-2" data-step="browse-2" hidden>
                <span className="stepnum lg">2</span>
                <h2>Browse what matches</h2>
                <p>
                  Pick a category and results update instantly to only companies that
                  actually serve your area, sorted nearest first by default.
                </p>
                <div className="demo demo-cats">
                  <div className="demochips" id="demoCatChips">
                    <button className="catchip" data-cat="vehicles" type="button">Vehicles</button>
                    <button className="catchip" data-cat="equipment" type="button">Heavy Equipment</button>
                    <button className="catchip" data-cat="towing" type="button">Towing</button>
                  </div>
                  <div className="demoresults" id="demoCatResults"></div>
                </div>
              </article>

              <article className="stepsec reveal" id="step-browse-3" data-step="browse-3" hidden>
                <span className="stepnum lg">3</span>
                <h2>Compare at a glance</h2>
                <p>
                  Every card shows the same things side by side - price, rating,
                  distance, and whether FR Services has checked their registration
                  documents - so comparing two companies never means ten open tabs.
                </p>
                <div className="demo demo-compare" id="demoCompare"></div>
              </article>

              <article className="stepsec reveal" id="step-browse-4" data-step="browse-4" hidden>
                <span className="stepnum lg">4</span>
                <h2>Open their page, then book</h2>
                <p>
                  Tap a result and you're on that company's own storefront - their
                  rates, their availability, their photos. Booking from there is the
                  same request-and-confirm flow the "Go straight to a company" tab
                  walks through in full.
                </p>
                <div className="demo demo-mockstore">
                  <div className="mocksf">
                    <span className="mocksflogo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19h11v-4H3z" /><path d="M6 15V9h5l3 6" /><path d="M14 11l4-5 3 2-3 5" /></svg>
                    </span>
                    <span><b>Their Company Name</b><small>Their rating · Their city</small></span>
                  </div>
                </div>
              </article>

              <div className="flowcta">
                <a className="btn btn-y btn-lg" href="/">Browse the marketplace</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= COMPANY OF CHOICE ================= */}
      <section className="flowpanel" id="flow-company" data-flow="company" role="tabpanel" aria-labelledby="tab-company" hidden>
        <div className="wrap">
          <p className="flowlede">
            Already know who you want to book? Skip straight to them - the Company
            field on the marketplace search bar exists for exactly this.
          </p>
          <div className="stepwrap">
            <nav className="steprail" aria-label="Steps in this flow">
              <button className="railstep on" data-step="company-1"><span className="stepnum">1</span><span>Search by name</span></button>
              <button className="railstep" data-step="company-2"><span className="stepnum">2</span><span>Open their storefront</span></button>
              <button className="railstep" data-step="company-3"><span className="stepnum">3</span><span>Pick a unit &amp; dates</span></button>
              <button className="railstep" data-step="company-4"><span className="stepnum">4</span><span>Send the request</span></button>
            </nav>
            <div className="stepbody">

              <article className="stepsec reveal on in" id="step-company-1" data-step="company-1">
                <span className="stepnum lg">1</span>
                <h2>Search that company by name</h2>
                <p>
                  Type their name into the Company field on the marketplace search bar
                  (or right here, to try it) and we match against every registered
                  company, not just the ones near you right now.
                </p>
                <div className="demo demo-city">
                  <label className="demolbl" htmlFor="demoCoInput">Try it - search a company</label>
                  <input id="demoCoInput" type="text" placeholder="Type a company name…" autoComplete="off" />
                  <div className="demoresults" id="demoCoResults"></div>
                </div>
              </article>

              <article className="stepsec reveal" id="step-company-2" data-step="company-2" hidden>
                <span className="stepnum lg">2</span>
                <h2>Open their storefront</h2>
                <p>
                  Their page is theirs - logo, cover photo, brand colors and a rate
                  card they control - plus the parts FR Services controls: their
                  verified badge, rating and reviews, so a page can be polished but
                  can't fake being checked.
                </p>
                <div className="demo demo-mockstore" id="demoStorefront">
                  <div className="mocksf">
                    <span className="mocksflogo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19h11v-4H3z" /><path d="M6 15V9h5l3 6" /><path d="M14 11l4-5 3 2-3 5" /></svg>
                    </span>
                    <span><b id="demoSfName">Your Company Name</b><small id="demoSfSub">Search a company above to preview it here</small></span>
                  </div>
                </div>
              </article>

              <article className="stepsec reveal" id="step-company-3" data-step="company-3" hidden>
                <span className="stepnum lg">3</span>
                <h2>Pick a unit and dates - the price updates as you go</h2>
                <p>
                  This is the exact math the real booking page runs: day rate ×
                  number of days, plus delivery or pickup, plus any add-ons you
                  choose, plus 12% VAT. Try it on an example unit.
                </p>
                <div className="demo demo-calc">
                  <div className="calcgrid">
                    <label>Start date<input id="demoStart" type="date" /></label>
                    <label>End date<input id="demoEnd" type="date" /></label>
                  </div>
                  <div className="calcopts" id="demoDeliv">
                    <button className="calcopt on" data-price="0" type="button">Pickup - free</button>
                    <button className="calcopt" data-price="2500" type="button">Delivered - ₱2,500</button>
                  </div>
                  <div className="calcopts calcaddons">
                    <label className="calkchk"><input type="checkbox" id="demoAddon1" data-add="1200" /> On-site safety officer (+₱1,200/day)</label>
                    <label className="calkchk"><input type="checkbox" id="demoAddon2" data-add="2000" /> Extended damage waiver (+₱2,000/day)</label>
                  </div>
                  <ul className="calclines" id="demoCostLines"></ul>
                  <div className="calctotal"><span>Estimated total</span><span id="demoCostTotal">₱0</span></div>
                  <p className="demonote">Example unit at ₱3,500/day - the real page uses that company's actual rate.</p>
                </div>
              </article>

              <article className="stepsec reveal" id="step-company-4" data-step="company-4" hidden>
                <span className="stepnum lg">4</span>
                <h2>Send the request</h2>
                <p>
                  No payment yet - sending a request just asks the company to
                  confirm. You get a reference number immediately and an update the
                  moment they respond.
                </p>
                <div className="demo demo-send">
                  <button className="btn btn-i" id="demoSendBtn" type="button">Send test request</button>
                  <div className="democonfirm" id="demoConfirm" hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l6 6L20 6" /></svg>
                    <span>Request sent. Reference <b id="demoRef"></b></span>
                  </div>
                </div>
              </article>

              <div className="flowcta">
                <a className="btn btn-y btn-lg" href="/">Search for a company</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= EMERGENCY TOWING ================= */}
      <section className="flowpanel" id="flow-tow" data-flow="tow" role="tabpanel" aria-labelledby="tab-tow" hidden>
        <div className="wrap">
          <p className="flowlede">
            Nasiraan ka ba? This path skips browsing entirely - tell us what
            happened and where, and dispatching starts immediately.
          </p>
          <div className="stepwrap">
            <nav className="steprail" aria-label="Steps in this flow">
              <button className="railstep on" data-step="tow-1"><span className="stepnum">1</span><span>Tell us what happened</span></button>
              <button className="railstep" data-step="tow-2"><span className="stepnum">2</span><span>We broadcast to nearby trucks</span></button>
              <button className="railstep" data-step="tow-3"><span className="stepnum">3</span><span>First to accept, dispatched</span></button>
            </nav>
            <div className="stepbody">

              <article className="stepsec reveal on in" id="step-tow-1" data-step="tow-1">
                <span className="stepnum lg">1</span>
                <h2>Tell us what happened</h2>
                <p>
                  Vehicle type and the problem, in two taps - enough for a
                  dispatcher to send the right truck without typing a paragraph
                  while stranded on the roadside.
                </p>
                <div className="demo demo-tow1">
                  <div className="demochips" id="demoVtype">
                    <button className="catchip" data-v="Motorcycle" type="button">Motorcycle</button>
                    <button className="catchip" data-v="Car / SUV" type="button">Car / SUV</button>
                    <button className="catchip" data-v="Van / Pickup" type="button">Van / Pickup</button>
                    <button className="catchip" data-v="Truck / Bus" type="button">Truck / Bus</button>
                  </div>
                  <div className="demochips" id="demoProb">
                    <button className="catchip" data-p="Engine won't start" type="button">Engine won't start</button>
                    <button className="catchip" data-p="Flat tire" type="button">Flat tire</button>
                    <button className="catchip" data-p="Accident" type="button">Accident</button>
                    <button className="catchip" data-p="Overheating" type="button">Overheating</button>
                    <button className="catchip" data-p="Out of fuel" type="button">Out of fuel</button>
                    <button className="catchip" data-p="Stuck / ditch" type="button">Stuck / ditch</button>
                  </div>
                  <p className="demonote" id="demoTowSummary">Pick a vehicle and a problem above.</p>
                </div>
              </article>

              <article className="stepsec reveal" id="step-tow-2" data-step="tow-2" hidden>
                <span className="stepnum lg">2</span>
                <h2>We broadcast to every nearby truck at once</h2>
                <p>
                  Not one company at a time - every towing provider in range is
                  pinged simultaneously, nearest first. Whoever accepts first is
                  dispatched. This simulation uses the real towing companies
                  registered near the marketplace's default location.
                </p>
                <div className="demo demo-dispatch">
                  <button className="btn btn-i" id="demoDispatchBtn" type="button">Simulate dispatch</button>
                  <div className="pinglist" id="demoPingList"></div>
                </div>
              </article>

              <article className="stepsec reveal" id="step-tow-3" data-step="tow-3" hidden>
                <span className="stepnum lg">3</span>
                <h2>First to accept, on the way</h2>
                <p>
                  No charge until a driver accepts and you confirm the quoted
                  fare - arrival time is estimated from real distance, not a flat
                  promise.
                </p>
                <div className="demo demo-towresult" id="demoTowResult" hidden></div>
              </article>

              <div className="flowcta">
                <a className="btn btn-r btn-lg" href="/tow">Request a real tow</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="howfaq">
        <div className="wrap">
          <h2>Common questions</h2>
          <div className="faqlist">
            <div className="faqitem">
              <button className="faqq" aria-expanded="false" aria-controls="faqa-1" type="button">
                What if no company is near me yet?
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className="faqa" id="faqa-1" hidden>
                <p>The marketplace only shows companies that actually serve your area - if none have registered near you yet, we say so plainly instead of stretching the radius to fill the page. New companies show up the moment they're approved.</p>
              </div>
            </div>
            <div className="faqitem">
              <button className="faqq" aria-expanded="false" aria-controls="faqa-2" type="button">
                Is browsing or comparing free?
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className="faqa" id="faqa-2" hidden>
                <p>Always. Nothing charges you until a company accepts a request and you confirm the quoted fare.</p>
              </div>
            </div>
            <div className="faqitem">
              <button className="faqq" aria-expanded="false" aria-controls="faqa-3" type="button">
                Can I cancel an emergency tow before a driver accepts?
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className="faqa" id="faqa-3" hidden>
                <p>Yes - nothing is dispatched, and nothing is owed, until a driver actually accepts your request.</p>
              </div>
            </div>
            <div className="faqitem">
              <button className="faqq" aria-expanded="false" aria-controls="faqa-4" type="button">
                How do I know a company is actually legit?
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className="faqa" id="faqa-4" hidden>
                <p>FR Services checks three documents - DTI registration, mayor's permit and BIR 2303 - directly with the issuing offices before a company gets the "Checked by FR Services" badge. Anything else on their page is their own claim, shown as exactly that.</p>
              </div>
            </div>
            <div className="faqitem">
              <button className="faqq" aria-expanded="false" aria-controls="faqa-5" type="button">
                Do I need an account to browse?
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className="faqa" id="faqa-5" hidden>
                <p>No - browsing, comparing and opening a storefront never require signing in. You'll only need an account at the point you actually send a booking or tow request.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="site">
        <div className="wrap">
          <div className="fbot" style={{borderTop: "0", paddingTop: "0"}}>
            <span>© 2026 FR Services Fleet Services PH · Static prototype with demo data only</span>
            <span><a href="/" style={{textDecoration: "underline"}}>Back to marketplace</a></span>
          </div>
        </div>
      </footer>
    </>
  );
}
