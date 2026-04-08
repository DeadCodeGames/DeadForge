import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import type { NormalizedGame } from '@/types';
import { getLocalizedGameName } from '../Library';
import FlipSwitch from '@/components/CustomElements/FlipSwitch';
import { cn } from '@/lib/utils';

interface InstallModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line no-unused-vars
    onInstall: (installPath: string) => void;
    // eslint-disable-next-line no-unused-vars
    onUninstall: (gameId: string, removeUserData: boolean) => void;
    game: NormalizedGame;
    uninstall: boolean
}

interface SoftwareData {
    id: string;
    size: string;
}

const InstallModal: React.FC<InstallModalProps> = ({
    isOpen,
    onClose,
    onInstall,
    onUninstall,
    game,
    uninstall
}) => {
    const { t } = useTranslation();
    const [installPath, setInstallPath] = useState<string>('');
    const [downloadSize, setDownloadSize] = useState<number | null>(null);
    const [installSize, setInstallSize] = useState<string>(t("loading"));
    const [currentlyInstalledSize, setCurrentlyInstalledSize] = useState<number | null>(null);
    const [localDataSize, setLocalDataSize] = useState<number | null>(null);
    const [totalSize, setTotalSize] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [canInstall, setCanInstall] = useState(false);
    const [installError, setInstallError] = useState<string | null>(null);
    const [uninstallError, setUninstallError] = useState<string | null>(null);
    const [removeUserData, setRemoveUserData] = useState<boolean>(true);

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
        setInstallError(null); setUninstallError(null);
        setRemoveUserData(true); // Reset switch when modal opens
        const fetchSoftwareData = async () => {
            try {
                // Reset states
                setCanInstall(false);
                setDownloadSize(null);
                
                // Fetch install size from software.json
                const response = await fetch('https://deadcode.is-a.dev/DeadForge/store/data/software.json');
                const data: SoftwareData[] = await response.json();
                const gameData = data.find(item => item.id === game?.id);
                
                if (gameData) {
                    setInstallSize(gameData.size);
                } else {
                    setInstallError(`Software with id ${game?.id} was not found in the software catalog.`)
                }

                // Fetch download size from Electron
                const downloadSizeResult = await window.Electron.getDownloadSize(game?.id as string);
                if (downloadSizeResult.success) {
                    setDownloadSize(downloadSizeResult.size);
                    setCanInstall(true);
                } else {
                    console.error('Failed to get download size:', downloadSizeResult.error);
                    setInstallError(String(downloadSizeResult.error))
                    setDownloadSize(null);
                    setCanInstall(false);
                }
            } catch (error) {
                console.error('Failed to fetch software data:', error);
                setInstallError((error as Error).message)
                setInstallSize(t('error'));
                setDownloadSize(null);
                setCanInstall(false);
            }
        };

        const fetchLocalInstallSize = async () => {
            try {
                const { totalSize, userDataSize } = await window.Electron.getSoftwareSize(JSON.stringify(game));
                setCurrentlyInstalledSize(totalSize); setLocalDataSize(userDataSize); setTotalSize(totalSize + userDataSize)
                console.log(totalSize, userDataSize);
            } catch (e) {
                console.log(e);
            }
        };

        if (isOpen && !uninstall) {
            fetchSoftwareData();
        } else if (isOpen && uninstall) {
            fetchLocalInstallSize();
        }
    }, [isOpen, game?.id, t]);

    // Get default install path when component mounts
    useEffect(() => {
        const getDefaultPath = async () => {
            try {
                const defaultPath = await window.Electron.getDefaultInstallPath(game?.id as string);
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
    }, [isOpen, game?.id]);

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
            setInstallError(null);
            onInstall(installPath);
            onClose();
        } catch (err) {
            setInstallError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    };

    const handleUninstall = async () => {
        try {
            setUninstallError(null);
            onUninstall(game.id, removeUserData); // Pass removeUserData
            onClose();
        } catch (err) {
            setUninstallError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    }

    return (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out ${isOpen ? activeBackdropClasses : inactiveBackdropClasses}`}>
            <div className={`bg-notQuiteWhite dark:bg-notQuiteBlack text-night dark:text-fullMoon rounded-lg w-full max-w-2xl shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? activeClasses : inactiveClasses}`}>
                <div className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-uniSansCAPS">
                            <Trans i18nKey={uninstall ? 'library.install.title.uninstall' : game?.updateAvailable === "reinstall" ? 'library.install.title.reinstall' : 'library.install.title.install'} components={{ b: <b /> }} values={{ title: getLocalizedGameName(game) }}>
                                Install {getLocalizedGameName(game)}
                            </Trans>
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-fullMoon/50 dark:hover:bg-night/50 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 pt-4">
                    {/* Game Info */}
                    {uninstall ? (
                        <div className="mb-6">
                            <div className="gap-y-2 flex flex-col text-sm text-notQuiteBlack/80 dark:text-notQuiteWhite/80 *:transition-colors">
                                <div className="flex justify-between text-red-500/100">
                                    <span>{t('library.install.installedSize')}</span>
                                    <span>{formatFileSize(currentlyInstalledSize)}</span>
                                </div>
                                <div className={cn("flex justify-between", removeUserData && "text-red-500/100")}>
                                    <span>{t('library.install.userDataSize')}</span>
                                    <span>{formatFileSize(localDataSize)}</span>
                                </div>
                                <hr className="flex flex-row border border-solid my-1 rounded-full border-notQuiteBlack/50 dark:border-notQuiteWhite/50" />
                                <div className="flex justify-between">
                                    <span>{t('library.install.totalSize')}</span>
                                    <span>{formatFileSize(totalSize)}</span>
                                </div>
                                <div className="flex justify-between text-red-500/100">
                                    <span>{t('library.install.sizeToRemove')}</span>
                                    <span>{!removeUserData ? formatFileSize(currentlyInstalledSize) : formatFileSize(totalSize)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={downloadSize !== null ? "mb-6" : ""}>
                            <div className="space-y-2 text-sm text-notQuiteBlack/80 dark:text-notQuiteWhite/80">
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
                            {game?.updateAvailable === "reinstall" && (
                                <p className="mt-2 text-xs text-notQuiteBlack/70 dark:text-notQuiteWhite/70 italic">{t('library.install.reinstallReason')}</p>
                            )}
                        </div>
                    )}
                    
                    {installError && (
                        <div className="mt-0 mb-4 text-red-500 text-sm">
                            {installError}
                        </div>
                    )}

                    {uninstallError && (
                        <div className="mt-0 mb-4 text-red-500 text-sm">
                            {uninstallError}
                        </div>
                    )}

                    {/* Install Path Selection */}
                    {(game?.updateAvailable !== "reinstall" && !uninstall) && (
                        <div className="space-y-2">
                            <label className="block font-montserrat text-sm">{t('library.install.installLocation')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={installPath}
                                    onChange={(e) => setInstallPath(e.target.value)}
                                    disabled={isLoading}
                                    className="flex-1 bg-fullMoon dark:bg-night border border-solid border-fullMoon/60 dark:border-night/60 rounded px-3 py-2 font-consolas text-sm focus:outline-none focus:border-cornflowerBlue disabled:cursor-not-allowed"
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
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 mt-6">
                        {
                            uninstall && (<div className="flex items-center gap-2 flex-1">
                                <FlipSwitch
                                    checked={removeUserData}
                                    onChange={e => setRemoveUserData(e.target.checked)}
                                    id="remove-user-data-switch"
                                />
                                <label htmlFor="remove-user-data-switch" className="text-sm select-none cursor-pointer">
                                    {t('library.install.removeUserData')}
                                </label>
                            </div>)
                        }
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-opacity-10 bg-notQuiteBlack dark:bg-opacity-10 dark:bg-notQuiteWhite font-bold"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={!uninstall ? handleInstall : handleUninstall}
                            disabled={!uninstall && (!installPath || isLoading || !canInstall)}
                            className={
                                (game?.updateAvailable === 'reinstall' || uninstall)
                                    ? 'px-4 py-2 rounded-lg bg-danger hover:bg-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed'
                                    : 'px-4 py-2 rounded-lg bg-progress hover:bg-progress/80 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed'
                            }
                        >
                            {uninstall
                                ? t('library.install.uninstall')
                                : game?.updateAvailable === 'reinstall'
                                    ? t('library.install.reinstall')
                                    : t('library.install.install')
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallModal; 