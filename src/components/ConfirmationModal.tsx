import React from 'react';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false,
}) => {
    const inactiveClasses = "pointer-events-none scale-90 opacity-0";
    const activeClasses = "pointer-events-auto scale-100 opacity-100";
    const inactiveBackdropClasses = "pointer-events-none opacity-0";
    const activeBackdropClasses = "pointer-events-auto opacity-100";

    return (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out ${isOpen ? activeBackdropClasses : inactiveBackdropClasses}`}>
            <div className={`bg-notQuiteBlack text-fullMoon rounded-lg w-full max-w-md shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? activeClasses : inactiveClasses}`}>
                <div className="p-6 pb-0 border-b border-night">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-uniSansCAPS">{title}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-night/50 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-notQuiteWhite/80 font-montserrat mb-6">{message}</p>
                    <div className="flex justify-end gap-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite font-bold"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-lg text-white font-bold ${isDangerous ? 'bg-danger hover:bg-danger/80' : 'bg-progress hover:bg-progress/80'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal; 