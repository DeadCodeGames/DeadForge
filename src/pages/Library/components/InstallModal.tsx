import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import type { NormalizedGame } from '@/types';
import { getLocalizedGameName } from '../Library';

interface InstallModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line no-unused-vars
    onInstall: (installPath: string) => void;
    game: NormalizedGame;
}

interface SoftwareData {
    id: string;
    size: string;
}

const InstallModal: React.FC<InstallModalProps> = ({
    isOpen,
    onClose,
    onInstall,
    game,
}) => {
    const { t } = useTranslation();
    const [installPath, setInstallPath] = useState<string>('');
    const [installSize, setInstallSize] = useState<string>(t("loading"));
    const [downloadSize, setDownloadSize] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [canInstall, setCanInstall] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inactiveClasses = "pointer-events-none scale-90 opacity-0";
    const activeClasses = "pointer-events-auto scale-100 opacity-100";
    const inactiveBackdropClasses = "pointer-events-none opacity-0";
    const activeBackdropClasses = "pointer-events-auto opacity-100";

    const formatFileSize = useCallback((bytes: number | null): string => {
        if (bytes === null) return t('loading')
        else if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }, [t]);

    // Fetch software data and update sizes
    useEffect(() => {
        const fetchSoftwareData = async () => {
            try {
                // Reset states
                setCanInstall(false);
                setDownloadSize(null);
                
                // Fetch install size from software.json
                const response = await fetch('https://deadcode.is-a.dev/DeadForge/store/data/software.json');
                const data: SoftwareData[] = await response.json();
                const gameData = data.find(item => item.id === game.id);
                
                if (gameData) {
                    setInstallSize(gameData.size);
                } else {
                    setError(`Software with id ${game.id} was not found in the software catalog.`)
                }

                // Fetch download size from Electron
                const downloadSizeResult = await window.Electron.getDownloadSize(game.id as string);
                if (downloadSizeResult.success) {
                    setDownloadSize(downloadSizeResult.size);
                    setCanInstall(true);
                } else {
                    console.error('Failed to get download size:', downloadSizeResult.error);
                    setError(String(downloadSizeResult.error))
                    setDownloadSize(null);
                    setCanInstall(false);
                }
            } catch (error) {
                console.error('Failed to fetch software data:', error);
                setError((error as Error).message)
                setInstallSize(t('error'));
                setDownloadSize(null);
                setCanInstall(false);
            }
        };

        if (isOpen) {
            fetchSoftwareData();
        }
    }, [isOpen, game.id, t]);

    // Get default install path when component mounts
    useEffect(() => {
        const getDefaultPath = async () => {
            try {
                const defaultPath = await window.Electron.getDefaultInstallPath(game.id as string);
                setInstallPath(defaultPath);
            } catch (error) {
                console.error('Failed to get default install path:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            getDefaultPath();
        }
    }, [isOpen, game.id]);

    const handleBrowse = async () => {
        try {
            const { canceled, filePaths } = await window.Electron.showOpenDialog({
                defaultPath: installPath,
                properties: ["openDirectory"]
            });
            if (!canceled) {
                setInstallPath(filePaths[0]);
            }
        } catch (error) {
            console.error('Failed to open directory dialog:', error);
        }
    };

    const handleInstall = async () => {
        try {
            setError(null);
            onInstall(installPath);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    };

    console.log(error)

    return (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out ${isOpen ? activeBackdropClasses : inactiveBackdropClasses}`}>
            <div className={`bg-notQuiteBlack text-fullMoon rounded-lg w-full max-w-2xl shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? activeClasses : inactiveClasses}`}>
                <div className="p-6 pb-0 border-b border-night">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-uniSansCAPS">
                            <Trans i18nKey='library.install.title' components={{ b: <b /> }} values={{ title: getLocalizedGameName(game) }}>
                                Install {getLocalizedGameName(game)}
                            </Trans>
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-night/50 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Game Info */}
                    <div className={downloadSize !== null ? "mb-6" : ""}>
                        <div className="space-y-2 text-sm text-notQuiteWhite/80">
                            {downloadSize !== null && (
                                <div className="flex justify-between">
                                    <span>{t('library.install.downloadSize')}</span>
                                    <span>{formatFileSize(downloadSize)}</span>
                                </div>
                            )}
                            {downloadSize !== null && (
                                <div className="flex justify-between">
                                    <span>{t('library.install.installSize')}</span>
                                    <span>{installSize}</span>
                                </div>
                            )
                            }
                        </div>
                    </div>
                    
                    {error && (
                        <div className="mt-0 mb-4 text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Install Path Selection */}
                    <div className="space-y-2">
                        <label className="block font-montserrat text-sm">{t('library.install.installLocation')}</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={installPath}
                                onChange={(e) => setInstallPath(e.target.value)}
                                disabled={isLoading}
                                className="flex-1 bg-night border border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue disabled:cursor-not-allowed"
                                placeholder={t('library.install.selectLocation')}
                            />
                            <button
                                className="bg-progress hover:bg-progress/80 text-fullMoon px-4 py-2 rounded font-montserrat disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                                onClick={handleBrowse}
                            >
                                {t('browse')}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite font-bold"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleInstall}
                            disabled={!installPath || isLoading || !canInstall}
                            className="px-4 py-2 rounded-lg bg-progress hover:bg-progress/80 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('library.install.install')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallModal; 