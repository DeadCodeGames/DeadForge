import React, { useState, useEffect, createContext, useContext } from "react";
import { IpcRendererEvent } from "electron";
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import WinControls from './components/WinControls/WinControls.tsx';
import Navigation from './components/Nav/Nav.tsx';
import LibraryProvider, { LibraryLayout, LibraryHome, LibraryGame, LibraryCollections, LibraryCollection, LibraryFavourites, LibraryRecent, LibraryAll, LibraryContext } from './pages/Library/Library.tsx';
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
import ErrorBoundary from "./ErrorBoundary/ErrorBoundary.tsx";
import Home from "./pages/Home/Home.tsx";

const defaultPreferences = {
    initialSetupComplete: false,
    theme: "dark",
    sidebarCollapsed: false,
    windowFrame: "auto",
    showCurrentPageTitleInFrame: true,
    showThemeButton: false,
    language: "en_001",
    showIncompleteLanguages: false,
    defaultPage: "",
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
        storeWebviewReady: false,
        setupModalActive: false,
        v1PrefsAvailable: false,
        v1Prefs: {}
    }
);

function AppContextsProvider({ children }: { children: React.ReactNode }) {
    const [context, setContext] = useState<any>({ preferences: defaultPreferences, storePreload: null, storeWebviewReady: false, setupModalActive: false, v1PrefsAvailable: false, v1Prefs: {} });
    const [shouldSetContext, setShouldSetContext] = useState<boolean>(false);

    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const { preferences: prefs, v1PrefsAvailable, v1Prefs } = await window.Electron.getPreferences();
                console.log(prefs);
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
            if (!newPrefs.useSettingsWindow) { window.location.hash = "/settings" };
            i18n.changeLanguage(newPrefs.language);
        })

        fetchPreferences();

        return () => window.Electron.onPreferencesUpdate(() => { });
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
    }, [JSON.stringify(context), shouldSetContext]);

    return (
        <Router>
            <AppContext.Provider value={{ context, setContext }}>
                <LibraryProvider>
                    {children}
                </LibraryProvider>
            </AppContext.Provider>
        </Router>
    ) as React.JSX.Element;
}

const AppContents = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { useSettingsWindow } = useContext(AppContext).context.preferences;
    const { lastVisitedLibraryLocation } = useContext(LibraryContext);

    useEffect(() => {
        const handleTrayNavigate = (event: IpcRendererEvent, location: string) => {
            if (location === "/settings" && useSettingsWindow) {
                window.Electron.openSettingsWindow();
                return;
            } else {
                navigate(location);
            }
        };

        window.Electron.onTrayNavigate(handleTrayNavigate);

        return () => {
            window.Electron.onTrayNavigate(() => {});
        };
    }, [navigate]);

    useEffect(() => {
        const handleProtocolNavigation = (event: any, location: string) => {
            console.log(event, location)
            const regexMatch = location.match(/\/([^/]*)(?:\/(.*))?/); if (!regexMatch) return;
            const [,target, path] = regexMatch;
            console.log(target, path)
            switch (target) {
                case "settings":
                    navigate("/settings");
                    break;
                
                case "arcade":
                    navigate("/arcade");
                    break;
                
                case "store":
                    if (!path) { navigate("/store"); }
                    else {navigate(`/store?path=${encodeURIComponent(path)}`)}
                    break;
                
                case "library":
                    if (!path || (
                        path !== "all" &&
                        path !== "favourites" &&
                        path !== "recent" &&
                        path !== "collections" &&
                        !path.startsWith("game/") &&
                        !path.startsWith("collection/")
                    )
                    ) { navigate("/library") } else {
                        navigate(`/library/${path}`)
                    };
                    break;
                
                case "home":
                default:
                    navigate("/")
                    break;
            }
        }
        window.Electron.onProtocolNavigation(handleProtocolNavigation);

        return () => {
            window.Electron.onProtocolNavigation(() => {});
        }
    })

    useEffect(() => {
        window.addEventListener("keydown", (e) => { if (e.key === 'r' && e.ctrlKey) { e.stopImmediatePropagation(); e.preventDefault(); window.addEventListener("beforeunload", e => e.preventDefault()); setTimeout(() => { window.Electron.reload() }, 0) } })

        return () => {
            window.removeEventListener("keydown", (e) => { if (e.key === 'r' && e.ctrlKey) { e.stopImmediatePropagation(); e.preventDefault(); window.addEventListener("beforeunload", e => e.preventDefault()); setTimeout(() => { window.Electron.reload() }, 0) } })
        }
    })

    return (<>
        <WinControls />
        <FirstLaunchModal />
        <ErrorBoundary>
            <div className="flex">
                <div id="app" style={{ '--sidebarWidth': '192px' } as any} className="flex flex-row h-[calc(100vh-36px)] absolute w-full dark:bg-night bg-fullMoon transition-colors duration-300 top-9 overflow-hidden">
                    <Navigation navItemsTop={[
                        { name: t('sidebar.home'), path: '/', icon: 'home' },
                        { name: t('sidebar.library'), path: lastVisitedLibraryLocation, icon: 'apps' },
                        { name: t('sidebar.arcade'), path: '/arcade', icon: 'joystick' },
                        { name: t('sidebar.store'), path: '/store', icon: 'shopping_bag' }
                    ]} navItemsBottom={[
                        { name: t('sidebar.settings'), path: '/settings', icon: 'settings', onClick: () => { window.Electron.openSettingsWindow() } }
                    ]} />
                    <div id="contents" className="left-[var(--sidebarWidth)] right-0 h-[calc(100vh-36px)] absolute dark:bg-notQuiteBlack bg-notQuiteWhite transition-[color,background-color,border-color,text-decoration-color,fill,stroke,left] duration-300 overflow-hidden">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/library" element={<LibraryLayout />}>
                                <Route index element={<LibraryHome />} />
                                <Route path="all" element={<LibraryAll />} />
                                <Route path="favourites" element={<LibraryFavourites />} />
                                <Route path="recent" element={<LibraryRecent />} />
                                <Route path="game/:id" element={<LibraryGame />} />
                                <Route path="collections" element={<LibraryCollections />} />
                                <Route path="collection/:id" element={<LibraryCollection />} />
                            </Route>
                            <Route path="/arcade" element={<Arcade />} />
                            <Route path="/store" element={<Store />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    </>)
}

export default function App() {
    return (
        <AppContextsProvider>
            {!(window.Electron.isTray || window.Electron.isSettingsWindow || window.Electron.isNotificationsWindow) && <InitialLoader />}
            {window.Electron.isTray && <Tray />}
            {window.Electron.isSettingsWindow && <><WinControls /><div className="h-[calc(100vh-36px)] absolute w-full top-9 overflow-hidden"><Settings /></div></>}
            {window.Electron.isNotificationsWindow && <NotificationProvider><NotificationDisplay /></NotificationProvider>}
            {!(window.Electron.isTray || window.Electron.isSettingsWindow || window.Electron.isNotificationsWindow) &&
                <Routes>
                    <Route path="*" element={<AppContents />} />
                </Routes>
            }
        </AppContextsProvider>
    ) as React.JSX.Element;
}