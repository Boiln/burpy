"use client";

import { useEffect, useRef } from "react";
import Prism from "@/lib/prism";

const detectPayloadFormat = (str: string): string => {
    // Remove leading/trailing whitespace
    const trimmed = str.trim();

    // JSON detection - strict check for objects and arrays
    if (/^[{\[][\s\S]*[}\]]$/.test(trimmed)) {
        try {
            JSON.parse(trimmed);
            return "json";
        } catch (e) {}
    }

    // XML detection
    if (
        (/^<\?xml[\s\S]*>[\s\S]*$/.test(trimmed) || // XML declaration
            /^<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z][^>]*>$/.test(trimmed)) && // XML tags
        !/<(script|style|link)\b[^>]*>/.test(trimmed)
    ) {
        // Not HTML
        return "xml";
    }

    // HTML detection
    if (/<(!DOCTYPE|html|body|head|div|script|style)\b[^>]*>/.test(trimmed)) {
        return "markup";
    }

    // YAML detection
    if (/^(---|[\w-]+:\s|[\s-]*-\s+[\w-]+:)/.test(trimmed) && !/^[{\[]/.test(trimmed)) {
        // Not JSON
        return "yaml";
    }

    // JavaScript detection
    if (
        (/^(function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|class\s+\w+\s*{)/.test(
            trimmed
        ) ||
            /^(import|export)\s+/.test(trimmed) ||
            /^module\.exports\s*=/.test(trimmed)) &&
        !trimmed.startsWith("{")
    ) {
        // Not JSON
        return "javascript";
    }

    return "text"; // Default to plain text if no format is detected
};

const formatJSON = (str: string): string => {
    try {
        const obj = JSON.parse(str);
        return JSON.stringify(obj, null, 4);
    } catch (e) {
        return str;
    }
};

const splitPayloads = (body: string): string[] => {
    return body
        .split(/(?=\n\s*[{\[<]|^[{\[<])/gm)
        .map((part) => part.trim())
        .filter(Boolean);
};

const highlightPayload = (payload: string): string => {
    const format = detectPayloadFormat(payload);
    if (!format) return payload;

    try {
        if (format === "json") {
            return Prism.highlight(formatJSON(payload), Prism.languages.json, "json");
        }
        return Prism.highlight(payload, Prism.languages[format], format);
    } catch (e) {
        return payload;
    }
};

export function CodeBlock({ language, value }: { language: string; value: string }) {
    const ref = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (ref.current) {
            // Split the content into headers and body
            const parts = value.split("\r\n\r\n");
            const headers = parts[0];
            const body = parts.slice(1).join("\r\n\r\n");

            // Process headers to make them more compact
            const headerLines = headers.split("\r\n");
            const firstLine = headerLines[0];
            const otherHeaders = headerLines.slice(1);

            // Highlight first line (request/status line)
            const highlightedFirstLine = Prism.highlight(
                firstLine,
                Prism.languages[language],
                language
            );

            // Highlight other headers
            const highlightedHeaders = otherHeaders.length
                ? Prism.highlight(otherHeaders.join("\r\n"), Prism.languages[language], language)
                : "";

            // Process body if present
            let highlightedBody = "";
            if (body) {
                const payloads = splitPayloads(body);
                highlightedBody = payloads.map((payload) => highlightPayload(payload)).join("\n");
            }

            // Combine highlighted parts with proper spacing and structure
            ref.current.innerHTML = `
                <div class="space-y-2">
                    <div class="font-medium">${highlightedFirstLine}</div>
                    ${
                        highlightedHeaders
                            ? `<div class="text-sm text-muted-foreground">${highlightedHeaders}</div>`
                            : ""
                    }
                    ${body ? `<div class="">${highlightedBody}</div>` : ""}
                </div>
            `.trim();
        }
    }, [value, language]);

    return (
        <pre
            className="language-http overflow-auto rounded-md !bg-background/95 p-3 text-sm leading-normal"
            tabIndex={0}
        >
            <code ref={ref} className={`language-${language} block`}>
                {value}
            </code>
        </pre>
    );
}
