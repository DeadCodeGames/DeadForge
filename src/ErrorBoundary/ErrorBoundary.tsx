
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    isErrorDismissed: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            isErrorDismissed: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ error, errorInfo, hasError: true });
        console.error("Error caught by ErrorBoundary:", error, errorInfo.componentStack);
    }

    dismissError = (): void => {
        window.Electron.reload();
    }

    reportBug = (): void => {
        const { error, errorInfo } = this.state;
        const title = encodeURIComponent("Bug Report: Unexpected Crash ()");
        const body = encodeURIComponent(
            `### Describe the bug\n\nAn unexpected error occurred.\n\n### Error\n\`\`\`\n${error?.toString()}\n\`\`\`\n\n### Stack Trace\n\`\`\`${errorInfo?.componentStack?.replaceAll("\n\n", "\n")}\n\`\`\`\n\n### Additional Info\n- App Version: ${window.Process.versions.deadforge}\n- node.js Version: ${window.Process.versions.node}\n- Chrome Version: ${window.Process.versions.chrome}\n- Electron Version: ${window.Process.versions.electron}\n- Platform: ${window.Process.platform}`
        );
        const labels = encodeURIComponent("bug");

        const url = `https://github.com/DeadCodeGames/DeadForge/issues/new?title=${title}&body=${body}&labels=${labels}`;
        window.open(url, "_blank");
    };

    render() {
        const { children } = this.props;
        const { hasError, error, errorInfo, isErrorDismissed } = this.state;

        if (hasError && !isErrorDismissed) {
            return (
                <div className="relative">
                    <div className={cn("pointer-events-none", hasError && "filter blur-[2px]")}>
                        {children}
                    </div>

                    <div className="fixed top-9 h-[calc(100vh-36px)] w-full bg-black/80 flex items-center justify-center z-40">
                        <div className="bg-notQuiteBlack text-fullMoon rounded-lg w-full max-w-2xl shadow-xl">
                            <div className="p-4 pb-0 border-b border-night flex justify-between items-center">
                                <h2 className="text-2xl font-uniSansCAPS flex items-center gap-2">
                                    <AlertTriangle className="text-danger" />
                                    <span>An Uncaught Error Occurred</span>
                                </h2>
                            </div>

                            <div className="py-4 px-6">
                                <div className="min-h-[100px] space-y-2">
                                    <div className="font-montserrat text-danger font-bold">
                                        {error?.name || "Error"}
                                    </div>

                                    <div className="font-montserrat line-clamp-1 select-all">
                                        {error?.message || "An unknown error occurred."}
                                    </div>

                                    {errorInfo && (
                                        <div className="mt-2">
                                            <h4 className="font-uniSansCAPS text-sm text-notQuiteWhite/80 mb-2">Component Stack</h4>
                                            <pre className="bg-night p-4 rounded min-w-fit max-w-full max-h-fit text-xs font-consolas text-notQuiteWhite/70 select-all">
                                                {errorInfo.componentStack?.trim()}
                                            </pre>
                                        </div>
                                    )}

                                    <div className="font-montserrat text-[11px] text-notQuiteWhite/80 whitespace-pre-wrap">{"An error we did not expect occurred. Consider reporting this issue with the Open a bug report button below. No personal information is collected. Please, make sure to check for duplicate issues before submitting.\nYou can try restarting the application with the button below, but the issue may persist."}</div>
                                </div>

                                <div className="flex justify-between pt-4 border-t border-notQuiteBlack">
                                    <button
                                        onClick={this.dismissError}
                                        className="px-4 py-2 flex items-center gap-1 font-montserrat text-notQuiteWhite/80 hover:text-fullMoon"
                                    >
                                        Restart
                                    </button>

                                    <button
                                        onClick={this.reportBug}
                                        className="px-4 py-2 bg-progress hover:bg-progress/80 text-fullMoon rounded font-montserrat"
                                    >
                                        Open a bug report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}
