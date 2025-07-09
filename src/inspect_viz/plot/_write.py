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


# TODO: notebook compatibility


def write_png(
    file: str | Path, component: Component, scale: int = 2, padding: int = 8
) -> None:
    """Export a plot or table to a PNG.

    Args:
       file: Target filename.
       component: Component to export.
       scale: Device scale to capture plot at. Use 2 (the default) for retina quality images suitable for high resolution displays or print output)
       padding: Padding (in pixels) around plot.
    """
    with tempfile.NamedTemporaryFile("w", suffix=".html") as temp_file:
        # write the component as HTML
        write_html(temp_file.name, component=component)

        # launch the browser
        with _with_browser() as b:
            from playwright.sync_api import Browser

            # browser can be None if playwright wasn't installed yet
            if not isinstance(b, Browser):
                return

            # create and load page
            ctx = b.new_context(device_scale_factor=scale)
            page = ctx.new_page()
            file_uri = Path(temp_file.name).resolve().as_uri()
            page.goto(file_uri, wait_until="networkidle")
            page.wait_for_function(
                '() => !!window.document.querySelector("svg") || !!window.document.querySelector(".inspect-viz-table")',
                polling=100,
            )

            # eliminate scrolling
            w = page.evaluate("document.documentElement.scrollWidth")
            h = page.evaluate("document.documentElement.scrollHeight")
            page.set_viewport_size({"width": w, "height": h})

            # take screenshot and crop image
            background_color = "white"
            page.screenshot(
                path=file,
                scale="device",
                style="body { background-color: " + background_color + "; }",
            )
            _crop_image(file, padding, scale, background_color)


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
            browser = p.chromium.launch(headless=True)
            try:
                yield browser
            finally:
                browser.close()
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


def _crop_image(file: str | Path, pad: int, scale: int, background_color: str) -> None:
    # open image
    img = Image.open(file)

    # build an image filled with the background colour of the top-left pixel
    bg = Image.new(img.mode, img.size, background_color)

    # compute difference and locate the bounding box of non-bg pixels
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()  # returns (left, upper, right, lower) or None

    if bbox:
        img_cropped = img.crop(bbox)
        img_fill = img.getpixel((0, 0))
        img_cropped = ImageOps.expand(img_cropped, border=pad * scale, fill=img_fill)
        img.close()
        img_cropped.save(file, dpi=(scale * 72, scale * 72))
    else:
        img.close()
