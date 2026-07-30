// Leaflet's stylesheet, and it must stay above './page.css'.
//
// The static build loaded this from unpkg in <head>, before its own CSS.
// The conversion carried over <style> blocks and <script> tags and dropped
// the <link>, so the map had no stylesheet at all: Leaflet positions tiles
// and markers with inline transforms but takes `position: absolute` from
// this file, so every tile collapsed into normal flow and the map rendered
// as a small square of stacked tiles instead of filling its panel.
//
// From npm rather than the CDN purely so the order is decidable — import
// order is preserved, whereas a <link> hoisted by React lands wherever it
// lands relative to Next's own CSS chunks, and here that is not cosmetic:
// leaflet.css sets `.leaflet-div-icon{background:#fff;border:1px solid #666}`
// and `.leaflet-container{font-family:Helvetica;font-size:12px}` at exactly
// the specificity page.css uses to undo both. Load it second and every
// price pin gets a white box with a grey border round it.
//
// Pinned to 1.9.4 to match the leaflet.js still coming from unpkg below.
import 'leaflet/dist/leaflet.css';
import './page.css';
import Markup from './markup';
import LegacyScripts from './_LegacyScripts';

export const metadata = {
  title: "FR Services — Rent vehicles, heavy equipment & towing anywhere in the Philippines",
  description: "One marketplace for vehicle rental, heavy equipment hire and 24/7 towing across all 17 regions of the Philippines. We match you with verified companies that actually serve your area."
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js","/assets/geo.js","/assets/registry.js","/assets/theme.js","/assets/ph-locations.js","/assets/data.js","/assets/auth.js","/pages/index.js"]} />
    </>
  );
}
