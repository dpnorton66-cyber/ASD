#!/usr/bin/env python3
"""Build standalone browser pages from the design-canvas source artboards.

The files in source/ are authored for a design canvas: each wraps its markup in
<x-dc>, puts page-level CSS in a <helmet> block, and keeps its logic in a
<script type="text/x-dc"> block holding a Component class. This script unwraps
them into ordinary HTML pages that load dc-lite.js, which implements the three
template primitives the markup relies on.

Run from this directory:  python3 build.py
"""

import json
import pathlib
import re

HERE = pathlib.Path(__file__).parent
SOURCE = HERE / "source"

# Artboard file -> published page name.
PAGES = {
    "Main.dc.html": "index.html",
    "Zone.dc.html": "zone.html",
    "Patient.dc.html": "patient.html",
    "Patterns.dc.html": "patterns.html",
    "Handheld.dc.html": "handheld.html",
}

# The handheld screen is a fixed 390x844 device frame; centre it on a full page.
EXTRA_CSS = {
    "handheld.html": "#dc-root { display: flex; justify-content: center; padding: 24px 16px; }"
}

PAGE_TEMPLATE = """<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{helmet}{extra}
</head>
<body>
<div id="dc-root">{body}</div>
<script src="dc-lite.js"></script>
<script>
{logic}
window.__dcProps = {props};
window.__dcBoot();
</script>
</body>
</html>
"""


def grab(pattern, text, label, path):
    match = re.search(pattern, text, re.S)
    if not match:
        raise SystemExit("{}: could not find {}".format(path.name, label))
    return match


def prop_defaults(raw_attr):
    """Turn the data-props attribute into the plain defaults object."""
    decoded = raw_attr.replace("&amp;", "&").replace("&#39;", "'").replace("&quot;", '"')
    spec = json.loads(decoded)
    return {k: v.get("default") for k, v in spec.items() if not k.startswith("$")}


def build_one(path):
    text = path.read_text(encoding="utf-8")

    lang = grab(r'<html lang="([^"]+)"', text, "html lang", path).group(1)
    title = grab(r"<title>(.*?)</title>", text, "title", path).group(1)
    helmet = grab(r"<helmet>(.*?)</helmet>", text, "helmet block", path).group(1).strip()
    shell = grab(r"<x-dc>(.*?)</x-dc>", text, "x-dc block", path).group(1)
    script = grab(
        r"<script type=\"text/x-dc\" data-dc-script data-props='(.*?)'>(.*?)</script>",
        text,
        "logic block",
        path,
    )

    body = re.sub(r"<helmet>.*?</helmet>", "", shell, flags=re.S).strip()

    # Inline event attributes would be parsed as JavaScript by the browser, so
    # move them out of the way for dc-lite to pick up.
    body = re.sub(r"\bon([A-Z][A-Za-z]*)=\"", lambda m: 'data-on-{}="'.format(m.group(1).lower()), body)

    # The plan image is an artifact asset in the canvas; here it is a repo file.
    body = re.sub(r'src="/_blob/[0-9a-f]+"', 'src="ward-plan.png"', body)

    # Point cross-screen links at the published page names.
    for artboard, page in PAGES.items():
        body = body.replace('href="{}"'.format(artboard), 'href="{}"'.format(page))

    out_name = PAGES[path.name]
    extra = EXTRA_CSS.get(out_name)
    extra_block = "\n<style>\n{}\n</style>".format(extra) if extra else ""

    page = PAGE_TEMPLATE.format(
        lang=lang,
        title=title,
        helmet=helmet,
        extra=extra_block,
        body=body,
        logic=script.group(2).strip(),
        props=json.dumps(prop_defaults(script.group(1))),
    )
    (HERE / out_name).write_text(page, encoding="utf-8")
    return out_name, len(page)


def main():
    if not SOURCE.is_dir():
        raise SystemExit("source/ not found next to build.py")
    for artboard in PAGES:
        path = SOURCE / artboard
        if not path.exists():
            raise SystemExit("missing source file: {}".format(path))
        name, size = build_one(path)
        print("built {:<16} {:>7,} bytes".format(name, size))


if __name__ == "__main__":
    main()
