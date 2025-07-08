from contextlib import contextmanager
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, BinaryIO, Iterator, TextIO

from ipywidgets.embed import embed_minimal_html  # type: ignore

from .. import Component


def write_html(
    fp: str | Path | TextIO, component: Component, title: str = "Plot"
) -> None:
    """Export a plot or table to HTML.

    Args:
       fp: Filename or file-like object
       component: Compontent to export.
       title: Title for HTML page (defaults to "Plot")
    """
    component._mimebundle(collect=False)
    embed_minimal_html(fp, views=[component], title=title, drop_defaults=False)


def write_png(fp: str | Path | BinaryIO, component: Component) -> None:
    """Export a plot or table to a PNG.

    Args:
       fp: Filename or file-like object.
       component: Component to export.
    """
    with tempfile.NamedTemporaryFile("w", suffix=".html") as temp_file:
        # write the component as HTML
        write_html(temp_file.name, component=component)

        # try to launch the browser
        with _with_browser() as b:
            from playwright.sync_api import Browser

            if isinstance(b, Browser):
                page = b.new_page()
                file_uri = Path(temp_file.name).resolve().as_uri()
                page.goto(file_uri, wait_until="networkidle")


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
