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
        srcs={["/assets/geo.js","/assets/registry.js","/assets/live-registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/ops.js","/assets/pdf.js","/assets/company-auth.js","/pages/admin.js"]}
        waitEvents={{"/assets/live-registry.js":"live-registry-ready"}}
      />
    </>
  );
}
