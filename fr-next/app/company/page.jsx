import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Company storefront — FR Services"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/theme.js","/assets/data.js","/assets/ops.js","/assets/platform.js","/assets/auth.js","/pages/company.js"]} />
    </>
  );
}
