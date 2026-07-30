import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Request a booking - FR Services"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/pages/booking.js"]} />
    </>
  );
}
