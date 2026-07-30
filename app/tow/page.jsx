import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Emergency tow — FR Services",
  description: "24/7 emergency towing dispatch. We broadcast to the nearest available trucks and the first to accept is sent to you."
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/data.js","/pages/tow.js"]} />
    </>
  );
}
