import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';
import SupabaseBrowser from '../_SupabaseBrowser';

export const metadata = {
  title: "Platform admin on FR Services",
  robots: { index: false, follow: false }
};

export default function Page(){
  return (
    <>
      <SupabaseBrowser />
      <Markup />
      <LegacyScripts srcs={["/assets/page-transition.js","/assets/nav-toggle.js","/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/ops.js","/assets/platform.js","/assets/platform-auth.js","/pages/platform.js"]} />
    </>
  );
}
