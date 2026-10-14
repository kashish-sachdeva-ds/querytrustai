import os
import subprocess
import markdown

WORKSPACE_DIR = r"d:\Important\00-Projects\QueryTrustAI"
MD_FILE = os.path.join(WORKSPACE_DIR, "docs", "PRD.md")
HTML_FILE = os.path.join(WORKSPACE_DIR, "docs", "prd_print.html")
PDF_FILE = os.path.join(WORKSPACE_DIR, "docs", "QueryTrust_AI_PRD.pdf")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with open(MD_FILE, "r", encoding="utf-8") as f:
    md_content = f.read()

# Convert markdown to HTML with tables, fenced code, and syntax support
html_body = markdown.markdown(
    md_content,
    extensions=['extra', 'tables', 'fenced_code', 'toc']
)

css_styles = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

@page {
    size: letter;
    margin: 16mm 14mm 16mm 14mm;
}

*, *::before, *::after {
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 9.0pt;
    line-height: 1.48;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

/* Document Title Header */
h1:first-of-type {
    font-size: 11pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    color: #4f46e5;
    margin-top: 0;
    margin-bottom: 4px;
    border-bottom: none;
    padding-bottom: 0;
}

h1:nth-of-type(2) {
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.025em;
    margin-top: 2px;
    margin-bottom: 8px;
    border-bottom: none;
    padding-bottom: 0;
    line-height: 1.2;
}

/* Standard Section Headers */
h1 {
    font-size: 13.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 22px;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #cbd5e1;
    page-break-after: avoid;
    break-after: avoid;
}

h2 {
    font-size: 11.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 16px;
    margin-bottom: 8px;
    page-break-after: avoid;
    break-after: avoid;
}

h3 {
    font-size: 10pt;
    font-weight: 600;
    color: #334155;
    margin-top: 12px;
    margin-bottom: 6px;
    page-break-after: avoid;
    break-after: avoid;
}

p {
    margin-top: 0;
    margin-bottom: 7px;
    text-align: justify;
}

strong {
    font-weight: 600;
    color: #0f172a;
}

em {
    color: #475569;
}

ul, ol {
    margin-top: 3px;
    margin-bottom: 8px;
    padding-left: 20px;
}

li {
    margin-bottom: 3px;
}

/* Code & Preformatted Blocks */
code {
    font-family: 'JetBrains Mono', Consolas, "Courier New", monospace;
    font-size: 7.8pt;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid #e2e8f0;
}

pre {
    font-family: 'JetBrains Mono', Consolas, "Courier New", monospace;
    font-size: 6.8pt;
    line-height: 1.38;
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    padding: 8px 10px;
    margin: 8px 0;
    overflow-x: hidden;
    white-space: pre;
    page-break-inside: avoid;
    break-inside: avoid;
}

pre code {
    background-color: transparent;
    padding: 0;
    border: none;
    color: #1e293b;
}

/* Tables */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 8.2pt;
    line-height: 1.35;
    page-break-inside: avoid;
    break-inside: avoid;
}

th, td {
    border: 1px solid #cbd5e1;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
}

th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 600;
    font-size: 8.4pt;
}

tr:nth-child(even) td {
    background-color: #f8fafc;
}

/* Blockquotes / Callouts */
blockquote {
    border-left: 3.5px solid #6366f1;
    background-color: #f8fafc;
    margin: 8px 0;
    padding: 6px 12px;
    color: #334155;
    font-size: 8.6pt;
    border-radius: 0 4px 4px 0;
}

blockquote p:last-child {
    margin-bottom: 0;
}

hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
}
"""

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QueryTrust AI - Product Requirements Document</title>
    <style>
{css_styles}
    </style>
</head>
<body>
    <div class="content-wrapper">
        {html_body}
    </div>
</body>
</html>
"""

with open(HTML_FILE, "w", encoding="utf-8") as f:
    f.write(full_html)

print(f"HTML successfully generated at: {HTML_FILE}")

# Use Chrome headless to print to PDF
cmd = [
    CHROME_PATH,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={PDF_FILE}",
    f"file:///{HTML_FILE.replace(os.sep, '/')}"
]

print("Executing Chrome headless print-to-pdf command...")
result = subprocess.run(cmd, capture_output=True, text=True)
if os.path.exists(PDF_FILE):
    size_bytes = os.path.getsize(PDF_FILE)
    print(f"SUCCESS: PDF regenerated at: {PDF_FILE} ({size_bytes} bytes)")
else:
    print(f"ERROR: PDF file not found at {PDF_FILE}")
