from typing import Unpack

from inspect_viz import Component, Data
from inspect_viz._core.param import Param
from inspect_viz._util.notgiven import NOT_GIVEN, NotGiven
from inspect_viz.mark import bar_y, rule_x
from inspect_viz.plot import legend, plot
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.transform import sql


def eval_scores(
    data: Data,
    x: str = "model",
    fx: str = "task_name",
    y: str = "score_headline_value",
    y_stderr: str = "score_headline_stderr",
    y_ci: bool | float = 0.95,
    y_label: str | None | NotGiven = NOT_GIVEN,
    width: float | Param | None = None,
    height: float | Param | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """Bar plot for comparing eval scores.

    Summarize eval scores using a bar plot. By default, scores (`y`) are plotted by "task_name" (`fx`) and "model" (`x`). By default, confidence intervals are also plotted (disable this with `y_ci=False`).

    Default field names are taken from the schema yielded by the Inspect `evals_df()` function. Pass alternate field names if you are plotting from a different dataset sechema.

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
    # start with bar plot
    components = [bar_y(data, x=x, fx=fx, y=y, fill=x, tip=True)]

    # add ci if requested
    if y_ci is not False:
        y_ci = 0.95 if y_ci is True else y_ci
        z_alpha = _z_alpha(y_ci)
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

    # resolve attributes
    if "y_inset_top" not in attributes:
        attributes["y_inset_top"] = 10
    if "margin_bottom" not in attributes:
        attributes["margin_bottom"] = 10
    if "x_ticks" not in attributes:
        attributes["x_ticks"] = []

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


def _z_alpha(ci: float = 0.95) -> float:
    """
    Calculate z_alpha (critical value) for a given confidence level

    Args:
        ci: Confidence level (e.g., 0.95 for 95%)

    Returns:
        z_alpha: Critical value for the confidence interval
    """
    z_values = {
        0.80: 1.282,
        0.85: 1.440,
        0.90: 1.645,
        0.95: 1.960,
        0.975: 2.241,
        0.99: 2.576,
        0.995: 2.807,
        0.999: 3.291,
    }

    if ci in z_values:
        return z_values[ci]
    else:
        raise ValueError(
            f"Please use one of these confidence levels: {list(z_values.keys())}"
        )
