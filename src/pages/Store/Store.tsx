"use client"

import { useState, useRef, useEffect, useContext } from "react";
import { AppContext } from '../../App.tsx'
import { ArrowLeft, ArrowRight, Home, RefreshCw, Copy, Check } from 'lucide-react';

const Store = () => {
  const [currentUrl, setCurrentUrl] = useState<string>(process.env.REACT_APP_STORE_URL!)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const webviewRef = useRef<any>(null)
  const storePreload = useContext(AppContext).context.storePreload;
  
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
      webviewRef.current.loadURL(process.env.REACT_APP_STORE_URL!)
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

  return (
    <div className="flex flex-col h-full w-full bg-fullMoon text-notQuiteBlack dark:bg-night dark:text-notQuiteWhite">
      {/* URL Bar */}
      <div 
        className="flex items-center bg-navy pl-2 pr-1 py-1 border-b border-gray-700"
      >
        <div className="flex space-x-1 mr-2">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={`p-1 rounded hover:bg-neutral-700 ${!canGoBack ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Go Back"
          >
            <ArrowLeft size={18} className="text-night-moon" />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className={`p-1 rounded hover:bg-neutral-700 ${!canGoForward ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Go Forward"
          >
            <ArrowRight size={18} className="text-night-moon" />
          </button>
          <button
            onClick={goHome}
            className="p-1 rounded hover:bg-neutral-700"
            title="Go Home"
          >
            <Home size={18} className="text-night-moon" />
          </button>
          <button
            onClick={refresh}
            className="p-1 rounded hover:bg-neutral-700"
            title="Refresh"
          >
            <RefreshCw size={18} className={`text-night-moon ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div 
          onClick={copyUrl}
          className="flex-1 bg-fullMoon dark:bg-night text-night-moon px-3 py-1 rounded flex items-center cursor-pointer hover:bg-neutral-300 dark:hover:bg-neutral-800"
          title="Click to copy URL"
        >
          <span className="truncate flex-1">{currentUrl}</span>
          {copied ? (
            <span className="flex items-center text-gray-700 dark:text-neutral-400">URL has been successfully copied <Check size={16} className="text-green-500 ml-2" /></span>
          ) : (
            <Copy size={16} className="text-gray-700 dark:text-gray-400 ml-2" />
          )}
        </div>
      </div>

      {/* Webview */}
      <div className="flex-1 relative">
        <webview
          ref={webviewRef}
          src="http://localhost:3001"
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
