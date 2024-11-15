"use client";

import { ScrollArea } from "~/components/ui/scroll-area";
import { Toggle } from "~/components/ui/toggle";
import { Indent, WrapText } from "lucide-react";
import { HttpMessageRenderer } from "../shared/HttpMessageRenderer";
import type { ContentPanelProps } from "~/types/session";
import { decodeBase64 } from "~/lib/burpParser";
import { ContentContextMenu } from "../shared/ContentContextMenu";
import { useMessageFormatter } from "~/hooks/session/useMessageFormatter";

import { useToast } from "~/hooks/use-toast";
import { useEffect, useState } from "react";

export function ContentPanel({
    item,
    type,
    wrap,
    setWrap,
    prettify,
    setPrettify,
}: ContentPanelProps) {
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const content = item?.[type] || { value: "", base64: false };
    const { formatMessage } = useMessageFormatter();
    const decodedContent = content.base64
        ? decodeBase64(content.value)
        : content.value;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const copyTextToClipboard = async (text: string): Promise<void> => {
        if (!isMounted) return;

        try {
            // First try the modern clipboard API
            if (window?.navigator?.clipboard) {
                await window.navigator.clipboard.writeText(text);
                return;
            }

            // Fallback to execCommand
            const textArea = document.createElement("textarea");
            textArea.value = text;

            // Avoid scrolling to bottom
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";

            document.body.appendChild(textArea);
            textArea.select();

            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);

            if (!successful) {
                throw new Error("Failed to copy text");
            }
        } catch (err) {
            console.error("Copy failed:", err);
            throw err;
        }
    };

    const handleCopy = {
        raw: async () => {
            try {
                await copyTextToClipboard(decodedContent);
                toast({
                    description: "Copied raw content to clipboard",
                    duration: 2000,
                });
            } catch (err) {
                console.error("Failed to copy raw content:", err);
                toast({
                    description: "Failed to copy to clipboard",
                    variant: "destructive",
                    duration: 2000,
                });
            }
        },
        headers: async () => {
            try {
                const { headers } = formatMessage(decodedContent, {
                    wrap: false,
                    prettify: false,
                });
                const headerLines = headers.split("\n");
                const justHeaders = headerLines.slice(1).join("\n").trim();
                await copyTextToClipboard(justHeaders);
                toast({
                    description: "Copied headers to clipboard",
                    duration: 2000,
                });
            } catch (err) {
                console.error("Failed to copy headers:", err);
                toast({
                    description: "Failed to copy to clipboard",
                    variant: "destructive",
                    duration: 2000,
                });
            }
        },
        cookies: async () => {
            try {
                const { headers } = formatMessage(decodedContent, {
                    wrap: false,
                    prettify: false,
                });
                const cookieLines = headers
                    .split("\n")
                    .filter((line) => line.toLowerCase().startsWith("cookie:"))
                    .join("\n");
                await copyTextToClipboard(cookieLines);
                toast({
                    description: "Copied cookies to clipboard",
                    duration: 2000,
                });
            } catch (err) {
                console.error("Failed to copy cookies:", err);
                toast({
                    description: "Failed to copy to clipboard",
                    variant: "destructive",
                    duration: 2000,
                });
            }
        },
        payload: async () => {
            try {
                const { body } = formatMessage(decodedContent, {
                    wrap: false,
                    prettify,
                });
                await copyTextToClipboard(body);
                toast({
                    description: "Copied payload to clipboard",
                    duration: 2000,
                });
            } catch (err) {
                console.error("Failed to copy payload:", err);
                toast({
                    description: "Failed to copy to clipboard",
                    variant: "destructive",
                    duration: 2000,
                });
            }
        },
    };

    // Don't attempt to render until mounted
    if (!isMounted) {
        return null; // or a loading state
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 isolate">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                </h3>
                <div className="flex gap-2">
                    <Toggle
                        pressed={wrap}
                        onPressedChange={setWrap}
                        size="sm"
                        aria-label="Toggle word wrap"
                    >
                        <WrapText className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        pressed={prettify}
                        onPressedChange={setPrettify}
                        size="sm"
                        aria-label="Toggle JSON format"
                    >
                        <Indent className="h-4 w-4" />
                    </Toggle>
                </div>
            </div>
            <ContentContextMenu onCopy={handleCopy}>
                <ScrollArea
                    className="flex-grow border rounded-md bg-background"
                    style={{ isolation: "isolate" }}
                >
                    <HttpMessageRenderer
                        content={decodedContent}
                        wrap={wrap}
                        prettify={prettify}
                        type={type}
                    />
                </ScrollArea>
            </ContentContextMenu>
        </div>
    );
}
