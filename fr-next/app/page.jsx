import './page.css';
import Markup from './markup';
import LegacyScripts from './_LegacyScripts';

export const metadata = {
  title: "FR Services — Rent vehicles, heavy equipment & towing anywhere in the Philippines"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","/assets/ph-locations.js","/assets/data.js","/assets/auth.js","/pages/index.js"]} />
    </>
  );
}
