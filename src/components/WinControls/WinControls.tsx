import { useEffect, useState, useContext } from 'react';
import { AppContext } from '../../App.tsx';

export default function WinControls({ type }: { type: null | 'Linux' | 'Windows' | 'Mac' }) {
    const { context, setContext } = useContext(AppContext);
    const [isMaximized, setIsMaximized] = useState<boolean>(false);
    const [htmlClass, setHtmlClass] = useState<string>(document.documentElement.className);

    useEffect(() => {
        const checkIfMaximized = async () => {
            const result: boolean = await window.Electron.isMaximized();
            setIsMaximized(result);
        };

        checkIfMaximized();

        window.Electron.onMaximize(() => setIsMaximized(true));
        window.Electron.onUnmaximize(() => setIsMaximized(false));

        return () => {
            window.Electron.onMaximize(() => { });
            window.Electron.onUnmaximize(() => { });
        };
    }, []);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setHtmlClass(document.documentElement.className);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        document.documentElement.classList.add(context.preferences.theme === 'dark' ? 'dark' : 'light');
        document.documentElement.classList.remove(context.preferences.theme === 'dark' ? 'light' : 'dark');
    }, [context.preferences.theme]);

    const handleMinimize = () => window.Electron.minimize();
    const handleMaximize = () => {
        window.Electron.maximize();
        setIsMaximized(!isMaximized);
    };
    const handleClose = () => window.Electron.close();
    const handleThemeChange = () => {
        const newTheme = htmlClass.includes('dark') ? 'light' : 'dark';
        document.documentElement.classList.remove(newTheme === 'dark' ? 'light' : 'dark');
        document.documentElement.classList.add(newTheme);
        setContext({
            ...context,
            preferences: { ...context.preferences, theme: newTheme },
        });
    };

    const title = (
        <>
            <div id="logo" className="text-lg px-1 text-[#0F0F0F] dark:text-[#F0F0F0] font-montserrat font-bold">××</div>
            <div id="windowtitle" className="text-sm font-bold select-none px-1 font-uniSansCAPS text-[#0F0F0F] dark:text-[#F0F0F0]">
                DeadForge
            </div>
        </>
    );

    const windowsControls = (
        <div id="controls" className="flex flex-row items-center cursor-pointer h-full text-center justify-center app-region-no-drag *:h-full *:aspect-[1] *:transition-[background] *:duration-[0.125s] *:ease-[ease-in-out] *:flex *:items-center *:justify-center text-black dark:text-white">
            <div id="themechange" className="material-symbols text-xl hover:bg-[rgba(0,0,0,0.25)] dark:hover:bg-[rgba(255,255,255,0.25)]" onClick={handleThemeChange}>
                {htmlClass.includes('dark') ? 'light_mode' : 'dark_mode'}
            </div>
            <div id="minimize" className="material-symbols text-base hover:bg-[rgba(0,0,0,0.25)] dark:hover:bg-[rgba(255,255,255,0.25)]" onClick={handleMinimize}>
                horizontal_rule
            </div>
            <div id="maximize" className="material-symbols text-base hover:bg-[rgba(0,0,0,0.25)] dark:hover:bg-[rgba(255,255,255,0.25)]" onClick={handleMaximize} style={{ rotate: isMaximized ? '90deg' : '' }}>
                {isMaximized ? 'stack' : 'square'}
            </div>
            <div id="close" className="material-symbols text-xl hover:bg-[red]" onClick={handleClose}>
                close
            </div>
        </div>
    );

    const macControls = (
        <div id="controls" className="text-sm flex flex-row items-center h-full text-center justify-center app-region-no-drag gap-x-2.5 px-1 py-[11px] *:text-sm *:flex *:flex-row *:items-center *:h-full *:text-center *:justify-center *:app-region-no-drag *:cursor-pointer *:text-transparent *:transition-[color] *:duration-[0.25s] *:ease-[ease] *:p-0 *:rounded-[100%] hover:text-[rgba(0,0,0,0.75)]">
            <div id="close" className="material-symbols bg-red-500 hover:text-black" onClick={handleClose}>close</div>
            <div id="minimize" className="material-symbols bg-[#FFD200] hover:text-black" onClick={handleMinimize}>horizontal_rule</div>
            <div id="maximize" className="material-symbols bg-green-500 hover:text-black" onClick={handleMaximize}>{isMaximized ? 'collapse_content' : 'expand_content'}</div>
            <div id="themechange" className="material-symbols bg-[#0F0F0F] hover:text-white dark:bg-[#F0F0F0] dark:hover:text-black" onClick={handleThemeChange}>{htmlClass.includes('dark') ? 'light_mode' : 'dark_mode'}</div>
        </div>
    );

    const linuxControls = (
        <div id="controls" className="flex flex-row items-center app-region-no-drag *:text-base gap-x-2.5 dark:*:bg-[#323232] dark:hover:*:bg-[#404040] *:bg-[#d0d0d0] hover:*:bg-[#c0c0c0] *:text-black dark:*:text-white *:p-0.5 *:rounded-full pr-2.5">
            <div id="themechange" className="material-symbols cursor-pointer" onClick={handleThemeChange}>{htmlClass.includes('dark') ? 'light_mode' : 'dark_mode'}</div>
            <div id="minimize" className="material-symbols cursor-pointer" onClick={handleMinimize}>horizontal_rule</div>
            <div id="maximize" className="material-symbols cursor-pointer" onClick={handleMaximize}>{isMaximized ? 'collapse_content' : 'expand_content'}</div>
            <div id="close" className="material-symbols cursor-pointer" onClick={handleClose}>close</div>
        </div>
    );

    return (
        <div
            id="window"
            data-type={type?.toLowerCase() || 'windows'}
            className="absolute h-9 w-[-webkit-fill-available] flex justify-between items-center flex-row flex-nowrap left-0 top-0 app-region-drag bg-[#e9e9e9] dark:bg-[#161616] pl-2.5 pr-0 py-0"
        >
            {type === 'Mac' ? (
                <>
                    <div id="titleleft">{macControls}</div>
                    <div id="titlemiddle" className='flex flex-row items-center'>{title}</div>
                    <div id="titleright" className='w-[94px] pr-2.5'></div>
                </>
            ) : type === 'Linux' ? (
                <>
                    <div id="titleleft"></div>
                    <div id="titlemiddle" className='flex flex-row items-center'>{title}</div>
                    <div id="titleright">{linuxControls}</div>
                </>
            ) : (
                <>
                    <div id="titleleft" className='flex flex-row items-center'>{title}</div>
                    <div id="titleright" className='h-full'>{windowsControls}</div>
                </>
            )}
        </div>
    );
}
