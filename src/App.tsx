import { useContext } from 'react'
import Home from './pages/Home/Home';
import Reader from './pages/Reader/Reader';
import { SettingsProvider } from './contexts/SettingsContext';
import { EbookContext, EbookProvider } from './contexts/EbookContext';
import { KeyboardProvider } from './contexts/KeyboardContext';
import { ChapterProvider } from './contexts/ChapterContext';

import './resources/fonts/fonts';

function App() {
  const { ebook } = useContext(EbookContext);

  return ebook ? <ChapterProvider><Reader/></ChapterProvider> : <Home/>;
}

function ContextWrappedApp() {
  return (
    <SettingsProvider>
      <KeyboardProvider>
        <EbookProvider>
            <App/>
        </EbookProvider>
      </KeyboardProvider>
    </SettingsProvider>
  );
}

export default ContextWrappedApp;
