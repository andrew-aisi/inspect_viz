from inspect_viz import Component, Data
from inspect_viz.mark import bar_y, rule_x
from inspect_viz.plot import legend, plot
from inspect_viz.sandbox.axis import PlotAxis, score_axis
from inspect_viz.transform import sql


def evals_bar_plot(
    evals: Data, x: str = "model", fx: str = "task_name", y: PlotAxis | None = None
) -> Component:
    """Bar plot for comparing evals.

    Args:
       evals: Evals data table (typically read using `evals_df()`)
       x: Name of field for x axis (defaults to "model")
       fx: Name of field for x facet (defaults to "task_name")
       y: Definition for y axis (defaults to score with confidence intervals)
    """
    # default y to score axis
    y = y or score_axis()

    # start with bar plot
    components = [
        bar_y(
            evals,
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
                x=x,
                fx=fx,
                y1=sql(f"{y.value_field} - ({z_alpha} * {y.stderr_field})"),
                y2=sql(f"{y.value_field} + ({z_alpha} * {y.stderr_field})"),
                stroke="black",
                marker="tick-x",
            ),
        )

    # render plot
    return plot(
        components,
        legend=legend("color", location="bottom"),
        x_label=None,
        x_ticks=[],
        fx_label=None,
        margin_bottom=10,
        y_label=y.label,
        y_domain=y.domain,
        y_inset_top=10,
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
