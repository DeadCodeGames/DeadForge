import { useState, useEffect } from 'react';
import FlipSwitch from '@/components/CustomElements/FlipSwitch';

export default function SettingsOption({ title, description, controls }: { title: string, description: string, controls: React.JSX.Element }) {
    const [isBelow1000, setIsBelow1000] = useState<boolean>(false);

    useEffect(() => {
        const checkSize = () => {
            const match = window.matchMedia("(max-width:1000px)")
            setIsBelow1000(match.matches);
        };

        checkSize();

        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, [])

    const FlipSwitchSpacing = "gap-y-2";
    return (
        <div className="flex flex-row settingsShrink:flex-col gap-y-4 justify-between items-center settingsShrink:text-center gap-x-4 mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
            <div className={`flex flex-col ${(isBelow1000 && controls.type.name === FlipSwitch.name) ? FlipSwitchSpacing : ""}`}>
                <div className="font-bold flex flex-row settingsShrink:justify-center items-center gap-x-4">{title} { (isBelow1000 && controls.type.name === FlipSwitch.name) && controls }</div>
                <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic whitespace-break-spaces">{description}</div>
            </div>
            { !(isBelow1000 && controls.type.name === FlipSwitch.name) && controls }
        </div>
    )
}