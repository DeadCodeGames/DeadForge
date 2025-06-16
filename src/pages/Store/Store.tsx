import React, { useState, useRef, useEffect, useContext } from "react";
import { AppContext } from '../../App.tsx'
import { ArrowLeft, ArrowRight, Home, RefreshCw, Copy, Check, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";

const Store = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const [,setSearchParams] = useSearchParams();
    const [currentUrl, setCurrentUrl] = useState<string>(process.env.REACT_APP_STORE_URL!)
    const [homeUrl, setHomeUrl] = useState<string>(process.env.REACT_APP_STORE_URL!)
    const [canGoBack, setCanGoBack] = useState(false)
    const [canGoForward, setCanGoForward] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const webviewRef = useRef<any>(null)
    const { storePreload } = useContext(AppContext).context;
    const targetPath = useRef<string | null>(null)
  
    useEffect(() => {
        const handleWebviewEvents = () => {
            if (!webviewRef.current) return

            const webview = webviewRef.current

            webview.addEventListener("did-start-loading", () => {
                setIsLoading(true)
            })

            webview.addEventListener("did-stop-loading", () => {
                setIsLoading(false)
                setCurrentUrl(webview.getURL())
                setCanGoBack(webview.canGoBack())
                setCanGoForward(webview.canGoForward())
            })

            webview.addEventListener("will-navigate", (e: any) => {
                setCurrentUrl(e.url)
            })
        }

        // Small delay to ensure webview is mounted
        const timer = setTimeout(() => {
            handleWebviewEvents()
        }, 500)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const pathParam = new URLSearchParams(location.search).get('path');
        if (pathParam) {
            targetPath.current = pathParam;
            setSearchParams(searchParams => { searchParams.delete("path"); return searchParams; }, {replace: true})
        }
    })

    useEffect(() => {
        const tryHandlePathRequest = async () => {
            try {
                if (targetPath.current !== null && await webviewRef.current.executeJavaScript("document.readyState") === "complete") {
                    setCurrentUrl(homeUrl + targetPath.current);
                    webviewRef.current.loadURL(homeUrl + targetPath.current);
                    targetPath.current = null;
                }
                console.log(homeUrl, currentUrl);
            } catch (error) {
                console.error(error)
            }
        }

        tryHandlePathRequest();
    })

    useEffect(() => {
        if (!webviewRef.current) return;

        const handleLinkOpen = (e: any) => {
            e.preventDefault();
            console.log();
            window.Electron.navigateExternal(e.url);
        };

        webviewRef.current?.addEventListener("window-open", handleLinkOpen);

        return () => {
            webviewRef.current?.removeEventListener("window-open", handleLinkOpen);
        }
    })

    console.log(targetPath.current)
  
    if (!storePreload) return null;

    const goBack = () => {
        if (webviewRef.current && canGoBack) {
            webviewRef.current.goBack()
        }
    }

    const goForward = () => {
        if (webviewRef.current && canGoForward) {
            webviewRef.current.goForward()
        }
    }

    const goHome = () => {
        if (webviewRef.current) {
            webviewRef.current.loadURL(homeUrl)
        }
    }

    const refresh = () => {
        if (webviewRef.current) {
            webviewRef.current.reload()
        }
    }

    const copyUrl = () => {
        navigator.clipboard.writeText(currentUrl).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
        })
    }

    const flipDevProd = () => {
        console.log(process.env.REACT_APP_STORE_URL + (currentUrl.split(process.env.REACT_APP_STORE_PROD_URL!).filter(Boolean)[0] || ""), process.env.REACT_APP_STORE_PROD_URL + (currentUrl.split(process.env.REACT_APP_STORE_URL!).filter(Boolean)[0] || ""))
        if (!window.App.isPackaged && homeUrl === process.env.REACT_APP_STORE_PROD_URL) {
            setCurrentUrl(process.env.REACT_APP_STORE_URL + (currentUrl.split(process.env.REACT_APP_STORE_PROD_URL).filter(Boolean)[0] || ""));
            webviewRef.current.loadURL(process.env.REACT_APP_STORE_URL + (currentUrl.split(process.env.REACT_APP_STORE_PROD_URL).filter(Boolean)[0] || ""))
            setHomeUrl(process.env.REACT_APP_STORE_URL!);
        } else {
            setCurrentUrl(process.env.REACT_APP_STORE_PROD_URL + (currentUrl.split(process.env.REACT_APP_STORE_URL!).filter(Boolean)[0] || ""));
            webviewRef.current.loadURL(process.env.REACT_APP_STORE_PROD_URL + (currentUrl.split(process.env.REACT_APP_STORE_URL!).filter(Boolean)[0] || ""));
            setHomeUrl(process.env.REACT_APP_STORE_PROD_URL!)
        }
    }

    return (
        <div className="flex flex-col h-full w-full bg-fullMoon text-notQuiteBlack dark:bg-night dark:text-notQuiteWhite transition-colors duration-300 ease-in-out">
            {/* URL Bar */}
            <div 
                className="flex items-center bg-navy px-2 py-2 border-solid border-0 border-b border-night/20 dark:border-fullMoon/20"
            >
                <div className="flex space-x-1 mr-2">
                    <button
                        onClick={goBack}
                        disabled={!canGoBack}
                        className={`p-1 rounded rounded-tl-2xl hover:bg-neutral-300 dark:hover:bg-neutral-800 ${!canGoBack ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Go Back"
                    >
                        <ArrowLeft size={20} className="text-night-moon" />
                    </button>
                    <button
                        onClick={goForward}
                        disabled={!canGoForward}
                        className={`p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800 ${!canGoForward ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Go Forward"
                    >
                        <ArrowRight size={20} className="text-night-moon" />
                    </button>
                    <button
                        onClick={goHome}
                        className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800"
                        title="Go Home"
                    >
                        <Home size={20} className="text-night-moon" />
                    </button>
                    <button
                        onClick={refresh}
                        className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={`text-night-moon ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {!window.App.isPackaged && (
                        <button
                            onClick={flipDevProd}
                            className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-800"
                            title="Switch between Dev and Prod of DeadForge Store"
                        >
                            <ArrowRightLeft size={20} className="text-night-moon" />
                        </button>
                    )}
                </div>
                <div 
                    onClick={copyUrl}
                    className="flex-1 bg-fullMoon dark:bg-night transition-colors duration-300 ease-in-out text-night-moon pl-3 pr-2 py-0.5 rounded flex items-center cursor-pointer hover:bg-neutral-300 dark:hover:bg-neutral-800"
                    title="Click to copy URL"
                >
                    <span className="truncate flex-1 text-notQuiteBlack dark:text-notQuiteWhite transition-colors duration-300 ease-in-out">{currentUrl}</span>
                    {copied ? (
                        <span className="flex items-center text-gray-700 dark:text-neutral-400 text-sm">{t('store.urlCopied')} <Check size={16} className="text-green-500 ml-2" /></span>
                    ) : (
                        <Copy size={16} className="text-gray-700 dark:text-gray-400 ml-2" />
                    )}
                </div>
            </div>

            {/* Webview */}
            <div className="flex-1 relative">
                <webview
                    ref={webviewRef}
                    src={process.env.REACT_APP_STORE_URL!}
                    preload={storePreload}
                    style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        height: "100%",
                        width: "100%"
                    }}
                />
            </div>
        </div>
    )
}

export default Store