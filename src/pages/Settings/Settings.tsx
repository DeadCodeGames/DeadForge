import { useContext } from "react";
import { AppContext } from "@/App.tsx";
import { resources } from "@/locales/i18n.ts";

// settings to implement:
// theme switcher - automatic (system), light, dark
// language switcher
// default launcher page
// tray toggle
// auto-start on boot
// replay initial setup sequence
// auto-update + if enable beta updates
// export / import data

export default function Settings() {
    const { context, setContext } = useContext(AppContext);
    return (
        <div className="w-full h-full dark:bg-night bg-fullMoon text-night flex flex-col justify-center items-center dark:text-fullMoon transition-colors duration-300 font-uniSansCAPS font-bold">
            <button onClick={() => setContext({ ...context, preferences: { ...context.preferences, theme: context.preferences.theme === 'dark' ? 'light' : 'dark' } })}>temporary theme switch teehe :3</button>
            have a data dump too idgaf
            <pre>{ JSON.stringify(context.preferences) }</pre>
            <pre>{ JSON.stringify(resources, null, 2) }</pre>
        </div>
    )
}