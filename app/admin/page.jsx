import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';
import SupabaseBrowser from '../_SupabaseBrowser';

export const metadata = {
  title: "Company admin on FR Services",
  robots: { index: false, follow: false }
};

export default function Page(){
  return (
    <>
      <SupabaseBrowser />
      <Markup />
      <LegacyScripts
        srcs={["/assets/page-transition.js","/assets/nav-toggle.js","/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/live-registry.js","/assets/ph-locations.js","/assets/data.js","/assets/ops.js","/assets/pdf.js","/assets/company-auth.js","/assets/admin-gate.js","/pages/admin.js"]}
        waitEvents={{"/assets/live-registry.js":"live-registry-ready","/assets/admin-gate.js":"admin-gate-ready"}}
      />
    </>
  );
}
