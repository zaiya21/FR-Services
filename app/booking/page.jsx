import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';
import SupabaseBrowser from '../_SupabaseBrowser';

export const metadata = {
  title: "Request a booking on FR Services"
};

export default function Page(){
  return (
    <>
      <SupabaseBrowser />
      <Markup />
      <LegacyScripts
        srcs={["/assets/page-transition.js","/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/live-registry.js","/assets/ph-locations.js","/assets/data.js","/assets/company-auth.js","/pages/booking.js"]}
        waitEvents={{"/assets/live-registry.js":"live-registry-ready"}}
      />
    </>
  );
}
