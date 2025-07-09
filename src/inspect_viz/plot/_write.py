import subprocess
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from ipywidgets.embed import embed_minimal_html  # type: ignore
from PIL import Image, ImageChops, ImageOps

from .. import Component


def write_html(file: str | Path, component: Component, title: str = "Plot") -> None:
    """Export a plot or table to HTML.

    Args:
       file: Target filename.
       component: Compontent to export.
       title: Title for HTML page (defaults to "Plot")
    """
    component._mimebundle(collect=False)
    embed_minimal_html(file, views=[component], title=title, drop_defaults=False)


# TODO: better waiting
# TODO: notebook compatibility


def write_png(file: str | Path, component: Component) -> None:
    """Export a plot or table to a PNG.

    Args:
       file: Target filename.
       component: Component to export.
    """
    PAD = 8  # padding in *device* pixels
    SCALE = 2  # 2 → “Retina”; 3 for iPhone 14 Pro, etc.

    with tempfile.NamedTemporaryFile("w", suffix=".html") as temp_file:
        # write the component as HTML
        write_html(temp_file.name, component=component)

        # try to launch the browser
        with _with_browser() as b:
            from playwright.sync_api import Browser

            if isinstance(b, Browser):
                ctx = b.new_context(device_scale_factor=SCALE)
                page = ctx.new_page()
                file_uri = Path(temp_file.name).resolve().as_uri()
                page.goto(file_uri, wait_until="networkidle")
                w = page.evaluate("document.documentElement.scrollWidth")
                h = page.evaluate("document.documentElement.scrollHeight")
                page.set_viewport_size({"width": w, "height": h})
                page.screenshot(path=file, scale="device")
                b.close()
                _crop_image(file, PAD, SCALE)


@contextmanager
def _with_browser() -> Iterator[Any | None]:
    # ensure we have playwright
    try:
        from playwright.sync_api import Error, sync_playwright
    except ImportError:
        sys.stderr.write(
            "ERROR: The write_png() function requires the playwright package. Install with:\n\npip install playwright\n\n"
        )
        yield None

    # try to launch the browser
    with sync_playwright() as p:
        try:
            yield p.chromium.launch(headless=True)
        except Error as e:
            if "Executable doesn't exist" in str(e) and sys.stdin.isatty():
                if _confirm_install():
                    _install()
                    print(
                        "Playwright installed. Please try the write_png() function again."
                    )
                yield None
            else:
                raise e


def _confirm_install() -> bool:
    prompt = "Playwright can’t find Chromium, which is required for writing PNG files. Install it now? [Y/n] "
    try:
        reply = input(prompt).strip().lower()
        return reply in {"", "y", "yes"}
    except EOFError:  # e.g. piped stdin
        return False


def _install() -> None:
    """Run the idempotent CLI installer (cheap when up-to-date)."""
    subprocess.run(["playwright", "install", "chromium"], check=True)


def _crop_image(file: str | Path, pad: int, scale: int) -> None:
    # open image
    img = Image.open(file)

    # build an image filled with the background colour of the top-left pixel
    bg_color = img.getpixel((0, 0))
    bg = Image.new(img.mode, img.size, bg_color)

    # compute difference and locate the bounding box of non-bg pixels
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()  # returns (left, upper, right, lower) or None

    if bbox:
        img_cropped = img.crop(bbox)
        img_cropped = ImageOps.expand(img_cropped, border=pad * scale, fill=bg_color)
        img.close()
        img_cropped.save(file, dpi=(scale * 72, scale * 72))
    else:
        img.close()
