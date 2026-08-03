import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';
import SupabaseBrowser from '../_SupabaseBrowser';

export const metadata = {
  title: "Company storefront on FR Services",
  description: "Verified fleet rental company on FR Services. Browse available units, rates and availability."
};

export default function Page(){
  return (
    <>
      <SupabaseBrowser />
      <Markup />
      <LegacyScripts
        srcs={["/assets/page-transition.js","/assets/geo.js","/assets/registry.js","/assets/live-registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/ops.js","/assets/platform.js","/assets/auth.js","/assets/company-auth.js","/pages/company.js"]}
        waitEvents={{"/assets/live-registry.js":"live-registry-ready"}}
      />
    </>
  );
}
