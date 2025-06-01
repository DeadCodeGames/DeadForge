import React, { useEffect, useState } from "react";
import { useNotifications } from "./NotificationsProvider";
import NotificationItem from "./NotificationItem";

const NotificationDisplay = () => {
    const { queue, removeCurrent } = useNotifications();
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (queue.length === 0) return;

        setVisible(true);
        const timeout = setTimeout(() => {
            setVisible(false);
            setTimeout(() => removeCurrent(), 200); // delay for exit animation
        }, queue[0].duration || 3000);

        return () => clearTimeout(timeout);
    }, [queue, removeCurrent]);

    return (
        <div className="fixed top-4 right-4 flexa flex-col items-end gap-2 z-[1000] pointer-events-none">
            {queue.slice(0, 3).map((n, i) => (
                <NotificationItem
                    key={n.id}
                    notification={n}
                    index={i}
                    active={i === 0 && visible}
                />
            ))}
        </div>
    );
}

export default NotificationDisplay;