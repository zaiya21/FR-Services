/* Above './page.css', for the same reason as the home page: leaflet.css
   sets .leaflet-div-icon and .leaflet-container at the specificity our own
   rules use to undo them, so loading it second puts a grey box round every
   marker. See the note in app/page.jsx. */
import 'leaflet/dist/leaflet.css';
import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Emergency tow on FR Services",
  description: "24/7 emergency towing dispatch. We broadcast to the nearest available trucks and the first to accept is sent to you."
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/pages/tow.js"]} />
    </>
  );
}
