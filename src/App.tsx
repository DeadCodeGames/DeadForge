import { useState, useEffect, createContext } from "react";
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import WinControls from './components/WinControls/WinControls.tsx';
import Navigation from './components/Nav/Nav.tsx';
// import Library from './pages/Library/Library.tsx';
import Store from './pages/Store/Store.tsx';
import Settings from './pages/Settings/Settings.tsx';
import Tray from './pages/Tray/Tray.tsx';
import { useTranslation } from "react-i18next";

const defaultPreferences = {
  theme: "dark",
  windowFrame: "auto",
  showThemeButton: false,
  language: "en_001",
  defaultPage: "library",
  useSettingsWindow: false,
  useTray: false,
  autoStart: false,
  autoUpdate: false,
  betaUpdates: false
}

export const AppContext = createContext<any>(
  {
    preferences: defaultPreferences,
    storePreload: null
  }
);

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<any>({ preferences: defaultPreferences, storePreload: null });
  const [shouldSetContext, setShouldSetContext] = useState<boolean>(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const prefs = await window.Electron.getPreferences();
        setContext({ preferences: prefs });
        console.log(prefs)
        setShouldSetContext(true);
      } catch (error) {
        console.error('Failed to fetch client preferences:', error);
      }
    };

    fetchPreferences();
  }, []);

  useEffect(() => {
    console.log(JSON.stringify(context))
    async function fetchStorePreloadLink() {
      const link = await window.Electron.getStorePreload();
      setContext((prev: any) => { return { ...prev, storePreload: link } })
    }
    if (!context.storePreload && !window.Electron.isTray) {
      fetchStorePreloadLink();
    }
    if (shouldSetContext) window.Electron.updatePreferences(context.preferences);
  }, [context, shouldSetContext]);

  return (
    <AppContext.Provider value={{ context, setContext }}>
      <Router>
        {children}
      </Router>
    </AppContext.Provider>
  ) as React.JSX.Element;
}

function AppContents() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    window.Electron.onTrayNavigate((event, location) => {
      console.log(location);
      navigate(location);
    })
  }, [navigate]);
  return (<>
    <WinControls />
    <div className="flex">
      <div id="app" style={{ '--sidebarWidth': '192px' } as any} className="flex flex-row h-[calc(100vh-36px)] absolute w-full dark:bg-night bg-fullMoon transition-colors duration-300 top-9 overflow-hidden">
        <Navigation navItemsTop={[
          { name: t('sidebar.library'), path: '/library', icon: 'apps' },
          { name: t('sidebar.store'), path: '/store', icon: 'shopping_bag' }
        ]} navItemsBottom={[
          { name: t('sidebar.settings'), path: '/settings', icon: 'settings' }
        ]} />
        <div id="contents" className="w-[calc(100vw-var(--sidebarWidth))] h-[calc(100vh-36px)] relative dark:bg-notQuiteBlack bg-notQuiteWhite transition-colors duration-300 overflow-hidden">
          <Routes>
            <Route path="/" /*element={<Library />}*/ />
            <Route path="/library" /*element={<Library />}*/ />
            <Route path="/store" element={<Store />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  </>)
}

export default function App() {

  return (
    <AppContextProvider>
      <Routes>
        <Route path="/tray" element={window.Electron.isTray ? <Tray /> : <Navigate to="/library" />} />
        <Route path="*" element={<AppContents />} />
      </Routes>
    </AppContextProvider>
  ) as React.JSX.Element;
}