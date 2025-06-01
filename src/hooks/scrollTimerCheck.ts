import React, { useEffect, useState, useRef } from "react";

type Mode = "scroll" | "timer" | "both";

export function useScrollTimerCheck(
    ref: React.RefObject<HTMLElement | null>,
    isActive: boolean,
    {
        mode = "both",
        firstTimer = 5000,
        returnTimer = 2000,
    }: {
        mode?: Mode;
        firstTimer?: number;
        returnTimer?: number;
    }
): {active: boolean, reset: () => void} {
    const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
    const [timerPassed, setTimerPassed] = useState(false);
    const isFirstTime = useRef(true);
    const hasReset = useRef(false);
    
    const resetFirstTime = () => {
        isFirstTime.current = true;
        hasReset.current = true;
        setHasScrolledToEnd(false);
        setTimerPassed(false);
    };
    
    useEffect(() => {
        if (!isActive) {
            setHasScrolledToEnd(false);
            setTimerPassed(false);
    
            // 🛑 Don't immediately overwrite the reset state
            // Only set this if NOT reset manually
            if (!hasReset.current) {
                isFirstTime.current = false;
            }
    
            hasReset.current = false;
            return;
        }
    
        // Timer logic
        if (mode === "timer" || mode === "both") {
            const timeout = (isFirstTime.current) ? firstTimer : returnTimer;
            const timer = setTimeout(() => setTimerPassed(true), timeout);
            return () => clearTimeout(timer);
        }
    }, [isActive, firstTimer, returnTimer, mode]);
    

    useEffect(() => {
        if (!isActive || (mode !== "scroll" && mode !== "both")) return;
        const el = ref.current;
        if (!el) return;

        const handleScroll = () => {
            const isAtBottom =
                el.scrollHeight - el.scrollTop <= el.clientHeight + 1;
            if (isAtBottom) {
                setHasScrolledToEnd(true);
            }
        };

        handleScroll();

        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, [ref, mode, isActive]);

    if (mode === "scroll") return {active: hasScrolledToEnd, reset: resetFirstTime};
    if (mode === "timer") return {active: timerPassed, reset: resetFirstTime};
    return {active: hasScrolledToEnd && timerPassed, reset: resetFirstTime};
}
