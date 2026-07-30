import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Company storefront - FR Services",
  description: "Verified fleet rental company on FR Services. Browse available units, rates and availability."
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/ops.js","/assets/platform.js","/assets/auth.js","/pages/company.js"]} />
    </>
  );
}
