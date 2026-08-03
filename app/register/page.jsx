/* Above './page.css', for the same reason as the home page: leaflet.css
   sets .leaflet-div-icon and .leaflet-container at the specificity our own
   rules use to undo them, so loading it second puts a grey box round every
   marker. See the note in app/page.jsx. */
import 'leaflet/dist/leaflet.css';
import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "List your company on FR Services",
  description: "Register your vehicle rental, heavy equipment or towing business on FR Services. Free listing, nationwide reach, and a company page you control."
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/page-transition.js","https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/ops.js","/assets/platform.js","/assets/company-auth.js","/pages/register.js"]} />
    </>
  );
}
