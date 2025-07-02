import React, { type JSX } from "react"
import { cn } from "@/lib/utils"
import Spoiler from "@/components/CustomElements/Spoiler"
import Twemoji from "react-twemoji"
import { Info, Lightbulb, MessageSquareWarning, TriangleAlert, OctagonAlert } from "lucide-react"

interface MarkdownTextProps {
  children: string
    className?: string,
    mediaMap?: Record<string, string>
}

type TokenType = "text" | "bold" | "italic" | "strikethrough" | "underline" | "monospace" | "link" | "image" | "spoiler"
type BlockType = "paragraph" | "heading" | "unorderedList" | "orderedList" | "horizontalRule" | "alert"
type ListType = "unordered" | "ordered"
type AlertType = "note" | "tip" | "important" | "warning" | "caution"

type Token =
  | { type: Extract<TokenType, "text" | "monospace">; content: string }
  | { type: Extract<TokenType, "bold" | "italic" | "strikethrough" | "underline">; content: Token[] }
  | { type: Extract<TokenType, "link">; content: Token[]; url: string }
  | { type: Extract<TokenType, "image">; content: string; url: string; alt: string }
  | { type: Extract<TokenType, "spoiler">; content: Token[] }

interface ListItem {
  content: Token[]
  level: number
  type: ListType
  children?: ListItem[]
}

interface Block {
  type: BlockType
  content: Token[]
  level?: number // For headings (1-6)
  items?: ListItem[] // For lists
  alertType?: AlertType
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ children, className, mediaMap }) => {
    const tokenizeInline = (text: string): Token[] => {
        const tokens: Token[] = []
        let currentText = ""
        let i = 0

        const pushText = () => {
            if (currentText) {
                tokens.push({ type: "text", content: currentText })
                currentText = ""
            }
        }

        const findClosingMarker = (marker: string, startIndex: number): number => {
            let depth = 1
            let pos = startIndex

            while (pos < text.length) {
                if (text.startsWith(marker, pos)) {
                    depth--
                    if (depth === 0) {
                        return pos
                    }
                    pos += marker.length
                } else {
                    pos++
                }
            }
            return -1
        }

        while (i < text.length) {
            // Check for spoiler tags
            if (text.startsWith("<spoiler>", i)) {
                const closeTag = text.indexOf("</spoiler>", i)
                if (closeTag !== -1) {
                    pushText()
                    const spoilerContent = text.slice(i + 9, closeTag) // Remove <spoiler> tag
                    tokens.push({
                        type: "spoiler",
                        content: tokenizeInline(spoilerContent),
                    })
                    i = closeTag + 10 // Skip past </spoiler>
                    continue
                }
            }

            // Check for image pattern ![alt](url)
            if (text.startsWith("![", i)) {
                const closeBracket = text.indexOf("]", i)
                if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
                    const closeParens = text.indexOf(")", closeBracket)
                    if (closeParens !== -1) {
                        pushText()
                        const altText = text.slice(i + 2, closeBracket)
                        const url = text.slice(closeBracket + 2, closeParens)
                        tokens.push({
                            type: "image",
                            content: "",
                            url,
                            alt: altText,
                        })
                        i = closeParens + 1
                        continue
                    }
                }
            }

            // Check for link pattern [text](url)
            if (text[i] === "[" && text[i - 1] !== "!") {
                // Make sure it's not an image
                const closeBracket = text.indexOf("]", i)
                if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
                    const closeParens = text.indexOf(")", closeBracket)
                    if (closeParens !== -1) {
                        pushText()
                        const linkText = text.slice(i + 1, closeBracket)
                        const url = text.slice(closeBracket + 2, closeParens)
                        tokens.push({
                            type: "link",
                            content: tokenizeInline(linkText),
                            url,
                        })
                        i = closeParens + 1
                        continue
                    }
                }
            }

            // Check for markdown patterns
            const patterns = [
                { marker: "**" as const, type: "bold" as const },
                { marker: "__" as const, type: "underline" as const },
                { marker: "~~" as const, type: "strikethrough" as const },
                { marker: "_" as const, type: "italic" as const },
                { marker: "`" as const, type: "monospace" as const}
            ]

            let matched = false
            for (const { marker, type } of patterns) {
                if (text.startsWith(marker, i)) {
                    const closeIndex = findClosingMarker(marker, i + marker.length)
                    if (closeIndex !== -1) {
                        pushText()
                        const innerContent = text.slice(i + marker.length, closeIndex)
                        if (type === "monospace") {
                            tokens.push({
                                type: "monospace",
                                content: innerContent,
                            })
                        } else {
                            tokens.push({
                                type,
                                content: tokenizeInline(innerContent),
                            })
                        }
                        i = closeIndex + marker.length
                        matched = true
                        break
                    }
                }
            }

            if (!matched) {
                currentText += text[i]
                i++
            }
        }

        pushText()
        return tokens
    }

    const parseBlocks = (text: string): Block[] => {
        const lines = text.split("\n")
        const blocks: Block[] = []

        let currentListItems: Array<{ content: Token[]; level: number; type: ListType }> = []
        let inSpoiler = false
        let spoilerContent: string[] = []

        const finishCurrentList = () => {
            if (currentListItems.length > 0) {
                const hierarchicalItems = buildListHierarchy(currentListItems)

                // Group by top-level list type for rendering
                let currentGroup: ListItem[] = []
                let currentGroupType: ListType | null = null

                for (const item of hierarchicalItems) {
                    if (currentGroupType === null || currentGroupType === item.type) {
                        currentGroupType = item.type
                        currentGroup.push(item)
                    } else {
                        // Type changed, finish current group and start new one
                        blocks.push({
                            type: currentGroupType === "ordered" ? "orderedList" : "unorderedList",
                            content: [],
                            items: currentGroup,
                        })
                        currentGroup = [item]
                        currentGroupType = item.type
                    }
                }

                // Add the final group
                if (currentGroup.length > 0 && currentGroupType) {
                    blocks.push({
                        type: currentGroupType === "ordered" ? "orderedList" : "unorderedList",
                        content: [],
                        items: currentGroup,
                    })
                }

                currentListItems = []
            }
        }

        const buildListHierarchy = (items: Array<{ content: Token[]; level: number; type: ListType }>): ListItem[] => {
            const result: ListItem[] = []
            const stack: ListItem[] = []

            for (const item of items) {
                const listItem: ListItem = {
                    content: item.content,
                    level: item.level,
                    type: item.type,
                    children: [],
                }

                // Find the correct parent based on indentation level
                while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
                    stack.pop()
                }

                if (stack.length === 0) {
                    // Top-level item
                    result.push(listItem)
                } else {
                    // Child item
                    const parent = stack[stack.length - 1]
                    if (!parent.children) parent.children = []
                    parent.children.push(listItem)
                }

                stack.push(listItem)
            }

            return result
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Handle alert blocks
            const alertMatch = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/m)
            console.log(line, alertMatch);
            if (alertMatch) {
                const alertType = alertMatch[1].toLowerCase() as AlertType
                let alertContentLines: string[] = []
                let j = i + 1
                while (j < lines.length && lines[j].trim().startsWith(">")) {
                    alertContentLines.push(lines[j].replace(/^>\s?/, ""))
                    j++
                }
                blocks.push({
                    type: "alert",
                    alertType,
                    content: tokenizeInline(alertContentLines.join("\n")),
                })
                i = j - 1
                continue
            }

            // Handle spoiler tags
            if (line.trim() === "<spoiler>") {
                inSpoiler = true
                spoilerContent = []
                continue
            } else if (line.trim() === "</spoiler>") {
                inSpoiler = false
                // Parse the collected spoiler content as markdown
                const spoilerText = spoilerContent.join("\n")
                blocks.push({
                    type: "paragraph",
                    content: [{ type: "spoiler", content: tokenizeInline(spoilerText) }],
                })
                continue
            }

            if (inSpoiler) {
                spoilerContent.push(line)
                continue
            }

            // Check for unordered list item (- or * followed by space, with optional indentation)
            const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)$/)
            if (unorderedMatch) {
                const indentation = unorderedMatch[1]
                const content = unorderedMatch[2]
                const level = Math.floor(indentation.length / 2) // 2 spaces = 1 level

                currentListItems.push({
                    content: tokenizeInline(content),
                    level,
                    type: "unordered",
                })
                continue
            }

            // Check for ordered list item (number followed by . and space, with optional indentation)
            const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)
            if (orderedMatch) {
                const indentation = orderedMatch[1]
                const content = orderedMatch[2]
                const level = Math.floor(indentation.length / 2) // 2 spaces = 1 level

                currentListItems.push({
                    content: tokenizeInline(content),
                    level,
                    type: "ordered",
                })
                continue
            }

            // If we reach here, we're not in a list item
            // Finish any current list
            finishCurrentList()

            // Check for heading
            const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
            if (headingMatch) {
                const level = headingMatch[1].length
                const content = headingMatch[2]
                blocks.push({
                    type: "heading",
                    level,
                    content: tokenizeInline(content),
                })
            } else if (line.trim() === "---") {
                // Horizontal rule
                blocks.push({
                    type: "horizontalRule",
                    content: [],
                })
            } else if (line.trim()) {
                // Non-empty line - treat as paragraph
                blocks.push({
                    type: "paragraph",
                    content: tokenizeInline(line),
                })
            } else {
                // Empty line - add empty paragraph to preserve spacing
                blocks.push({
                    type: "paragraph",
                    content: [{ type: "text", content: "" }],
                })
            }
        }

        // Finish any remaining list
        finishCurrentList()

        return blocks
    }

    const renderContent = (content: string | Token[]): React.ReactNode => {
        if (((c): c is string => typeof c === "string")(content)) {
            let processedContent = content.split("🏳️‍🇱‍🇴‍🇱‍‍").map((part, i, arr) =>
                i < arr.length - 1
                    ? [part, (
                        <img
                            key={i}
                            draggable="false"
                            className="emoji"
                            alt="🏳️‍🇱‍🇴‍🇱‍‍"
                            src={process.env.PUBLIC_URL + "/twemoji/svg/1f3f3-fe0f-200d-1f1ed-200d-1f1f4-200d-1f1ed-200d.svg"}
                        />
                    )]
                    : part
            );
            return <Twemoji noWrapper options={{
                folder: 'svg',
                ext: '.svg',
            }}><span className="[&>.emoji]:inline [&>.emoji]:size-[calc(4em/3)] [&>.emoji]:mx-[0.125em] [&>.emoji]:mt-[-0.225em]">{processedContent}</span></Twemoji>
        }
        return renderTokens(content)
    }

    const renderTokens = (tokens: Token[]): React.ReactNode => {
        return (
            <React.Fragment>
                {tokens.map((token, index) => {
                    switch (token.type) {
                        case "text":
                            return <React.Fragment key={index}>{renderContent(token.content)}</React.Fragment>
                        case "bold":
                            return <strong key={index}>{renderContent(token.content)}</strong>
                        case "italic":
                            return <em key={index}>{renderContent(token.content)}</em>
                        case "strikethrough":
                            return <del key={index}>{renderContent(token.content)}</del>
                        case "underline":
                            return <u key={index}>{renderContent(token.content)}</u>
                        case "monospace":
                            return <code key={index} className="px-1 py-0.5 dark:bg-night bg-fullMoon text-notQuiteBlack dark:text-notQuiteWhite rounded-md border border-solid dark:border-fullMoon/25 border-night/25">{token.content}</code>
                        case "link":
                            return (
                                <a
                                    key={index}
                                    href={token.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 dark:text-blue-400 hover:underline m-0"
                                >
                                    {renderContent(token.content)}
                                </a>
                            )
                        case "image":
                            return (
                                <div key={index} className="flex flex-col items-center my-4">
                                    <img
                                        src={
                                            mediaMap?.[token.url]
                                                ? `local://${mediaMap[token.url].replace("%USERDATA%", "CONST_USERDATA")}`
                                                : token.url?.startsWith("http")
                                                    ? token.url
                                                    : `local://${token.url}`
                                        }
                                        alt={token.alt || ""}
                                        className="max-w-full h-auto max-h-[66vh] rounded-lg shadow-lg"
                                    />
                                    {token.alt && (
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 text-center">
                                            {token.alt}
                                        </p>
                                    )}
                                </div>
                            )
                        case "spoiler":
                            console.log(token);
                            return (
                                <Spoiler key={index} className="my-4">
                                    {renderTokens(token.content)}
                                </Spoiler>
                            )
                        default:
                            return null
                    }
                })}
            </React.Fragment>
        )
    }

    const renderListItems = (items: ListItem[]): React.ReactNode => {
        return items.map((item, index) => (
            <li key={index}>
                {renderTokens(item.content)}
                {item.children && item.children.length > 0 && (
                    <div className="mt-1">
                        {item.children.every((child) => child.type === "ordered") ? (
                            <ol className="list-decimal pl-6 space-y-1">{renderListItems(item.children)}</ol>
                        ) : (
                            <ul className="list-disc pl-6 space-y-1">{renderListItems(item.children)}</ul>
                        )}
                    </div>
                )}
            </li>
        ))
    }

    const renderBlock = (block: Block, index: number): React.ReactNode => {
        if (block.type === "heading") {
            const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements
            const headingSizes = {
                1: cn("text-3xl font-bold mb-4 mt-6 border-0 border-solid border-b pb-2 border-neutral-500/70"),
                2: cn("text-2xl font-bold mb-3 mt-5 border-0 border-solid border-b pb-2 border-neutral-500/70"),
                3: cn("text-xl font-bold mb-2 mt-4"),
                4: cn("text-lg font-bold mb-2 mt-3"),
                5: cn("text-base font-bold mb-1 mt-2"),
                6: cn("text-sm font-bold mb-1 mt-2"),
            }

            return (
                <HeadingTag key={index} className={headingSizes[block.level as keyof typeof headingSizes]}>
                    {renderTokens(block.content)}
                </HeadingTag>
            )
        } else if (block.type === "unorderedList") {
            return (
                <ul key={index} className="list-disc pl-6 mb-4 space-y-1">
                    {block.items && renderListItems(block.items)}
                </ul>
            )
        } else if (block.type === "orderedList") {
            return (
                <ol key={index} className="list-decimal pl-6 mb-4 space-y-1">
                    {block.items && renderListItems(block.items)}
                </ol>
            )
        } else if (block.type === "horizontalRule") {
            return <hr key={index} className="my-4 border-0 border-b border-solid border-neutral-500/70" />
        } else if (block.type === "alert") {
            const alertStyles: Record<AlertType, { textColor: string; borderColor: string; icon: React.ReactNode; label: string }> = {
                note:      { borderColor: "border-blue-500/50", textColor: "text-blue-500", icon: (<Info />), label: "Note" },
                tip:       { borderColor: "border-green-600/50", textColor: "text-green-600", icon: (<Lightbulb />), label: "Tip" },
                important: { borderColor: "border-purple-600/50", textColor: "text-purple-600", icon: (<MessageSquareWarning />), label: "Important" },
                warning:   { borderColor: "border-yellow-600/50", textColor: "text-yellow-600", icon: (<TriangleAlert />), label: "Warning" },
                caution:   { borderColor: "border-red-600/50", textColor: "text-red-600", icon: (<OctagonAlert />), label: "Caution" },
            }
            const { borderColor, textColor, icon, label } = alertStyles[block.alertType!]
            return (
                <div
                    key={index}
                    className={cn("my-4 px-4 py-2 border-0 border-l-4 border-solid flex items-start gap-3 w-fit", borderColor)}
                    role="alert"
                    aria-label={label}
                >
                    <span className={cn("text-2xl mt-0.5", textColor)}>{icon}</span>
                    <div>
                        <div className={cn("font-bold mb-1 -mt-0.5 text-lg", textColor)}>{label}</div>
                        <div className="text-sm -mt-0.5">{renderTokens(block.content)}</div>
                    </div>
                </div>
            )
        } else {
            // Paragraph
            const isEmpty = block.content.length === 1 && block.content[0].type === "text" && block.content[0].content === ""

            if (isEmpty) {
                return <></> /*<br key={index} />*/
            }

            return (
                <p key={index} className="mb-2">
                    {renderTokens(block.content)}
                </p>
            )
        }
    }

    const blocks = parseBlocks(children)

    return (
        <div className={cn("whitespace-pre-wrap", className)}>
            {blocks.map((block, index) => renderBlock(block, index))}
        </div>
    )
}

export default MarkdownText;