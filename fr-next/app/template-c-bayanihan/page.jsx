import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "ARKILA — Fleet Services PH · Template C"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/pages/template-c-bayanihan.js"]} />
    </>
  );
}
