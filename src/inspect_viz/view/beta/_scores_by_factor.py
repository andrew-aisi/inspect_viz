from typing import Unpack

from inspect_viz import Component, Data, Param
from inspect_viz._util.channels import resolve_log_viewer_channel
from inspect_viz._util.color import lighten_color_hsl
from inspect_viz.mark import frame, rule_y
from inspect_viz.plot import PlotAttributes, legend, plot
from inspect_viz.transform import ci_bounds, sql


def scores_by_factor(
    data: Data,
    fx: str,
    fx_labels: tuple[str, str],
    x: str = "score_headline_value",
    x_stderr: str = "score_headline_stderr",
    x_label: str = "Score",
    y: str = "model",
    y_label: str = "Model",
    ci: bool | float = 0.95,
    color: str | tuple[str, str] = "#3266ae",
    width: float | Param | None = None,
    height: float | Param | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """Summarize eval scores with a factor of variation (e.g 'No hint' vs. 'Hint').

    Args:
       data: Evals data table. This is typically created using a data frame read with the inspect `evals_df()` function.
       fx: Field with factor of variation (should be of type boolean).
       fx_labels: Tuple of labels for factor of variation. `False` value should be first, e.g. `("No hint", "Hint")`.
       x: Name of field for x (scoring) axis (defaults to "score_headline_value").
       x_stderr: Name of field for scoring stderr (defaults to "score_headline_stderr").
       x_label: Label for x-axis (defaults to "Score").
       y: Name of field for y axis (defaults to "model").
       y_label: Lable for y axis (defaults to "Model").
       ci: Confidence interval (e.g. 0.80, 0.90, 0.95, etc.). Defaults to 0.95.)
       color: Hex color value (or tuple of two values). If one value is provided the second is computed by lightening the main color.
       width: The outer width of the plot in pixels, including margins. Defaults to 700.
       height: The outer height of the plot in pixels, including margins. Default to 65 pixels for each item on the "y" axis.
       **attributes: Additional `PlotAttributes
    """
    # provide secondary color if necessary
    if isinstance(color, str):
        color = (color, lighten_color_hsl(color, 0.6))

    # compute default height
    if height is None:
        height = 65 * len(data.column_unique(y))

    # validate that we have labels
    if not isinstance(fx_labels, tuple) or len(fx_labels) != 2:
        raise ValueError("fx_labels must be a tuple of 2 strings.")

    # default attributes
    defaults = PlotAttributes(
        margin_left=100,
        y_ticks=[],
        y_tick_size=0,
        fy_axis="left",
        color_domain=fx_labels,
        color_range=color,
    )
    attributes = defaults | attributes

    # build channels
    channels = {y_label: y, x_label: x}
    if ci is not False:
        channels["Stderr"] = x_stderr
    resolve_log_viewer_channel(data, channels)

    # start w/ bars
    components = [
        frame("left", inset_top=5, inset_bottom=5),
        rule_y(
            data,
            x=x,
            y=fx,
            fy=y,
            sort={"fy": "-x"},
            stroke=sql(f"IF(NOT {fx}, '{fx_labels[0]}', '{fx_labels[1]}')"),
            stroke_width=3,
            stroke_linecap="round",
            marker_end="circle",
            tip=True,
            channels={y_label: y, x_label: x, "Stderr": x_stderr},
        ),
    ]

    # add ci
    if ci is not False:
        ci = 0.95 if ci is True else ci
        ci_lower, ci_upper = ci_bounds(ci, score=x, stderr=x_stderr)
        components.append(
            rule_y(
                data,
                x1=ci_lower,
                x2=ci_upper,
                y=fx,
                fy=y,
                sort={"fy": "-x"},
                stroke=f"{color[0]}20",
                stroke_width=15,
            ),
        )

    return plot(
        *components,
        legend=legend("color", target=data.selection),
        x_label=x_label,
        y_label=None,
        fy_label=None,
        width=width,
        height=height,
        **attributes,
    )
