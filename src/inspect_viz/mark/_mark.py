from typing import Any

from pydantic import JsonValue

from inspect_viz.mark._options import MarkOptions

from .._core.component import Component
from .._util.marshall import snake_to_camel


class Mark(Component):
    """Plot mark (create marks using mark functions, e.g. `dot()`, `bar_x()`, etc.)."""

    def __init__(
        self,
        type: str,
        config: dict[str, JsonValue],
        options: MarkOptions,
        defaults: MarkOptions | None = None,
    ) -> None:
        # resolve options against defaults
        resolved_options: dict[str, Any] = mark_options_to_camel(
            defaults or {}
        ) | mark_options_to_camel(options)

        # set line_width for tip if necessary
        INFINITE_LINE = 1000000000
        tip = resolved_options.get("tip")
        if tip is True:
            resolved_options["tip"] = {"lineWidth": INFINITE_LINE}
        elif isinstance(tip, dict):
            tip["lineWidth"] = INFINITE_LINE

        super().__init__({"mark": type} | config | resolved_options)


def mark_options_to_camel(options: MarkOptions) -> dict[str, Any]:
    mark_options = {snake_to_camel(key): value for key, value in options.items()}
    if "tip" in mark_options and isinstance(mark_options["tip"], dict):
        mark_options["tip"] = {
            snake_to_camel(key): value for key, value in mark_options["tip"].items()
        }
    return mark_options
