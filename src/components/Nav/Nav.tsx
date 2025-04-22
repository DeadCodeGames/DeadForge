import { useContext, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppContext } from '@/App';

type NavItem = {
    name: string | React.JSX.Element;
    path: string;
    icon: string;
};

export default function Navigation({ navItemsTop, navItemsBottom }: { navItemsTop: NavItem[], navItemsBottom: NavItem[] }) {
    const { t } = useTranslation();
    const { context, setContext } = useContext(AppContext);
    const collapsed = context.preferences.sidebarCollapsed;

    const [forceCollapse, setForceCollapse] = useState(window.innerWidth < 900);

    useEffect(() => {
        const handleResize = () => {
            setForceCollapse(window.innerWidth < 900);
            (document.querySelector('div#app') as HTMLElement).style.setProperty(
                '--sidebarWidth',
                (window.innerWidth < 900 || collapsed) ? '48px' : '192px'
            )
        };

        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [collapsed]);

    const toggleExpand = () => {
        const newCollapsed = !collapsed;
        if (window.innerWidth < 900) return;
        (document.querySelector('div#app') as HTMLElement).style.setProperty(
            '--sidebarWidth',
            newCollapsed ? '48px' : '192px'
        );
        setContext({
            ...context,
            preferences: {
                ...context.preferences,
                sidebarCollapsed: newCollapsed
            }
        });
    };

    const baseItemClass = "flex items-center transition-colors duration-200 ease-in-out rounded-md py-2 px-1 no-underline m-0 justify-start";
    const activeClass = "text-blue-500";
    const inactiveClass = "text-notQuiteBlack dark:text-notQuiteWhite hover:text-black dark:hover:text-white";
    const expandedPointerClass = "-scale-x-100";

    return (
        <div className="h-[calc(100vh-36px)] bg-notQuiteWhite dark:bg-notQuiteBlack flex flex-col transition-[max-width,min-width,background-color] duration-300 min-w-[var(--sidebarWidth)] max-w-[var(--sidebarWidth)] z-10 after:content-[''] after:fixed after:pointer-events-none after:bg-transparent after:h-[25px] after:w-[25px] after:rounded-tl-[25px] after:left-[var(--sidebarWidth)] after:transition-[left,background_colors] after:duration-300 after:top-9 after:z-[-1] after:shadow-[-25px_-25px_0_25px_theme('colors.notQuiteWhite')] after:dark:shadow-[-25px_-25px_0_25px_theme('colors.notQuiteBlack')]">
            <nav className="flex flex-col justify-between gap-1 p-2 pt-0 overflow-hidden h-full">
                <div className='flex flex-col gap-1'>
                    {navItemsTop.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `${baseItemClass} ${isActive ? activeClass : inactiveClass}`
                            }
                        >
                            <span className="material-symbols size-6">{item.icon}</span>
                            <span className={!(collapsed || forceCollapse) ? "ml-3 font-montserrat w-[calc(100%-54px)] overflow-hidden opacity-100 transition-[width,margin-left,opacity] duration-300" : "ml-[0px] font-montserrat w-[0px] overflow-hidden opacity-0 transition-[width,margin-left,opacity] duration-300"}>{item.name}</span>
                        </NavLink>
                    ))}
                </div>
                <div className='flex flex-col gap-1'>
                    {navItemsBottom.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `${baseItemClass} ${isActive ? activeClass : inactiveClass}`
                            }
                        >
                            <span className="material-symbols size-6">{item.icon}</span>
                            <span className={!(collapsed || forceCollapse) ? "ml-3 font-montserrat w-[calc(100%-24px)] overflow-hidden opacity-100 transition-[width,margin-left,opacity] duration-300" : "ml-[0px] font-montserrat w-[0px] overflow-hidden opacity-0 transition-[width,margin-left,opacity] duration-300"}>{item.name}</span>
                        </NavLink>
                    ))}
                    <button
                        onClick={toggleExpand}
                        disabled={forceCollapse}
                        className={`text-notQuiteBlack dark:text-notQuiteWhite cursor-pointer transition-[transform,opacity] ${baseItemClass} ${inactiveClass} text-left opacity-100 disabled:opacity-50`}
                    >
                        <span className={`material-symbols size-6 duration-200 ease-in-out ${!(collapsed || forceCollapse) ? expandedPointerClass : ""}`}>chevron_right</span>
                        <span className={!(collapsed || forceCollapse) ? "ml-3 font-montserrat w-[calc(100%-24px)] overflow-hidden opacity-100 transition-[width,margin-left,opacity,color] duration-300" : "ml-[0px] font-montserrat w-[0px] overflow-hidden opacity-0 transition-[width,margin-left,opacity] duration-300"}>{ t('sidebar.collapse') }</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}