import './page.css';
import Markup from './markup';
import LegacyScripts from '../_LegacyScripts';

export const metadata = {
  title: "DISPATCH — Fleet Services PH · Template B"
};

export default function Page(){
  return (
    <>
      <Markup />
      <LegacyScripts srcs={["/pages/template-b-dispatch.js"]} />
    </>
  );
}
