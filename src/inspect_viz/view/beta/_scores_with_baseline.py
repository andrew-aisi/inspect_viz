from typing import Literal, NotRequired, TypedDict, Unpack, cast

from inspect_viz._core.component import Component
from inspect_viz._core.data import Data
from inspect_viz._util.channels import resolve_log_viewer_channel
from inspect_viz._util.notgiven import NotGiven
from inspect_viz.mark._bar import bar_x
from inspect_viz.mark._rule import rule_x
from inspect_viz.mark._text import text
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.plot._plot import plot


class Baseline(TypedDict):
    """A baseline is a reference line that can be used to highlight important thresholds (for example, expert human performance)."""

    label: str
    """The display text that appears alongside the baseline line."""

    value: int | float
    """The numeric value where the baseline will be positioned on the chart's scale."""

    color: NotRequired[str | None]
    """The color of the baseline line and label. Can be any valid CSS color value (hex, rgb, named colors, etc.). If None, defaults to black."""

    width: NotRequired[int | float | None]
    """The thickness of the baseline line in pixels. Defaults to 1."""

    dasharray: NotRequired[str | None]
    """SVG dash pattern for the line (e.g., "5,5" for dashed line, "2,3,5,3" for dash-dot pattern). Defaults to "2,4" (a dashed line)."""

    position: NotRequired[Literal["top", "bottom"] | None]
    """Controls where the label text appears relative to the baseline line. "top" places the label above the line, "bottom" places it below. Defaults to the "top" position."""


def scores_with_baseline(
    data: Data,
    *,
    x: str = "score_headline_value",
    y: str = "model_display_name",
    width: float | None = None,
    height: float | None = None,
    baseline: int | float | Baseline | list[Baseline] | None = None,
    sort: Literal["asc", "desc"] | None = None,
    x_label: str | None | NotGiven = None,
    y_label: str | None | NotGiven = None,
    fill: str | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """Bar plot for comparing the scores of different models on a single evaluation.

    Summarize eval scores using a bar plot. By default, scores (`y`) are plotted by "task_name" (`fx`) and "model" (`x`). By default, confidence intervals are also plotted (disable this with `y_ci=False`).

    Args:
       data: Evals data table. This is typically created using a data frame read with the inspect `evals_df()` function.
       x: Name of field for x axis (defaults to "score_headline_value").
       y: Name of field for x axis (defaults to "model_display_name")
       width: The outer width of the plot in pixels, including margins. Defaults to 700.
       height: The outer height of the plot in pixels, including margins. The default is width / 1.618 (the [golden ratio](https://en.wikipedia.org/wiki/Golden_ratio))
       baseline: Baseline value or values to draw on the plot. This can be a single value, a Baseline dictionary, or a list of Baseline dictionaries. If None, no baseline is drawn.
       sort: Sort order for the bars (sorts using the 'x' value). Can be "asc" or "desc". Defaults to "asc".
       x_label: x-axis label (defaults to None).
       y_label: x-axis label (defaults to None).
       fill: The fill color for the bars. Defaults to "#416AD0". Pass any valid css color value (hex, rgb, named colors, etc.).
       **attributes: Additional `PlotAttributes`. By default, the `y_inset_top` and `margin_bottom` are set to 10 pixels and `x_ticks` is set to `[]`.
    """
    # Resolve the y column
    margin_left = None
    if y == "model_display_name":
        margin_left = 120
        if "model_display_name" not in data.columns:
            # fallback to using the raw model string
            y = "model"
            margin_left = 210

    # Validate that there is only a single evaluation
    tasks = data.column_unique("task_name")
    if len(tasks) > 1:
        raise ValueError(
            "scores_with_baseline can only be used with a single evaluation. "
            f"Found {len(tasks)} tasks: {', '.join(tasks)}."
        )

    # Normalize baseline to a list if it isn't already
    resolved_baselines = resolve_baseline(baseline)

    # apply margins based upon the baselines
    top_margin = (
        30
        if any(baseline.get("position") != "bottom" for baseline in resolved_baselines)
        else None
    )
    bottom_margin = (
        30
        if any(baseline.get("position") == "bottom" for baseline in resolved_baselines)
        else None
    )

    # compute the x_domain, setting it to 0 to 1 if the values are all
    # within that range
    max_score = data.column_max(x)
    min_score = data.column_min(x)
    if max_score <= 1 and min_score >= 0:
        x_domain = [0, 1.0]
    else:
        x_domain = None

    # Resolve default values
    defaultAttributes = PlotAttributes(
        x_domain=x_domain,
        margin_left=margin_left,
        margin_top=top_margin,
        margin_bottom=bottom_margin,
        color_domain=[1],
    )
    attributes = defaultAttributes | attributes

    # channels
    channels: dict[str, str] = {}
    if (y == "model" or y == "model_display_name") and y_label is None:
        channels["Model"] = y
    if x == "score_headline_value" and x_label is None:
        channels["Score"] = x
    resolve_log_viewer_channel(data, channels)

    # The plots
    return plot(
        bar_x(
            data,
            x=x,
            y=y,
            sort={"y": "x", "reverse": sort != "asc"},
            tip=True,
            channels=channels,
            fill=fill or "#416AD0",
        ),
        *baseline_marks(resolved_baselines),
        y_label=y_label,
        x_label=x_label,
        height=height,
        width=width,
        **attributes,
    )


def resolve_baseline(
    baseline: int | float | Baseline | list[Baseline] | None,
) -> list[Baseline]:
    """Resolve the baseline to a list of Baseline dictionaries."""
    if baseline is not None:
        if not isinstance(baseline, list):
            if isinstance(baseline, (int, float)):
                return [Baseline(label="Baseline", value=baseline)]
            elif isinstance(baseline, dict):
                return [baseline]
            else:
                raise ValueError(
                    "Baseline must be an int, float, dict, or list of dicts."
                )
        else:
            return baseline
    else:
        return []


def baseline_marks(baselines: list[Baseline]) -> list[Component]:
    """Generate baseline marks from a list of Baseline dictionaries."""
    # Prepare the baseline marks
    components = []
    for baseline in baselines:
        baseline_value = [baseline["value"]]
        baseline_text: list[str] = [str(baseline["label"])]
        baseline_color = baseline.get("color") or "#000000"
        baseline_width = baseline.get("width") or 1
        baseline_dasharray = baseline.get("dasharray") or "2,4"

        frame_anchor = cast(
            Literal["top", "bottom"],
            "top" if baseline.get("position") != "bottom" else "bottom",
        )
        line_anchor = cast(
            Literal["top", "bottom"],
            "bottom" if baseline.get("position") != "bottom" else "top",
        )
        dy = -3 if baseline.get("position") != "bottom" else 3

        line = rule_x(
            x=baseline_value,
            stroke=baseline_color,
            stroke_dasharray=baseline_dasharray,
            stroke_width=baseline_width,
        )

        label = text(
            x=baseline_value,
            frame_anchor=frame_anchor,
            line_anchor=line_anchor,
            dy=dy,
            text=baseline_text,
            fill=baseline_color,
        )
        components.append(line)
        components.append(label)
    return components
