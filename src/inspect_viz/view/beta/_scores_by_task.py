from typing import Unpack

from inspect_viz import Component, Data
from inspect_viz._core.param import Param
from inspect_viz._util.channels import resolve_log_viewer_channel
from inspect_viz._util.notgiven import NOT_GIVEN, NotGiven
from inspect_viz._util.stats import z_score
from inspect_viz.mark import bar_y, rule_x
from inspect_viz.plot import legend, plot
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.transform import sql

X_DEFAULT = "model"
X_CHANNEL_LABEL = "Model"
FX_DEFAULT = "task_name"
FX_CHANNEL_LABEL = "Task"
Y_DEFAULT = "score_headline_value"
Y_CHANNEL_LABEL = "Score"


def scores_by_task(
    data: Data,
    x: str = X_DEFAULT,
    fx: str = FX_DEFAULT,
    y: str = Y_DEFAULT,
    y_stderr: str = "score_headline_stderr",
    y_ci: bool | float = 0.95,
    y_label: str | None | NotGiven = NOT_GIVEN,
    width: float | Param | None = None,
    height: float | Param | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """Bar plot for comparing eval scores.

    Summarize eval scores using a bar plot. By default, scores (`y`) are plotted by "task_name" (`fx`) and "model" (`x`). By default, confidence intervals are also plotted (disable this with `y_ci=False`).

    Args:
       data: Evals data table. This is typically created using a data frame read with the inspect `evals_df()` function.
       x: Name of field for x axis (defaults to "model")
       fx: Name of field for x facet (defaults to "task_name")
       y: Name of field for y axis (defaults to "score_headline_value").
       y_stderr: Name of field for stderr (defaults to "score_headline_metric").
       y_ci: Confidence interval (e.g. 0.80, 0.90, 0.95, etc.). Defaults to 0.95.
       y_label: Y axis label (pass None for no label).
       width: The outer width of the plot in pixels, including margins. Defaults to 700.
       height: The outer height of the plot in pixels, including margins. The default is width / 1.618 (the [golden ratio](https://en.wikipedia.org/wiki/Golden_ratio))
       **attributes: Additional `PlotAttributes`. By default, the `y_inset_top` and `margin_bottom` are set to 10 pixels and `x_ticks` is set to `[]`.
    """
    # establish channels
    channels: dict[str, str] = {}
    if fx == FX_DEFAULT:
        channels[FX_CHANNEL_LABEL] = fx
    if x == X_DEFAULT:
        channels[X_CHANNEL_LABEL] = x
    if y == Y_DEFAULT:
        channels[Y_CHANNEL_LABEL] = y
    resolve_log_viewer_channel(data, channels)

    # start with bar plot
    components = [bar_y(data, x=x, fx=fx, y=y, fill=x, channels=channels, tip=True)]

    # add ci if requested
    if y_ci is not False:
        y_ci = 0.95 if y_ci is True else y_ci
        z_alpha = z_score(y_ci)
        components.append(
            rule_x(
                data,
                x=x,
                fx=fx,
                y1=sql(f"{y} - ({z_alpha} * {y_stderr})"),
                y2=sql(f"{y} + ({z_alpha} * {y_stderr})"),
                stroke="black",
                marker="tick-x",
            ),
        )

    # resolve defaults
    defaults: PlotAttributes = {
        "y_inset_top": 10,
        "margin_bottom": 10,
        "x_ticks": [],
    }
    attributes = defaults | attributes

    # render plot
    return plot(
        components,
        legend=legend("color", location="bottom"),
        x_label=None,
        fx_label=None,
        y_label=y_label,
        width=width,
        height=height,
        **attributes,
    )
