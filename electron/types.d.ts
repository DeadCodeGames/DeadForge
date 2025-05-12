import './vdf.d.ts';

type LaunchOption = {
    name: string;
    executable: string;
    arguments: string | string[];
}

interface Media {
    headerUrl?: string | Record<string, Record<string, string>>
    capsuleUrl?: string | Record<string, Record<string, string>>;
}

interface GameMedia extends Media {
    iconUrl?: string;
    logoUrl?: string | Record<string, Record<string, string>>;
    heroUrl?: string | Record<string, Record<string, string>>;
}

export interface NormalizedSoftware {
    id: string;
    source: 'steam' | 'epic' | 'itch' | 'osu' | 'deadforge'
    name: string | Record<string, string>;
    sizeBytes?: number;
    raw?: any;
    type: string
}

export interface NormalizedGame extends NormalizedSoftware {
    installPath?: string;
    launchOptions?: LaunchOption[];
    media?: GameMedia;
}

export interface NormalizedDLC extends NormalizedSoftware {
    parentGameId: string;
    media?: Media;
}

export interface NormalizedGameJoin {
    id: number;
    clients: Record<string, string>;
    defaultClient: string;
    preferences: Record<string, any>;
}

export interface NormalizedPseudoGameJoin {
    id: string;
    source: Record<string, NormalizedGame>
    defaultClient: string;
    preferences: Record<string, any>;
    type: "GameJoin";
}