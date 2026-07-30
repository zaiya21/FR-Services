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
      <LegacyScripts srcs={["/assets/theme.js","/assets/data.js","/assets/ops.js","/assets/pdf.js","/pages/admin.js"]} />
    </>
  );
}
