import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Emergency tow — FR Services"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/data.js","/pages/tow.js"]} />
    </>
  );
}
