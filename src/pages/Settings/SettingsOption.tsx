export default function SettingsOption({ title, description, controls }: { title: string, description: string, controls: React.JSX.Element }) {
    return (
        <div className="flex justify-between items-center gap-x-4 mb-4 p-4 bg-opacity-5 bg-notQuiteBlack dark:bg-opacity-5 dark:bg-notQuiteWhite rounded-lg">
            <div>
                <div className="font-bold">{title}</div>
                <div className="text-opacity-70 text-notQuiteBlack dark:text-opacity-70 dark:text-notQuiteWhite italic whitespace-break-spaces">{description}</div>
            </div>
            { controls }
        </div>
    )
}