import { useState, useEffect, createContext } from "react";
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import WinControls from './components/WinControls/WinControls.tsx';
import InitialLoader from "./components/Loader/InitialLoader.tsx";

export const AppContext = createContext<any>({ preferences: { theme: 'dark' } });

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<any>({ preferences: { theme: 'dark' } });
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
    if (shouldSetContext) window.Electron.updatePreferences(context.preferences)
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
      <InitialLoader />
      <Router>
        <WinControls type={platform} />
        <div id="app">
          <Routes>
            <Route path="/" />
          </Routes>
        </div>
      </Router>
    </AppContextProvider>

  ) as React.JSX.Element;
}