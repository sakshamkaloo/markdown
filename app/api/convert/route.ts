import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const { url, headings, codeBlocks } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const docId = extractDocId(url);
    if (!docId) {
      return NextResponse.json(
        { error: "Invalid Google Docs URL. Make sure it contains /document/d/..." },
        { status: 400 }
      );
    }

    const tabMatch = url.match(/[?&]tab=(t\.\d+)/);
    const tabParam = tabMatch ? `&tab=${tabMatch[1]}` : "";
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html${tabParam}`;

    const response = await fetch(exportUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; gdoc2md/1.0)",
      },
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        return NextResponse.json(
          { error: "Cannot access document. Make sure it is shared publicly (Anyone with the link)." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch document (HTTP ${response.status})` },
        { status: response.status }
      );
    }

    const html = await response.text();

    if (html.includes("accounts.google.com") || html.includes("ServiceLogin")) {
      return NextResponse.json(
        { error: "Cannot access document. Make sure it is shared publicly (Anyone with the link)." },
        { status: 403 }
      );
    }

    const $ = cheerio.load(html);

    $("style, script, meta, link").remove();
    $("[style]").each((_, el) => { $(el).removeAttr("style"); });
    $("[class]").each((_, el) => { $(el).removeAttr("class"); });
    $("[id]").each((_, el) => { $(el).removeAttr("id"); });

    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (src.startsWith("data:")) {
        $(el).remove();
      }
    });

    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.startsWith("https://www.google.com/url")) {
        try {
          const urlParam = new URL(href).searchParams.get("q");
          if (urlParam) $(el).attr("href", urlParam);
        } catch {}
      }
    });

    const cleanHtml = $("body").html() || "";

    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: codeBlocks === "fenced" ? "fenced" : "indented",
      bulletListMarker: "-",
      strongDelimiter: "**",
      emDelimiter: "_",
    });

    td.addRule("tables", {
      filter: ["table"],
      replacement: (_content, node) => {
        const rows = Array.from((node as HTMLElement).querySelectorAll("tr"));
        if (!rows.length) return "";
        const lines: string[] = [];
        rows.forEach((row, i) => {
          const cells = row.querySelectorAll("td, th");
          const cols = Array.from(cells).map((c) =>
            (c.textContent || "").replace(/\n/g, " ").trim()
          );
          lines.push("| " + cols.join(" | ") + " |");
          if (i === 0) {
            lines.push("| " + cols.map(() => "---").join(" | ") + " |");
          }
        });
        return "\n\n" + lines.join("\n") + "\n\n";
      },
    });

    if (headings === "linkable") {
      td.addRule("headings", {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
        replacement: (content, node) => {
          const level = parseInt((node as HTMLElement).tagName[1]);
          const prefix = "#".repeat(level);
          const slug = content
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-");
          return `\n\n${prefix} ${content} {#${slug}}\n\n`;
        },
      });
    }

    let markdown = td.turndown(cleanHtml);
    markdown = markdown.replace(/^#?\s*META DESCRIPTION:.*$/gm, "");
    markdown = markdown.replace(/^#?\s*SHORT SUMMARY:.*$/gm, "");
    markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

    return NextResponse.json({ markdown, docId });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during conversion." },
      { status: 500 }
    );
  }
}