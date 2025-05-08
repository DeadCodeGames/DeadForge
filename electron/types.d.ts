import './vdf.d.ts';

type LaunchOption = {
    name: string;
    executable: string;
    arguments: string | string[];
}

export interface NormalizedGame {
    id: string;
    source: 'steam' | 'epic' | 'itch';
    name: string;
    installPath?: string;
    launchOptions?: LaunchOption[];
    sizeBytes?: number;
    media?: {
        iconUrl?: string;
        logoUrl?: string;
        heroUrl?: string;
    };
    raw?: any;
}
