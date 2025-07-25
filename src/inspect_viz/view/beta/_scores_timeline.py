from typing import Unpack

from inspect_viz import Component, Data
from inspect_viz._util.channels import resolve_log_viewer_channel
from inspect_viz.input import checkbox_group, select
from inspect_viz.layout._concat import vconcat
from inspect_viz.layout._space import vspace
from inspect_viz.mark._dot import dot
from inspect_viz.mark._rule import rule_x
from inspect_viz.mark._text import text
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.plot._legend import legend
from inspect_viz.plot._plot import plot
from inspect_viz.transform import ci_bounds

TEXT_CHANNEL_OPTIONS = "_text_channel_options"
ENABLE_TEXT_COLLISION = "enable_text_collision"


def scores_timeline(
    data: Data,
    organizations: list[str] | None = None,
    ci: float | bool = 0.95,
    x_label: str = "Release Date",
    y_label: str = "Score",
    eval_label: str = "Eval",
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """Eval scores by model, organization, and release date.

    Args:
       data: Data read using `evals_df()` and amended with model metadata using the `model_info()` prepare operation (see [Data Preparation](https://inspect.aisi.org.uk/dataframe.html#data-preparation) for details).

       organizations: List of organizations to include (in order of desired presentation).
       ci: Confidence interval (defaults to 0.95, pass `False` for no confidence intervals)
       x_label: x-axis label
       y_label: y-axis label
       eval_label: Eval select label.
       **attributes: Additional `PlotAttributes`. By default, the `x_domain` is set to "fixed", the `y_domain` is set to `[0,1.0]`, `color_label` is set to "Organizations", and `color_domain` is set to `organizations`.
    """
    # validate the required fields
    for field in [
        "model_display_name",
        "model_organization_name",
        "model_release_date",
        "task_name",
        "score_headline_name",
        "score_headline_value",
        "score_headline_stderr",
    ]:
        if field not in data.columns:
            raise ValueError(f"Field '{field}' not provided in passed 'data'.")

    # inputs
    benchmark_select = select(
        data,
        label=f"{eval_label}: ",
        column="task_name",
        value="auto",
        width=370,
    )
    org_checkboxes = checkbox_group(
        data, column="model_organization_name", options=organizations
    )

    # build channels (log_viewer is optional)
    channels: dict[str, str] = {
        "Organization": "model_organization_name",
        "Model": "model_display_name",
        "Release Date": "model_release_date",
        "Scorer": "score_headline_name",
        "Score": "score_headline_value",
        "Stderr": "score_headline_stderr",
    }
    resolve_log_viewer_channel(data, channels)

    # start with dot plot
    components = [
        dot(
            data,
            x="model_release_date",
            y="score_headline_value",
            r=3,
            fill="model_organization_name",
            channels=channels,
        )
    ]

    # add frontier label
    if "frontier" in data.columns:
        components.append(
            text(
                data,
                text="model_display_name",
                x="model_release_date",
                y="score_headline_value",
                line_anchor="middle",
                frame_anchor="right",
                filter="frontier",
                dx=-4,
                fill="model_organization_name",
                shift_overlapping_text=True,
            )
        )

    # add ci if requested
    if ci is not False:
        ci = 0.95 if ci is True else ci
        ci_lower, ci_upper = ci_bounds(
            ci, score="score_headline_value", stderr="score_headline_stderr"
        )
        components.append(
            rule_x(
                data,
                x="model_release_date",
                y="score_headline_value",
                y1=ci_lower,
                y2=ci_upper,
                stroke="model_organization_name",
                stroke_opacity=0.4,
                marker="tick-x",
            ),
        )

    # resolve defaults
    defaults: PlotAttributes = {
        "x_domain": "fixed",
        "y_domain": [0, 1.0],
        "color_label": "Organizations",
        "color_domain": organizations or "fixed",
    }
    attributes = defaults | attributes

    # plot
    pl = plot(
        components,
        legend=legend("color", target=data.selection),
        x_label=x_label,
        y_label=y_label,
        **attributes,
    )

    # compose view
    return vconcat(benchmark_select, org_checkboxes, vspace(15), pl)
