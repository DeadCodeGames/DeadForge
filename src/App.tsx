import { useState, useEffect, createContext } from "react";
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import WinControls from './components/WinControls/WinControls.tsx';
import Navigation from './components/Nav/Nav.tsx'; // Import new Navigation component
// import Library from './pages/Library/Library.tsx'; // You'll need to create these page components
import Store from './pages/Store/Store.tsx';
// import Settings from './pages/Settings/Settings.tsx';

export const AppContext = createContext<any>({ preferences: { theme: 'dark' }, storePreload: null });

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<any>({ preferences: { theme: 'dark' }, storePreload: null });
  const [shouldSetContext, ] = useState<boolean>(false);

/*  useEffect(() => {
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
  }, []);*/

  useEffect(() => {
    async function fetchStorePreloadLink() {
      const link = await window.Electron.getStorePreload();
      setContext((prev: any) => { return {...prev, storePreload: link }})
    }
    if (!context.storePreload) {
      fetchStorePreloadLink();
    }
    if (shouldSetContext) window.Electron.updatePreferences(context.preferences);
  }, [context, shouldSetContext]);

  return (
    <AppContext.Provider value={{ context, setContext }}>
      {children}
    </AppContext.Provider>
  ) as React.JSX.Element;
}

export default function App() {
  const [platform, ] = useState<"Linux" | "Windows" | "Mac" | null>(null);
  /*useEffect(() => {
    async function getPlatform() {
      const platform = await window.Electron.getPlatform();
      setPlatform(platform);
    }
    getPlatform();
  }, []);*/

  return (
    <AppContextProvider>
      <Router>
        <WinControls type={platform} />
        <div className="flex">
          <div id="app" style={{ '--sidebarWidth': '192px' } as any} className="flex flex-row h-[calc(100vh-36px)] absolute w-full dark:bg-night bg-fullMoon top-9">
            <Navigation navItemsTop={[
              { name: 'Library', path: '/library', icon: 'apps' },
              { name: 'Store', path: '/store', icon: 'shopping_bag' }
            ]} navItemsBottom={[
              { name: 'Settings', path: '/settings', icon: 'settings' }
            ]} />
            <div id="contents" className="w-full h-full relative dark:bg-notQuiteBlack bg-notQuiteWhite">
              <Routes>
                <Route path="/" /*element={<Library />}*/ />
                <Route path="/library" /*element={<Library />}*/ />
                <Route path="/store" element={<Store />} />
                <Route path="/settings" /*element={<Settings />}*/ />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </AppContextProvider>
  ) as React.JSX.Element;
}