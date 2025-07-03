import { NavLink, useNavigate } from 'react-router-dom';
import React, { useContext } from 'react';
import { AppContext } from '@/App'; // adjust the import to your actual context path

interface ControlledNavLinkProps {
    to: string;
    // eslint-disable-next-line no-unused-vars
    className: string | ((props: { isActive: boolean }) => string);
    shouldIntercept?: boolean;
    // eslint-disable-next-line no-unused-vars
    onClick?: (e: React.MouseEvent) => void;
    children?: React.ReactNode;
}

export const ControlledNavLink = ({
    to,
    className,
    shouldIntercept = false,
    onClick = () => {},
    children
}: ControlledNavLinkProps) => {
    const { useSettingsWindow } = useContext(AppContext).context.preferences;
    const navigate = useNavigate()

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
        <NavLink draggable={false} to={to} onClick={(e) => {if (e.shiftKey || e.ctrlKey) {navigate(to)}}} className={className}>
            {children}
        </NavLink>
    );
};
