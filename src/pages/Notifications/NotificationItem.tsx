type Props = {
    notification: {
        id: number;
        title: string;
        message: string;
    };
    index: number;
    active: boolean;
};

export default function NotificationItem({ notification, index, active }: Props) {
    const base = "pointer-events-none transition-all duration-300 rounded-xl shadow-xl text-notQuiteWhite font-montserrat px-4 py-3 w-full max-w-sm";
    const layer = [
        "z-30",
        "z-20 scale-[0.9] translate-y-3 opacity-80",
        "z-10 scale-[0.8] translate-y-6 opacity-60"
    ][index] ?? "hidden";

    return (
        <div
            className={`
        ${base}
        ${layer}
        ${index === 0
                    ? active
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 -translate-y-6 scale-95"
                    : ""}
        bg-night backdrop-blur-md border border-white/10
      `}
        >
            <h4 className="text-base font-semibold">{notification.title}</h4>
            <p className="text-sm">{notification.message}</p>
        </div>
    );
}
