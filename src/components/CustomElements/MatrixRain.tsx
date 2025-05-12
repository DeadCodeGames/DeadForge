import { useEffect, useRef, useState } from 'react';

export interface MatrixRainProps {
    fontSize?: number;
    speed?: number;
    className?: string;
}

export default function MatrixRain({
    fontSize = 16,
    speed = 66,
    className = '',
}: MatrixRainProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestIdRef = useRef<number | undefined>(undefined);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    // Add a ref to track if window is being resized
    const isResizingRef = useRef<boolean>(false);
    // Add a ref for resize timeout to clear it when needed
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Store drops and columns in refs to maintain state between renders
    const dropsRef = useRef<number[]>([]);
    const columnsRef = useRef<number>(0);

    // Japanese characters
    const letters = useRef<string[]>([]);

    useEffect(() => {
        const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヰヱ';
        const hiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゐゑ';
        letters.current = (katakana + hiragana).split("");
    }, []);

    // Function to start animation
    const startAnimation = () => {
        if (isResizingRef.current || !canvasRef.current) return;
        
        if (requestIdRef.current === undefined) {
            requestIdRef.current = requestAnimationFrame(draw);
        }
    };

    // Function to stop animation
    const stopAnimation = () => {
        if (requestIdRef.current !== undefined) {
            cancelAnimationFrame(requestIdRef.current);
            requestIdRef.current = undefined;
        }
    };

    // Handle canvas resize without resetting animation
    useEffect(() => {
        if (!canvasRef.current) return;

        const updateDimensions = () => {
            if (!canvasRef.current) return;

            // Mark as resizing
            isResizingRef.current = true;
            
            // Stop any ongoing animation
            stopAnimation();
            
            // Clear any existing resize timeout
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }

            const { clientWidth, clientHeight } = canvasRef.current.parentElement || document.body;
            setDimensions({ width: clientWidth, height: clientHeight });

            // Update canvas dimensions
            canvasRef.current.width = clientWidth;
            canvasRef.current.height = clientHeight;

            // Recalculate columns but preserve drops where possible
            const newColumns = Math.ceil(clientWidth / fontSize);

            // If we have more columns now, add new drops
            if (newColumns > columnsRef.current) {
                for (let i = columnsRef.current; i < newColumns; i++) {
                    dropsRef.current[i] = 1;
                }
            }

            columnsRef.current = newColumns;

            // Set timeout to resume animation after resize is complete
            resizeTimeoutRef.current = setTimeout(() => {
                isResizingRef.current = false;
                startAnimation();
                resizeTimeoutRef.current = null;
            }, 300); // 300ms debounce
        };

        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(canvasRef.current.parentElement || document.body);

        return () => {
            resizeObserver.disconnect();
            stopAnimation();
            
            // Clear any pending timeouts
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
        };
    }, [fontSize]);

    // Animation logic
    const draw = () => {
        if (canvasRef.current && !isResizingRef.current) {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;

            // Check for dark mode based on .dark class in html element
            const isDarkMode = document.documentElement.classList.contains('dark');

            // Background color with fade effect
            if (isDarkMode) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            }
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Set font before drawing text
            ctx.font = `${fontSize}px "Noto Sans", "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", "Noto Sans TC", "Noto Sans Hebrew"`;

            // Draw each character
            for (let i = 0; i < dropsRef.current.length; i++) {
                const text = letters.current[Math.floor(Math.random() * letters.current.length)];

                // Text color based on dark mode
                if (isDarkMode) {
                    ctx.fillStyle = '#6495ed'; // Cornflower blue
                } else {
                    ctx.fillStyle = '#404'; // Dark purple
                }

                ctx.fillText(text, i * fontSize, dropsRef.current[i] * fontSize);

                dropsRef.current[i]++;

                // Reset drops when they reach bottom with slight randomness
                if (dropsRef.current[i] * fontSize > canvasRef.current.height && Math.random() > 0.95) {
                    dropsRef.current[i] = 0;
                }
            }

            // Use setTimeout for next frame
            requestIdRef.current = undefined;
            setTimeout(() => {
                if (!isResizingRef.current) {
                    requestIdRef.current = requestAnimationFrame(draw);
                }
            }, speed);
        }
    };

    useEffect(() => {
        // Initialize drops if not already done
        if (dropsRef.current.length === 0 && columnsRef.current > 0) {
            for (let i = 0; i < columnsRef.current; i++) {
                dropsRef.current[i] = 1;
            }
        }

        // Start the animation if not resizing
        if (!isResizingRef.current) {
            startAnimation();
        }

        return () => {
            stopAnimation();
            // Clear any pending timeouts
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
        };
    }, [fontSize, speed]);

    return (
        <div className={`relative w-full h-full ${className}`}>
            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="absolute top-0 left-0 w-full h-full"
            />
        </div>
    );
}