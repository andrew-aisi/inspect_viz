from typing import Literal, Unpack

from pandas import DataFrame

from inspect_viz._core.component import Component
from inspect_viz._core.data import Data
from inspect_viz._util.notgiven import NotGiven
from inspect_viz.input._select import select
from inspect_viz.layout._concat import hconcat, vconcat
from inspect_viz.mark import cell
from inspect_viz.mark._channel import Channel
from inspect_viz.mark._text import text
from inspect_viz.plot import plot
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.plot._legend import legend as create_legend
from inspect_viz.transform._aggregate import avg
from inspect_viz.transform._sql import sql

# TODO: value color based upon background color?
# TODO: sorting parameter seems very sketchy
# TODO: center the legend (Add class to plot?)


def scores_heatmap(
    evals: Data,
    x: str = "task_name",
    y: str = "model",
    fill: str = "score_headline_value",
    ascending: bool = True,
    height: float | None = None,
    width: float | None = None,
    x_label: str | None | NotGiven = None,
    y_label: str | None | NotGiven = None,
    legend: Literal["bottom", "left", "right", "top", "none"] = "none",
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """
    Creates a heatmap plot of success rate of eval data.

    Args:
       evals: Evals data table.
       x: Name of column to use for columns.
       y: Name of column to use for rows.
       fill: Name of the column to use as values to determine cell color.
       ascending: Sort order for the x and y axes. Defaults to True.
       height: The outer height of the plot in pixels, including margins. The default is width / 1.618 (the [golden ratio](https://en.wikipedia.org/wiki/Golden_ratio)).
       width: The outer width of the plot in pixels, including margins. Defaults to 700.
       x_label: x-axis label (defaults to None).
       y_label: y-axis label (defaults to None).
       legend: Location of the legend. Can be "bottom", "left", "right", "top", or "none". Defaults to "none".
       **attributes: Additional `PlotAttributes
    """
    # resolve the y value
    resolved_y: Channel = y
    if y == "model":
        resolved_y = sql("split_part(model, '/', 2)")

    # Compute the color domain
    min_value = evals.column_min(fill)
    max_value = evals.column_max(fill)

    color_domain = [min_value, max_value]
    if min_value >= 0 and max_value <= 1:
        # If the values are all within 0 to 1, set the color
        # domain to that range
        color_domain = [0, 1.0]

    # Resolve default values
    defaultAttributes = PlotAttributes(
        margin_left=150,
        x_tick_rotate=45,
        margin_bottom=75,
        color_scale="linear",
        padding=0,
        color_scheme="blues",
        color_domain=color_domain,
    )
    attributes = defaultAttributes | attributes

    heatmap = plot(
        cell(
            evals,
            x=x,
            y=resolved_y,
            fill=avg(fill),
            tip=True,
            inset=1,
            sort={
                "y": {"value": "fill", "reduce": "sum", "reverse": ascending},
                "x": {"value": "fill", "reduce": "sum", "reverse": not ascending},
            },
        ),
        text(
            evals,
            x=x,
            y=resolved_y,
            text=fill,
            fill="black",
            styles={"font_weight": 600},
        ),
        legend=(
            create_legend(
                "color",
                label="Score",
                location=legend,
            )
            if legend != "none"
            else None
        ),
        width=width,
        height=height,
        x_label=x_label,
        y_label=y_label,
        **attributes,
    )

    return vconcat(
        hconcat(
            select(evals, label=x, column=x, multiple=True),
            select(evals, label=y, column=y, multiple=True),
        ),
        heatmap,
    )
