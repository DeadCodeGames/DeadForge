// Navigation.tsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

type NavItem = {
    name: string;
    path: string;
    icon: string; // Material icon name
};

export default function Navigation({ navItems }: { navItems: NavItem[] }) {
    const [isExpanded, setIsExpanded] = useState(true);

    const toggleExpand = () => {
        setIsExpanded(prev => { (document.querySelector('div#app') as HTMLElement)!.style.setProperty('--sidebarWidth', prev ? '48px' : '192px'); return !isExpanded});
    };

    // Common styling for active and inactive nav items
    const baseItemClass = "flex items-center transition-colors duration-200 ease-in-out rounded-md py-2 px-1 no-underline m-0 justify-start";
    const activeClass = "text-blue-500";
    const inactiveClass = "text-notQuiteBlack dark:text-notQuiteWhite hover:text-black dark:hover:text-white";

    return (
        <div className="h-[calc(100vh-36px)] bg-notQuiteWhite dark:bg-notQuiteBlack flex flex-col transition-[max-width,min-width] duration-300 min-w-[var(--sidebarWidth)] max-w-[var(--sidebarWidth)] z-10 after:content-[''] after:fixed after:bg-transparent after:h-[25px] after:w-[25px] after:rounded-tl-[25px] after:left-[var(--sidebarWidth)] after:transition-[left] after:duration-300 after:top-9 after:z-[-1] after:shadow-[-25px_-25px_0_25px_theme('colors.notQuiteWhite')] after:dark:shadow-[-25px_-25px_0_25px_theme('colors.notQuiteBlack')]">
            <div className="flex items-center justify-center px-2 py-2.5">
                <button
                    onClick={toggleExpand}
                    className="material-symbols text-notQuiteBlack dark:text-notQuiteWhite text-xl cursor-pointer"
                >
                    {isExpanded ? 'chevron_left' : 'chevron_right'}
                </button>
            </div>

            <nav className="flex flex-col gap-1 p-2 overflow-hidden">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `${baseItemClass} ${isActive ? activeClass : inactiveClass}`
                        }
                    >
                        <span className="material-symbols size-6">{item.icon}</span>
                        <span className={isExpanded ? "ml-3 font-montserrat w-[calc(100%-54px)] overflow-hidden opacity-100 transition-[width,margin-left,opacity] duration-300" : "ml-[0px] font-montserrat w-[0px] overflow-hidden opacity-0 transition-[width,margin-left,opacity] duration-300"}>{item.name}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}