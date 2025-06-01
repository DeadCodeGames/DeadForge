import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface SpoilerProps {
    children: React.ReactNode;
    className?: string;
}

const Spoiler: React.FC<SpoilerProps> = ({ children, className }) => {
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <div 
            className={cn(
                "relative rounded-[17px] overflow-hidden transition-all duration-200 border border-solid border-neutral-200 dark:border-neutral-700",
                "bg-neutral-100 dark:bg-neutral-800 whitespace-pre-wrap",
                className
            )}
        >
            <div className={cn(
                "py-4 pl-6 pr-8 bg-neutral-100 dark:bg-neutral-800 transition-all duration-200",
                !isRevealed && "blur-xl select-none"
            )}>
                {children}
            </div>
            
            <div 
                className={cn("absolute inset-0 flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-[2px] cursor-pointer hover:bg-black/30 dark:hover:bg-black/50 transition-all duration-200 opacity-100", isRevealed && "opacity-0 pointer-events-none")}
                onClick={() => setIsRevealed(true)}
            >
                <span className="text-white text-center font-medium text-sm tracking-wide px-4 py-2 rounded-lg bg-black/20 dark:bg-black/40 backdrop-blur-[2px] whitespace-pre-line">
                    {"Spoiler\nClick to Reveal"}
                </span>
            </div>
            
            <button
                onClick={() => setIsRevealed(false)}
                className={cn("absolute flex items-center justify-center top-0 right-0 p-2 aspect-square rounded-full bg-black/20 dark:bg-black/40 hover:bg-black/30 dark:hover:bg-black/50 transition-all duration-200 opacity-100", !isRevealed && "opacity-0 pointer-events-none")}
            >
                <span className="material-symbols text-black dark:text-white text-lg aspect-square">
                        visibility_off
                </span>
            </button>
        </div>
    );
};

export default Spoiler; 