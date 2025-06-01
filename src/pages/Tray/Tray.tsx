import React, { useEffect, useContext } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AppContext } from "@/App";

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const TrayItem = ({ name, icon, onClick }: { name: string | React.JSX.Element, icon?: string, onClick: () => void }) => {
    return (
        <div className="app-region-no-drag w-[calc(100%-16px)] py-2 px-2 rounded-lg text-base font-notoSans hover:bg-fullMoon hover:dark:bg-night" onClick={onClick}>{name}</div>
    )
}

const TrayDivider = () => {
    return (
        <hr className="border-t border-0 border-solid dark:border-fullMoon/50 border-night/50 my-2 mx-2" />
    )
}

const Tray = () => {
    const { t } = useTranslation();
    useEffect(() => {
        window.Electron.onTrayGetContentsHeight(async () => {
            return (document.querySelector("div#root") as HTMLElement).offsetHeight;
        });
    })

    const { context } = useContext(AppContext);
    useEffect(() => {
        document.documentElement.classList.add(context.preferences.theme === 'dark' ? 'dark' : 'light');
        document.documentElement.classList.remove(context.preferences.theme === 'dark' ? 'light' : 'dark');
    }, [context.preferences.theme]);
    return (
        <div className="app-region-drag w-[calc(100vw-16px)] h-full dark:bg-notQuiteBlack bg-notQuiteWhite dark:text-notQuiteWhite text-notQuiteBlack font-notoSans flex flex-col p-2">
            <TrayItem name={t('sidebar.home')} icon="home" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/' }) }} />
            <TrayItem name={t('sidebar.library')} icon="apps" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/library' }) }} />
            <TrayItem name={<Trans i18nKey="tray.arcade" components={[<span className="font-uniSansCAPS font-bold" key="DEADFORGE">DEADFORGE</span>,<span className="font-uniSansCAPS" key="ARCADE">ARCADE</span>]} />} onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/arcade' })}} />
            <TrayItem name={t('sidebar.store')} icon="store" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/store' }) }} />
            <TrayItem name={t('sidebar.settings')} icon="settings" onClick={() => { window.Electron.sendTrayChoice({ type: 'navigate', destination: '/settings' }) }} />
            <TrayDivider />
            <TrayItem name={<Trans i18nKey="tray.exit"><span className="font-uniSansCAPS font-bold">DEADFORGE</span></Trans>} icon="logout" onClick={() => window.Electron.sendTrayChoice({ type: 'exit' })} />
            <hr />
        </div>
    )
}

export default Tray;