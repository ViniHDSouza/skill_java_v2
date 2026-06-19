---
name: html-to-md
description: Converts HTML and HTM files to clean, well-structured Markdown (.md). Use when converting HTML documentation to Markdown, migrating web content to a Markdown-based repository, cleaning up exported HTML pages, or transforming .html/.htm files into readable .md files. Trigger on any request to convert, transform, or migrate HTML to Markdown, even if the user says "convert this page", "turn this HTML into Markdown", or "I need a .md version of this HTML file". Do not use for converting Markdown to HTML, rendering HTML in a browser, parsing XML or XHTML with namespaces, or editing HTML in place.
---

# HTML to Markdown Converter

Converts HTML/HTM files to clean Markdown using a bundled Node.js script with zero external dependencies.

## Bundled Path Rule

Resolve bundled paths relative to the directory that contains this `SKILL.md`.
When invoking a helper from another working directory, expand `<html-to-md-dir>` to that directory first so the command is unambiguous.

## Step 1: Identify Input Files

1. Confirm the input path(s). Accept `.html` or `.htm` extensions.
2. For a single file, verify the file exists and is readable.
3. For batch conversion, identify the directory containing the HTML files.

## Step 2: Run the Conversion Script

The conversion script is a **mutating** helper when writing files (`--output` / `--outdir`), and **read-only** when printing to stdout.

**Single file → stdout** (inspect before writing):
```bash
node <html-to-md-dir>/scripts/html-to-md.mjs <input.html>
```

**Single file → specific .md file:**
```bash
node <html-to-md-dir>/scripts/html-to-md.mjs <input.html> --output <output.md>
```

**Batch: convert all HTML files in a directory:**
```bash
node <html-to-md-dir>/scripts/html-to-md.mjs --batch <source-dir> --outdir <output-dir>
```

## Step 3: Verify Output Quality

1. Read the generated Markdown file(s).
2. Confirm structural elements converted correctly:
   - Headings (`h1`–`h6`) map to `#` through `######`
   - Links preserve text and URL: `[text](url)`
   - Images preserve alt text and src: `![alt](src)`
   - Ordered and unordered lists maintain nesting
   - Tables render as pipe-delimited Markdown tables
   - Fenced code blocks use triple backticks
   - Inline `<code>` wraps with single backticks
   - Bold and italic map to `**bold**` and `*italic*`
   - Blockquotes use `>` prefix
3. Confirm `<script>`, `<style>`, and inline `style` attributes are absent from output.
4. If the output has formatting issues, apply manual edits or re-run with a cleaned source file.

## Step 4: Post-Processing (Optional)

1. If the user needs restructured headings or section removal, apply manual edits to the generated `.md` file.
2. Unrecognized HTML elements pass through to the output — remove them manually if unwanted.

## Supported Elements

| HTML Element            | Markdown Output               |
|-------------------------|-------------------------------|
| `<h1>`–`<h6>`          | `#` through `######`          |
| `<p>`, `<div>`          | Paragraph with blank lines    |
| `<a href="...">`        | `[text](url)`                 |
| `<img src="..." alt>` | `![alt](src)`                 |
| `<strong>`, `<b>`       | `**text**`                    |
| `<em>`, `<i>`           | `*text*`                      |
| `<del>`, `<s>`          | `~~strikethrough~~`           |
| `<ul>`, `<ol>`, `<li>` | `-` or `1.` with nesting      |
| `<table>` / rows        | Pipe-delimited table          |
| `<pre><code>`           | Fenced code block (` ``` `)   |
| `<code>` (inline)       | `` `code` ``                  |
| `<blockquote>`          | `> quoted text`               |
| `<br>`                  | Two trailing spaces + newline |
| `<hr>`                  | `---`                         |
| `<script>`, `<style>`   | Stripped entirely             |

## Error Handling

* If the input file does not exist, the script prints an error to stderr and exits with code 1 — verify the path and retry.
* If the input file contains binary or non-HTML content, the script produces best-effort output with a stderr warning.
* If Node.js is not available, convert manually following the element mapping table above.
* If batch mode finds no `.html`/`.htm` files in the directory, the script prints a warning to stderr and exits with code 0.
