import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';
import SupabaseBrowser from '../_SupabaseBrowser';

export const metadata = {
  title: "How it works on FR Services",
  description: "Three real ways to book on FR Services, step by step and interactive: browse and match automatically, go straight to a company you already know, or dispatch an emergency tow."
};

export default function Page(){
  return (
    <>
      <SupabaseBrowser />
      <Markup />
      <LegacyScripts
        srcs={["/assets/page-transition.js","/assets/geo.js","/assets/registry.js","/assets/live-registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/company-auth.js","/pages/how-it-works.js"]}
        waitEvents={{"/assets/live-registry.js":"live-registry-ready"}}
      />
    </>
  );
}
