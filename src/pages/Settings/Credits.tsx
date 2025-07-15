import React from 'react';
import CreditsBanner from './CreditsBanner';
import { useTranslation } from 'react-i18next'

const CreditsTitle = ({ title }: {title: string}) => {
    return (
        <div className="max-w-sm w-full py-4 flex flex-row items-center justify-center relative">
            <div className="max-w-sm w-full mx-auto">
                <div className="absolute border border-solid border-night/70 dark:border-fullMoon/70 rounded-full max-w-sm w-full" />
            </div>
            <span className="flex w-fit text-lg font-uniSansCAPS font-bold absolute bg-notQuiteWhite dark:bg-notQuiteBlack px-2">{title}</span>
        </div>
    )
}

/**
 * Renders a Credits section with various categories and individuals.
 * Each category includes a title and a list of contributors or people
 * to thank, displayed as clickable profile links with images.
 *
 * @param {Object} props - The component props.
 * @param {any} props.refreshVar - A variable used as the key to force re-render.
 */

const Credits = ({refreshVar}: {refreshVar: any}) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center gap-2" key={ refreshVar }>
            <CreditsTitle title={t('settings.appData.creditsModal.developedBy')} />
            <div className="flex flex-row items-center justify-center gap-4 flex-wrap">
                <CreditsBanner
                    name={(<a href="https://github.com/RichardKanshen/" target='_blank' rel='noreferrer noopener' className="m-0 no-underline hover:underline">Kanshen</a>)}
                    profileImageUrl="https://github.com/RichardKanshen.png"
                    creditType={[t('settings.appData.creditsModal.developerTAG')].join(t("commaSeparator"))}
                    isDEADCODEDev={true}
                />
            </div>
            <CreditsTitle title={t('settings.appData.creditsModal.contributors')} />
            <div className="flex flex-row items-center justify-center gap-4 flex-wrap">
                <CreditsBanner
                    name={(<a href="https://github.com/Hoshty/" target='_blank' rel='noreferrer noopener' className="m-0 no-underline hover:underline">Hoshty</a>)}
                    profileImageUrl="https://github.com/Hoshty.png"
                    creditType={[t('settings.appData.creditsModal.testerTAG'), t('settings.appData.creditsModal.articlecowriterTAG')].join(t("commaSeparator"))}
                    isDEADCODEDev={true}
                />
                <CreditsBanner
                    name={(<a href="https://github.com/SlovakTastic/" target='_blank' rel='noreferrer noopener' className="m-0 no-underline hover:underline">SlovakTastic</a>)}
                    profileImageUrl="https://github.com/SlovakTastic.png"
                    creditType={[t('settings.appData.creditsModal.registryjsTAG')].join(t("commaSeparator"))}
                    isDEADCODEDev={true}
                />
            </div>
            <CreditsTitle title={t('settings.appData.creditsModal.specialThanks')} />
            <div className="flex flex-row items-center justify-center gap-4 flex-wrap">
                <CreditsBanner
                    name={(<a href="https://github.com/MusicOnStereo/" target='_blank' rel='noreferrer noopener' className="m-0 no-underline hover:underline">Qlexc (<strong>@MusicOnStereo</strong>)</a>)}
                    profileImageUrl="https://github.com/MusicOnStereo.png"
                    creditType={[t('settings.appData.creditsModal.qlexcTAG')].join(t("commaSeparator"))}
                    isDEADCODEDev={false}
                />
            </div>
        </div>
    )
}

export default Credits;