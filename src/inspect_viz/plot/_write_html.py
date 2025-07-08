from pathlib import Path
from typing import TextIO

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
