export type Preferences = {
    theme: string,
    sidebarCollapsed: boolean,
    windowFrame: string,
    showThemeButton: boolean,
    language: string,
    defaultPage: string,
    useSettingsWindow: boolean,
    useTray: boolean,
    autoStart: boolean,
    autoUpdate: boolean,
    betaUpdates: boolean,
    langUpdates: boolean
}

export type OldPreferences = {
    colorScheme: string,
    discordRPC: boolean,
    startup: boolean,
    betaEnabled: boolean,
    closeToTray: boolean,
    menubarCollapsed: boolean,
    libraryStyle: string,
    librarySort: string,
    currentLibCollection: null | string
}

export const defaultPreferences: Preferences = {
    theme: "dark",
    sidebarCollapsed: false,
    windowFrame: "auto",
    showThemeButton: false,
    language: "en_001",
    defaultPage: "library",
    useSettingsWindow: false,
    useTray: false,
    autoStart: false,
    autoUpdate: false,
    betaUpdates: false,
    langUpdates: false
  }