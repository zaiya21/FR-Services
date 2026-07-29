import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Request a booking — FR Services"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/assets/theme.js","/assets/data.js","/pages/booking.js"]} />
    </>
  );
}
