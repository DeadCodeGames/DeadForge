import { useState, useEffect, createContext } from "react";
import { IpcRendererEvent } from "electron";
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import WinControls from './components/WinControls/WinControls.tsx';
import Navigation from './components/Nav/Nav.tsx';
// import Library from './pages/Library/Library.tsx';
import Store from './pages/Store/Store.tsx';
import Settings from './pages/Settings/Settings.tsx';
import Tray from './pages/Tray/Tray.tsx';
import { useTranslation } from "react-i18next";
import Arcade from "./pages/Arcade/Arcade.tsx";
import InitialLoader from "./components/Loader/InitialLoader.tsx";
import i18n from "./locales/i18n.ts";
import FirstLaunchModal from "./SetupModal/SetupModal.tsx";
import { NotificationProvider } from "./pages/Notifications/NotificationsProvider.tsx";
import NotificationDisplay from "./pages/Notifications/NotificationsDisplay.tsx";

const defaultPreferences = {
  initialSetupComplete: false,
  theme: "dark",
  sidebarCollapsed: false,
  windowFrame: "auto",
  showCurrentPageTitleInFrame: true,
  showThemeButton: false,
  language: "en_001",
  showIncompleteLanguages: false,
  defaultPage: "library",
  useSettingsWindow: false,
  useTray: false,
  autoStart: false,
  autoUpdate: false,
  betaUpdates: false,
  langUpdates: false
}

export const AppContext = createContext<any>(
  {
    preferences: defaultPreferences,
    storePreload: null,
    setupModalActive: false,
    v1PrefsAvailable: false,
    v1Prefs: {}
  }
);

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<any>({ preferences: defaultPreferences, storePreload: null, setupModalActive: false, v1PrefsAvailable: false, v1Prefs: {} });
  const [shouldSetContext, setShouldSetContext] = useState<boolean>(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const {preferences: prefs, v1PrefsAvailable, v1Prefs} = await window.Electron.getPreferences();
        console.log(prefs, v1PrefsAvailable);
        setContext((prev: any) => ({ ...prev, preferences: prefs, setupModalActive: !prefs.initialSetupComplete, v1PrefsAvailable, v1Prefs }));
        i18n.changeLanguage(prefs.language);
        setShouldSetContext(true);
      } catch (error) {
        console.error('Failed to fetch client preferences:', error);
      }
    };
    

    window.Electron.onPreferencesUpdate((e: any, newPrefs: any) => {
      if (window.Electron.isSettingsWindow) return;
      setContext((prev: any) => { return { ...prev, preferences: newPrefs } });
      if (!newPrefs.useSettingsWindow) { console.log("l"); window.location.hash = "/settings" };
      i18n.changeLanguage(newPrefs.language);
    })

    fetchPreferences();

    return () => window.Electron.onPreferencesUpdate(() => {});
  }, []);

  useEffect(() => {
    async function fetchStorePreloadLink() {
      if (!shouldSetContext || window.Electron.isTray) return;
      const link = window.Electron.storePreload;
      setContext((prev: any) => { return { ...prev, storePreload: link } })
    }
    if (!context.storePreload && !window.Electron.isTray) {
      fetchStorePreloadLink();
    }
    if (shouldSetContext && !window.Electron.isTray) window.Electron.setPreferences(context.preferences, window.location.pathname === "#/settings", window.Electron.isSettingsWindow);
    // using JSON.stringify here, because... useEffect deps arrays do not fuck with objects, yk?
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context), shouldSetContext]);

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
    const handleTrayNavigate = (event: IpcRendererEvent, location: string) => {
      console.log(event, location);
      if (location === "/settings") {
        window.Electron.openSettingsWindow();
        console.log("opening");
        return;
      } else {
        navigate(location);
      }
    };
  
    window.Electron.onTrayNavigate(handleTrayNavigate);
  
    return () => {
      window.Electron.onTrayNavigate(handleTrayNavigate);
    };
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("keydown", (e) => { if (e.key === 'r' && e.ctrlKey) { e.stopImmediatePropagation(); e.preventDefault(); window.addEventListener("beforeunload", e => e.preventDefault()); setTimeout(() => { window.Electron.reload() }, 0)} })
    
    return () => {
      window.removeEventListener("keydown", (e) => { if (e.key === 'r' && e.ctrlKey) {e.stopImmediatePropagation(); e.preventDefault(); window.addEventListener("beforeunload", e => e.preventDefault()); setTimeout(() => { window.Electron.reload() }, 0)} })
    }
  })

  return (<>
    <WinControls />
    <FirstLaunchModal />
    <div className="flex">
      <div id="app" style={{ '--sidebarWidth': '192px' } as any} className="flex flex-row h-[calc(100vh-36px)] absolute w-full dark:bg-night bg-fullMoon transition-colors duration-300 top-9 overflow-hidden">
        <Navigation navItemsTop={[
          { name: t('sidebar.library'), path: '/library', icon: 'apps' },
          { name: t('sidebar.arcade'), path: '/arcade', icon: 'joystick' },
          { name: t('sidebar.store'), path: '/store', icon: 'shopping_bag' }
        ]} navItemsBottom={[
          { name: t('sidebar.settings'), path: '/settings', icon: 'settings', onClick: (e) => { window.Electron.openSettingsWindow() } }
        ]} />
        <div id="contents" className="left-[var(--sidebarWidth)] right-0 h-[calc(100vh-36px)] absolute dark:bg-notQuiteBlack bg-notQuiteWhite transition-[color,background-color,border-color,text-decoration-color,fill,stroke,left] duration-300 overflow-hidden">
          <Routes>
            <Route path="/" /*element={<Library />}*/ />
            <Route path="/library" /*element={<Library />}*/ />
            <Route path="/arcade" element={<Arcade />} />
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
      {!(window.Electron.isTray || window.Electron.isSettingsWindow || window.Electron.isNotificationsWindow) && <InitialLoader />}
      {window.Electron.isTray && <Tray />}
      {window.Electron.isSettingsWindow && <><WinControls /><div className="h-[calc(100vh-36px)] absolute w-full top-9 overflow-hidden"><Settings /></div></>}
      {window.Electron.isNotificationsWindow && <NotificationProvider><NotificationDisplay /></NotificationProvider>}
      {!(window.Electron.isTray || window.Electron.isSettingsWindow || window.Electron.isNotificationsWindow) &&
        <Routes>
          <Route path="*" element={<AppContents />} />
        </Routes>
      }
    </AppContextProvider>
  ) as React.JSX.Element;
}