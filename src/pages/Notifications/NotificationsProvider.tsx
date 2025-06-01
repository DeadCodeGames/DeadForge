import React, { createContext, useContext, useState, useCallback } from "react";

type Notification = {
    id: number;
    title: string;
    message: string;
    duration?: number;
};

type Context = {
    queue: Notification[];
    // eslint-disable-next-line no-unused-vars
    addNotification: (n: Notification) => void;
    removeCurrent: () => void;
};

const NotificationContext = createContext<Context | undefined>(undefined);

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
    return ctx;
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [queue, setQueue] = useState<Notification[]>([]);

    const addNotification = useCallback((n: Notification) => {
        setQueue((q) => [...q, n]);
    }, []);

    const removeCurrent = useCallback(() => {
        setQueue((q) => q.slice(1));
    }, []);

    return (
        <NotificationContext.Provider value={{ queue, addNotification, removeCurrent }}>
            {children}
        </NotificationContext.Provider>
    );
};
