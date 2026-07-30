import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Company admin — FR Services",
  robots: { index: false, follow: false }
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/ops.js","/assets/pdf.js","/pages/admin.js"]} />
    </>
  );
}
