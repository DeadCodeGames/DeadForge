import React from 'react';
import {createPortal} from 'react-dom';
import { X } from 'lucide-react';

interface GenericModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode; // Optional footer actions (e.g., buttons)
    className?: string;
}

const GenericModal: React.FC<GenericModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    actions,
    className = '',
}) => {
    const inactiveClasses = "pointer-events-none scale-90 opacity-0";
    const activeClasses = "pointer-events-auto scale-100 opacity-100";
    const inactiveBackdropClasses = "pointer-events-none opacity-0";
    const activeBackdropClasses = "pointer-events-auto opacity-100";

    return createPortal(
        <div
            className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out ${isOpen ? activeBackdropClasses : inactiveBackdropClasses}`}
            onClick={onClose}
        >
            <div
                className={`flex flex-col max-h-[calc(100vh-64px)] bg-notQuiteWhite dark:bg-notQuiteBlack text-night dark:text-fullMoon rounded-lg w-full max-w-2xl shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? activeClasses : inactiveClasses} ${className}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-fullMoon dark:border-night">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-uniSansCAPS">{title}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-fullMoon/80 hover:dark:bg-night/80 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="p-6 pt-0 overflow-auto">
                    {children}
                </div>
                {actions && (
                    <div className="p-6">
                        <div className="flex justify-end gap-4 mt-6">
                            {actions}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default GenericModal; 