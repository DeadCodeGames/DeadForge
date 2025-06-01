export interface SteamGameObject {
    id: number;
    size: number;
    info_state: number;
    last_updated: Date;
    token: number;
    hash: string;
    change_number: number;
    vdf_hash: string;
    data: Data;
}

export interface Data {
    appinfo: Appinfo;
}

export interface Appinfo {
    appid: number;
    common: Common;
    extended: Extended;
    config: AppinfoConfig;
    depots: Depots;
    ufs: Ufs;
}

export interface Common {
    name: string;
    name_localized: Record<string, string>;
    type: string;
    oslist: string;
    logo: string;
    logo_small: string;
    icon: string;
    clienttga: string;
    clienticon: string;
    linuxclienticon: string;
    languages: Record<string, number>;
    clienticns: string;
    osarch: string;
    osextended: string;
    steam_deck_compatibility: SteamDeckCompatibility;
    market_presence: number;
    metacritic_name: string;
    controllertagwizard: number;
    controller_support: string;
    small_capsule: LocalizedImage;
    header_image: LocalizedImage;
    library_assets: LibraryAssets;
    library_assets_full: LibraryAssetsFull;
    store_asset_mtime: number;
    associations: Record<string, Association>;
    primary_genre: number;
    genres: Record<string, number>;
    category: Record<string, number>;
    supported_languages: Record<string, LanguageSupport>;
    original_release_date: number;
    metacritic_score: number;
    metacritic_fullurl: string;
    community_visible_stats: number;
    workshop_visible: number;
    community_hub_visible: number;
    gameid: number;
    store_tags: Record<string, number>;
    review_score: number;
    review_percentage: number;
    review_score_bombs: number;
    review_percentage_bombs: number;
}

export interface Association {
    type: string;
    name: string;
}

export interface LocalizedImage {
    [key: string]: string;
}

export type LogoPosition = {
    pinned_position: "BottomLeft" | "CenterCenter";
    width_pct: string;
    height_pct: number;
}

export interface LibraryAssets {
    library_capsule: string;
    library_hero: string;
    library_logo: string;
    library_header: string;
    logo_position: LogoPosition;
}

export interface LibraryAssetsFull {
    library_capsule: Library;
    library_hero: Library;
    library_logo: LibraryLogo;
    library_header: Library;
}

export interface Library {
    image: LocalizedImage;
    image2x: LocalizedImage;
}

export interface LibraryLogo extends Library {
    logo_position: LogoPosition;
}

export interface SteamDeckCompatibility {
    category: number;
    test_timestamp: number;
    tested_build_id: number;
    tests: Record<string, Test>;
    configuration: Configuration;
}

export interface Configuration {
    supported_input: string;
    requires_manual_keyboard_invoke: number;
    requires_non_controller_launcher_nav: number;
    primary_player_is_controller_slot_0: number;
    non_deck_display_glyphs: number;
    small_text: number;
    requires_internet_for_setup: number;
    requires_internet_for_singleplayer: number;
    recommended_runtime: string;
    requires_h264: number;
    gamescope_frame_limiter_not_supported: number;
}

export interface Test {
    display: number;
    token: string;
}

export interface LanguageSupport {
    supported: number | string;
}

export interface AppinfoConfig {
    contenttype: number;
    installdir: string;
    launch: Launch[];
    steamcontrollertemplateindex: number;
    steamcontrollertouchtemplateindex: number;
    steamcontrollertouchconfigdetails: Record<string, ControllerTouchConfigDetail>;
    steamdecktouchscreen: number;
    steaminputmanifestpath: string;
}

export interface Launch {
    executable: string;
    description?: string;
    type?: string;
    config: LaunchConfig;
    arguments?: string;
    workingdir?: string;
    description_loc?: LocalizedImage;
}

export interface LaunchConfig {
    oslist: string;
    osarch?: number | string;
    BetaKey?: string;
}

export interface ControllerTouchConfigDetail {
    controller_type: string;
    enabled_branches: string;
    use_action_block: string;
}

export interface DepotManifest {
    gid: string;
    size: number | string;
    download: number | string;
}

export interface BaseDepot {
    dlcappid?: number;
    systemdefined?: number;
    config?: {
        oslist: string;
    };
    manifests?: Record<string, DepotManifest>;
}

export interface Depots {
    depotdeltapatches: number;
    overridescddb: number;
    markdlcdepots: number;
    workshopdepot: number;
    hasdepotsindlc: number;
    branches: Record<string, Branch>;
    privatebranches: number;
    [key: string]: BaseDepot | number | Record<string, Branch>;
}

export interface Branch {
    buildid: number;
    description?: string;
    timeupdated: number;
}

export interface Extended {
    dlcforappid?: number;
    checkpkgstate: number;
    developer: string;
    gamedir: string;
    homepage: string;
    icon: string;
    installscript: string;
    noservers: number;
    sourcegame: number;
    state: string;
    visibleonlywhensubscribed: number;
    publisher: string;
    listofdlc: string;
    DLCAvailableOnStore?: number;
}

export interface Ufs {
    quota: string;
    maxnumfiles: number;
}