import React from "react";
import { cn } from "@/lib/utils"
import DEADCODELogo from "@/components/CustomElements/DEADCODELogo";

interface CreditBannerProps {
    name: React.ReactNode,
    creditType: string,
    isDEADCODEDev?: boolean,
    profileImageUrl?: string,
    className?: string
}

const CreditBanner = ({
    name,
    creditType,
    isDEADCODEDev = false,
    profileImageUrl,
    className,
}: CreditBannerProps) => {
    const fallbackImageUrl = process.env.PUBLIC_URL + `/assets/pfp${isDEADCODEDev ? "-deadcode-" : "-"}fallback.png`;
    return (
        <div
            className={cn("w-fit flex flex-row h-[50px] items-center p-[12.5px] bg-notQuiteBlack/10 dark:bg-notQuiteWhite/10 rounded-[25px]", className)}
        >
            <div className="h-[50px] rounded-[25px] flex-shrink-0 mr-[12.5px]">
                <img
                    src={profileImageUrl}
                    className="size-[50px] rounded-[25px] object-cover object-center flex-shrink-0"
                    onError={({currentTarget}) => {console.log(currentTarget); if (currentTarget.src !== fallbackImageUrl) currentTarget.src = fallbackImageUrl}}
                />
            </div>
            <div className="flex flex-col font-uniSansCAPS mr-2.5">
                <div className="flex flex-row items-center min-h-7">
                    <span>{name}</span>
                    {isDEADCODEDev && (
                        <DEADCODELogo className="ml-1.5" />
                    )}
                </div>
                <div className="italic text-xs -mt-1 font-bold text-notQuiteBlack/70 dark:text-notQuiteWhite/70 whitespace-pre-wrap text-wrap">{creditType}</div>
            </div>
        </div>
    )
}

export default CreditBanner;