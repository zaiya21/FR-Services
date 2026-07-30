import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "Kalsada - Fleet Services PH · Template A"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/pages/template-a-kalsada.js"]} />
    </>
  );
}
