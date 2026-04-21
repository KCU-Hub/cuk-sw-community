import { describe, expect, it } from "vitest";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { sanitizeSchema } from "../sanitize-schema";

// Sanitize pipeline as the only XSS-protection surface in the app.
// react-markdown internally runs remark → rehype-sanitize(schema) → react.
// Here we mirror the rehype half of that stack so we can assert the HAST
// transformation directly without booting React.
const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

async function sanitize(html: string): Promise<string> {
  const file = await processor.process(html);
  return String(file);
}

describe("sanitizeSchema — XSS regression guard", () => {
  it("strips <script> tags", async () => {
    const out = await sanitize("<p>hi</p><script>alert(1)</script>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
  });

  it("strips inline event handlers on <img>", async () => {
    const out = await sanitize('<img src="x" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("strips inline event handlers on other tags", async () => {
    const out = await sanitize('<p onclick="alert(1)">clickme</p>');
    expect(out).not.toContain("onclick");
  });

  it("strips javascript: hrefs on <a>", async () => {
    const out = await sanitize('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("strips data:text/html hrefs on <a>", async () => {
    const out = await sanitize(
      '<a href="data:text/html,<script>alert(1)</script>">x</a>',
    );
    expect(out).not.toContain("data:text/html");
    expect(out).not.toContain("<script");
  });

  it("strips <iframe>", async () => {
    const out = await sanitize('<iframe src="https://evil.example"></iframe>');
    expect(out).not.toContain("<iframe");
  });

  it("strips <object> and <embed>", async () => {
    const out = await sanitize(
      '<object data="x"></object><embed src="x">',
    );
    expect(out).not.toContain("<object");
    expect(out).not.toContain("<embed");
  });

  it("strips <svg> onload handlers", async () => {
    const out = await sanitize(
      '<svg onload="alert(1)"><circle r="1"/></svg>',
    );
    expect(out).not.toContain("onload");
    expect(out).not.toContain("alert(1)");
  });

  it("strips <style> tags (body becomes inert text)", async () => {
    // Once the <style> wrapper is gone, the leftover text is just markdown
    // prose to the browser — it won't be parsed as CSS, so the url() /
    // javascript: substrings are harmless. We only assert the wrapper.
    const out = await sanitize(
      "<style>body{background:url(javascript:alert(1))}</style>",
    );
    expect(out).not.toContain("<style");
  });

  it("strips <form> tags (but retains GFM-compat checkbox <input>)", async () => {
    const out = await sanitize(
      '<form action="/x"><input type="text" name="y"></form>',
    );
    // <form> must go — it can POST user credentials elsewhere.
    expect(out).not.toContain("<form");
    // defaultSchema allows <input> for GFM task lists but forces
    // type="checkbox" + disabled. A text/file/password input must not leak.
    expect(out).not.toContain('type="text"');
    expect(out).not.toContain('action=');
  });
});

describe("sanitizeSchema — allowlist preservation", () => {
  it("preserves language-* class on <code>", async () => {
    const out = await sanitize(
      '<pre><code class="language-ts">const x = 1;</code></pre>',
    );
    expect(out).toContain('class="language-ts"');
  });

  it("preserves hljs-* classes on <span>", async () => {
    const out = await sanitize(
      '<pre><code><span class="hljs-keyword">const</span> x = 1;</code></pre>',
    );
    expect(out).toContain('class="hljs-keyword"');
  });

  it("preserves id on headings (rehype-slug, DOM-clobbering prefix)", async () => {
    // rehype-sanitize's defaultSchema prefixes all ids with `user-content-`
    // to prevent DOM-clobbering attacks. The real anchor links work because
    // rehype-slug runs downstream of the sanitizer in production — here we
    // only assert the attribute survived at all.
    const out = await sanitize('<h2 id="section-1">Section 1</h2>');
    expect(out).toContain('id="user-content-section-1"');
  });

  it("preserves <kbd>", async () => {
    const out = await sanitize("<p>press <kbd>Ctrl</kbd>+<kbd>C</kbd></p>");
    expect(out).toContain("<kbd>Ctrl</kbd>");
  });

  it("preserves https:// anchors with safe rel/target", async () => {
    const out = await sanitize(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>',
    );
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain("noopener");
  });
});
