import { useContext } from 'react'
import Home from './pages/Home/Home';
import Reader from './pages/Reader/Reader';
import { SettingsProvider } from './contexts/SettingsContext';
import { EbookContext, EbookProvider } from './contexts/EbookContext';
import { KeyboardProvider } from './contexts/KeyboardContext';
import { ChapterProvider } from './contexts/ChapterContext';

import './resources/fonts/fonts';
import { LibraryProvider } from './contexts/LibraryContext';
import { useBackHandler } from './utils/BackButton';

function App() {
  const { ebook, closeEbook } = useContext(EbookContext);

  // Android Back closes the book (the menus register their own handlers on top).
  useBackHandler(!!ebook, closeEbook);

  return ebook ? <ChapterProvider><Reader/></ChapterProvider> : <Home/>;
}

function ContextWrappedApp() {
  return (
    <SettingsProvider>
      <KeyboardProvider>
        <LibraryProvider>
          <EbookProvider>
              <App/>
          </EbookProvider>
        </LibraryProvider>
      </KeyboardProvider>
    </SettingsProvider>
  );
}

export default ContextWrappedApp;
