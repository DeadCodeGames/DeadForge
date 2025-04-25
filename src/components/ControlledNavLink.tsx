import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '@/App'; // adjust the import to your actual context path

interface ControlledNavLinkProps {
    to: string;
    className: string | ((props: { isActive: boolean }) => string);
    shouldIntercept?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    children?: React.ReactNode;
}

export const ControlledNavLink = ({
    to,
    className,
    shouldIntercept = false,
    onClick = (e) => {},
    children
}: ControlledNavLinkProps) => {
    const { useSettingsWindow } = useContext(AppContext).context.preferences;

    const intercept = shouldIntercept || (to === '/settings' && useSettingsWindow);

    const handleClick = (e: React.MouseEvent) => {
        if (intercept) {
            e.preventDefault();
            onClick(e);
        }
    };

    if (intercept) {
        return (
            <button
                onClick={handleClick}
                className={typeof className === 'function' ? className({ isActive: false }) : className}
            >
                {children}
            </button>
        );
    }

    return (
        <NavLink to={to} className={className}>
            {children}
        </NavLink>
    );
};
