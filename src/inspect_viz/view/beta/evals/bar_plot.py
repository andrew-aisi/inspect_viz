from typing import Literal

from inspect_viz import Component, Data, Selection
from inspect_viz.input import select
from inspect_viz.layout import vconcat, vspace
from inspect_viz.layout._concat import hconcat
from inspect_viz.mark import bar_y, rule_x
from inspect_viz.plot import legend, plot
from inspect_viz.transform import sql

from ..axis import AxisFilter, AxisValue, axis_score


def evals_bar_plot(
    evals: Data,
    x: str = "model",
    fx: str = "task_name",
    y: AxisValue | None = None,
    x_filter: bool | AxisFilter = False,
    fx_filter: bool | AxisFilter = False,
) -> Component:
    """Bar plot for comparing evals.

    Args:
       evals: Evals data table. This is typically created using a data frame read with the inspect `evals_df()` function.
       x: Name of field for x axis (defaults to "model")
       fx: Name of field for x facet (defaults to "task_name")
       y: Definition for y axis (defaults to `axis_score()`)
       x_filter: Optional filtering control for x axis.
       fx_filter: Optional filtering control for fx axis.
    """
    # plot filter
    filter = Selection.intersect(include=evals.selection)

    # default y to score axis
    y = y or axis_score()

    # start with bar plot
    components = [
        bar_y(
            evals,
            filter_by=filter,
            # models (faceted by task) on x-axis
            x=x,
            fx=fx,
            # headline metric score on y-axis
            y=y.value_field,
            # x as fill color
            fill=x,
        )
    ]

    # add ci if requested
    if y.stderr_field is not None and y.ci is not None:
        z_alpha = _z_alpha(y.ci)
        components.append(
            rule_x(
                evals,
                filter_by=filter,
                x=x,
                fx=fx,
                y1=sql(f"{y.value_field} - ({z_alpha} * {y.stderr_field})"),
                y2=sql(f"{y.value_field} + ({z_alpha} * {y.stderr_field})"),
                stroke="black",
                marker="tick-x",
            ),
        )

    # add filters
    filters: list[Component] = []

    def add_filter(column: str, filter: Literal[True] | AxisFilter) -> None:
        filter = AxisFilter() if filter is True else filter
        filters.append(
            select(
                evals,
                column=column,
                label=filter.label,
                value=filter.value,
                multiple=filter.multiple,
                width=filter.width,
            )
        )

    if x_filter:
        add_filter(x, x_filter)
    if fx_filter:
        add_filter(fx, fx_filter)
    if len(filters):
        filters = [vconcat(hconcat(*filters), vspace())]

    # render plot
    return vconcat(
        *filters,
        plot(
            components,
            legend=legend("color", location="bottom"),
            x_label=None,
            x_ticks=[],
            fx_label=None,
            margin_bottom=10,
            y_label=y.label,
            y_domain=y.domain,
            y_inset_top=10,
        ),
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
