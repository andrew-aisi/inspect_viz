from typing import Literal, TypedDict, Unpack

from inspect_viz._core.component import Component
from inspect_viz._core.data import Data
from inspect_viz._util.channels import resolve_log_viewer_channel
from inspect_viz._util.notgiven import NotGiven
from inspect_viz.mark import cell as cell_mark
from inspect_viz.mark._text import text
from inspect_viz.plot import plot
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.plot._legend import legend as create_legend
from inspect_viz.transform._aggregate import avg

X_DEFAULT = "task_name"
X_CHANNEL_LABEL = "Task"
Y_DEFAULT = "model"
Y_CHANNEL_LABEL = "Model"
FILL_DEFAULT = "score_headline_value"
FILL_CHANNEL_LABEL = "Score"


class LegendOptions(TypedDict, total=False):
    """Legend options."""

    label: str | None
    """The label for the legend. If None, no label is shown."""

    location: Literal["bottom", "left", "right", "top"]
    """The location of the legend relative to the plot. Defaults to "bottom"."""

    width: float
    """The width of the legend in pixels. Defaults to 370."""

    height: float | None
    """The height of the legend in pixels. Defaults to None, which means the height is determined by the content."""

    margin_left: float | None
    """Left margin in pixels. Defaults to None."""

    margin_right: float | None
    """Right margin in pixels. Defaults to None."""

    margin_top: float | None
    """Top margin in pixels. Defaults to None."""

    margin_bottom: float | None
    """Bottom margin in pixels. Defaults to None."""

    tick_size: float | None
    """Size of the ticks in pixels. Defaults to None, which means no ticks are shown."""


class CellOptions(TypedDict, total=False):
    """Cell options for the heatmap."""

    inset: float | None
    """Inset for the cell marks. Defaults to 1 pixel."""

    text: str | None
    """Text color for the cell marks. Defaults to "white". Set to None to disable text."""


def scores_heatmap(
    data: Data,
    x: str = X_DEFAULT,
    y: str = Y_DEFAULT,
    fill: str = FILL_DEFAULT,
    cell: CellOptions | None = None,
    tip: bool = True,
    ascending: bool = True,
    height: float | None = None,
    width: float | None = None,
    x_label: str | None | NotGiven = None,
    y_label: str | None | NotGiven = None,
    legend: LegendOptions | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """
    Creates a heatmap plot of success rate of eval data.

    Args:
       data: Evals data table.
       x: Name of column to use for columns.
       y: Name of column to use for rows.
       fill: Name of the column to use as values to determine cell color.
       cell: Options for the cell marks.
       tip: Whether to show a tooltip with the value when hovering over a cell (defaults to True).
       legend: Options for the legend. Pass None to disable the legend.
       ascending: Sort order for the x and y axes. Defaults to True.
       height: The outer height of the plot in pixels, including margins. The default is width / 1.618 (the [golden ratio](https://en.wikipedia.org/wiki/Golden_ratio)).
       width: The outer width of the plot in pixels, including margins. Defaults to 700.
       x_label: x-axis label (defaults to None).
       y_label: y-axis label (defaults to None).
       **attributes: Additional `PlotAttributes
    """
    # Compute the color domain
    min_value = data.column_min(fill)
    max_value = data.column_max(fill)

    color_domain = [min_value, max_value]
    if min_value >= 0 and max_value <= 1:
        # If the values are all within 0 to 1, set the color
        # domain to that range
        color_domain = [0, 1.0]

    # Resolve default values
    defaultAttributes = PlotAttributes(
        margin_left=220,
        x_tick_rotate=45,
        margin_bottom=75,
        color_scale="linear",
        padding=0,
        color_scheme="viridis",
        color_domain=color_domain,
    )
    attributes = defaultAttributes | attributes

    # resolve cell options
    default_cell_options = CellOptions(
        inset=1,
        text="white",
    )
    cell = default_cell_options | (cell or {})

    # resolve legend options
    default_legend_options = LegendOptions(
        location="bottom",
    )
    legend = default_legend_options | (legend or {})

    # set special defaults
    if legend["location"] in ["bottom"]:
        if "margin_left" not in legend:
            legend["margin_left"] = 222
        if "width" not in legend:
            legend["width"] = 370

    # resolve the text marks
    components = []
    if cell is not None:
        components.append(
            text(
                data,
                x=x,
                y=y,
                text=fill,
                fill=cell["text"],
                styles={"font_weight": 600},
            )
        )

    # channels
    channels: dict[str, str] = {}
    if x == X_DEFAULT:
        channels[X_CHANNEL_LABEL] = x
    if y == Y_DEFAULT:
        channels[Y_CHANNEL_LABEL] = y
    if fill == FILL_DEFAULT:
        channels[FILL_CHANNEL_LABEL] = fill
    resolve_log_viewer_channel(data, channels)

    heatmap = plot(
        cell_mark(
            data,
            x=x,
            y=y,
            fill=avg(fill),
            tip=tip,
            inset=cell["inset"] if cell else None,
            sort={
                "y": {"value": "fill", "reduce": "sum", "reverse": ascending},
                "x": {"value": "fill", "reduce": "sum", "reverse": not ascending},
            },
            channels=channels,
        ),
        *components,
        legend=(
            create_legend(
                "color",
                **legend if legend is not None else None,
            )
            if legend is not None
            else None
        ),
        width=width,
        height=height,
        x_label=x_label,
        y_label=y_label,
        **attributes,
    )

    return heatmap
