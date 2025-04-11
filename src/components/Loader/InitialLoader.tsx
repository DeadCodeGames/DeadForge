import { useEffect, useState } from 'react';

export default function InitialLoader() {
    const [stage, setStage] = useState('initial');

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        timers.push(setTimeout(() => setStage('textResize'), 3000));
        timers.push(setTimeout(() => setStage('fadeOut'), 4500));
        timers.push(setTimeout(() => setStage('unrender'), 5000));

        return () => timers.forEach(clearTimeout);
    }, []);
    if (stage === 'unrender') return null;
    return (
        <div
            className={`z-50 dark:bg-black dark:text-white bg-white text-black flex flex-col justify-center items-center w-screen h-screen absolute app-region-drag opacity-100 duration-500 ${
                stage === 'fadeOut' ? 'transition-opacity !opacity-0' : 'transition-opacity !opacity-100'
            }`}
        >
            <div
                id="deadcodeLogo"
                className={`font-montserrat font-bold transition-all duration-1000 ${
                    stage !== 'initial' ? 'text-4xl' : 'text-9xl'
                }`}
            >
                ××
            </div>
            <div
                id="deadforgeWordmark"
                className={`font-uniSansCAPS font-bold transition-all duration-1000 ${
                    stage !== 'initial' ? 'text-6xl' : 'text-0'
                }`}
            >
                DEADFORGE
            </div>
        </div>
    );
}
