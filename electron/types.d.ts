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
    lastPlayed?: number;
    totalPlayedFor?: number;
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

export type Collection = {
    id: string;
    name: string;
    games: CollectionGame[];
}

export type CollectionGame = {
    source: string;
    id: string;
}

export type Collections = {
    favourites: CollectionGame[];
    collections: {
        [key: string]: CollectionGame[];
    }
}

export type OldCollections = {
    favourites: string[];
    collections: {
        [key: string]: string[];
    }
}

export interface ExternalData {
    matches: {
        source: string;
        id: string;
    }[];
}

export interface GameAsset extends ExternalData {
    executablesToWatch?: string[];
    media: {
        iconUrl: {
            filePath: string;
            remoteUrl: string;
            hash?: string;
        };
        heroUrl: {
            filePath: string;
            remoteUrl: string;
            hash?: string;
        };
        logoUrl: {
            filePath: Record<string, string>;
            remoteUrl: Record<string, string>;
            logo_position: {
                pinned_position: string;
                height_pct: number;
                width_pct: number;
            };
            hash?: string | Record<string, string>;
        };
        headerUrl: {
            filePath: Record<string, string>;
            remoteUrl: Record<string, string>;
            hash?: string | Record<string, string>;
        };
        capsuleUrl: {
            filePath: Record<string, string>;
            remoteUrl: Record<string, string>;
            hash?: string | Record<string, string>;
        };
    };
}

export interface GameWarning extends ExternalData {
    title: string;
    description: string;
    severity: string;
    url: string;
}

export interface ArticleAuthor {
    name: string;
    link: string;
    profilePicture: string;
}

export interface Article {
    title: string;
    authors: ArticleAuthor[];
    bannerImage: string;
    content: string;
    publishDate: string;
    lastModified: string;
    tags: string[];
    slug: string;
}

export interface ArticleList {
    articles: Article[];
}

export interface Software {
    id: string
    title: string
    type?: "Game" | "Demo"
    developer: string
    shortDescription: string
    description: string
    category: string
    version: string
    price: number
    icon?: string
    logo?: string
    hero?: string
    banner?: string
    capsule?: string
    screenshots: string[]
    features?: string[]
    size: string
    platform: string
    releaseDate: string
    systemRequirements?: {
      os: string
      processor: string
      memory: string
      storage: string
      graphics?: string
    }
    featured?: boolean,
    releasesSource?: "github",
    releasesLink?: string
  }