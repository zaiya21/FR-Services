import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "List your company — FR Services"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/theme.js","/assets/data.js","/assets/ops.js","/assets/platform.js","/pages/register.js"]} />
    </>
  );
}
