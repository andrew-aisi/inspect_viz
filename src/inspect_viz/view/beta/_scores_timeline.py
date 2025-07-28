from typing import Unpack

from inspect_viz import Component, Data
from inspect_viz._core.param import Param
from inspect_viz._util.channels import resolve_log_viewer_channel
from inspect_viz.input import checkbox_group, select
from inspect_viz.layout._concat import vconcat
from inspect_viz.layout._space import vspace
from inspect_viz.mark._dot import dot
from inspect_viz.mark._mark import Mark
from inspect_viz.mark._rule import rule_x
from inspect_viz.mark._text import text
from inspect_viz.mark._title import Title
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.plot._legend import legend
from inspect_viz.plot._plot import plot
from inspect_viz.transform import ci_bounds


def scores_timeline(
    data: Data,
    task_name: str = "task_display_name",
    model_name: str = "model_display_name",
    model_organization: str = "model_organization_name",
    model_release_date: str = "model_release_date",
    score_name: str = "score_headline_name",
    score_value: str = "score_headline_value",
    score_stderr: str = "score_headline_stderr",
    organizations: list[str] | None = None,
    organizations_filter: bool = True,
    task_filter: bool = True,
    ci: float | bool = 0.95,
    time_label: str = "Release Date",
    score_label: str = "Score",
    eval_label: str = "Eval",
    title: str | Title | None = None,
    marks: Mark | list[Mark] | None = None,
    width: float | Param | None = None,
    height: float | Param | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """Eval scores by model, organization, and release date.

    Args:
       data: Data read using `evals_df()` and amended with model metadata using the `model_info()` prepare operation (see [Data Preparation](https://inspect.aisi.org.uk/dataframe.html#data-preparation) for details).
       task_name: Column for task name (defaults to "task_display_name").
       model_name: Column for model name (defaults to "model_display_name").
       model_organization: Column for model organization (defaults to "model_organization_name").
       model_release_date: Column for model release date (defaults to "model_release_date").
       score_name: Column for scorer name (defaults to "score_headline_name").
       score_value: Column for score value (defaults to "score_headline_value").
       score_stderr: Column for score stderr (defaults to "score_headline_stderr")
       organizations: List of organizations to include (in order of desired presentation).
       organizations_filter: Provide UI to filter plot by organization(s).
       task_filter: Provide UI to filter plot by task(s).
       ci: Confidence interval (defaults to 0.95, pass `False` for no confidence intervals)
       time_label: Label for time (x-axis).
       score_label: Label for score (y-axis).
       eval_label: Label for eval select input.
       title: Title for plot (`str` or mark created with the `title()` function).
       marks: Additional marks to include in the plot.
       width: The outer width of the plot in pixels, including margins. Defaults to 700.
       height: The outer height of the plot in pixels, including margins. The default is width / 1.618 (the [golden ratio](https://en.wikipedia.org/wiki/Golden_ratio))
       **attributes: Additional `PlotAttributes`. By default, the `x_domain` is set to "fixed", the `y_domain` is set to `[0,1.0]`, `color_label` is set to "Organizations", and `color_domain` is set to `organizations`.
    """
    # fallback to task_name if required
    if task_name == "task_display_name" and task_name not in data.columns:
        task_name = "task_name"

    # validate the required fields
    for field in [
        model_name,
        model_organization,
        model_release_date,
        task_name,
        score_name,
        score_value,
        score_stderr,
    ]:
        if field not in data.columns:
            raise ValueError(f"Field '{field}' not provided in passed 'data'.")

    # resolve marks
    marks = (
        marks if isinstance(marks, list) else [marks] if isinstance(marks, Mark) else []
    )

    # count unique tasks and organizations
    num_tasks = len(data.column_unique(task_name))
    num_organizations = len(data.column_unique(model_organization))

    # build inputs
    inputs: list[Component] = []
    if num_tasks > 1 and task_filter:
        inputs.append(
            select(
                data,
                label=f"{eval_label}: ",
                column=task_name,
                value="auto",
                width=370,
            )
        )
    if num_organizations > 1 and organizations_filter:
        inputs.append(
            checkbox_group(data, column=model_organization, options=organizations)
        )

    # build channels (log_viewer is optional)
    channels: dict[str, str] = {
        "Organization": model_organization,
        "Model": model_name,
        "Release Date": model_release_date,
        "Scorer": score_name,
        "Score": score_value,
        "Stderr": score_stderr,
    }
    resolve_log_viewer_channel(data, channels)

    # start with dot plot
    components = [
        dot(
            data,
            x=model_release_date,
            y=score_value,
            r=3,
            fill=model_organization,
            channels=channels,
        )
    ]

    # add frontier label
    if "frontier" in data.columns:
        components.append(
            text(
                data,
                text=model_name,
                x=model_release_date,
                y=score_value,
                line_anchor="middle",
                frame_anchor="right",
                filter="frontier",
                dx=-4,
                fill=model_organization,
                shift_overlapping_text=True,
            )
        )

    # add ci if requested
    if ci is not False:
        ci = 0.95 if ci is True else ci
        ci_lower, ci_upper = ci_bounds(ci, score=score_value, stderr=score_stderr)
        components.append(
            rule_x(
                data,
                x=model_release_date,
                y=score_value,
                y1=ci_lower,
                y2=ci_upper,
                stroke=model_organization,
                stroke_opacity=0.4,
                marker="tick-x",
            ),
        )

    # resolve defaults
    defaults: PlotAttributes = {
        "x_domain": "fixed",
        "y_domain": [0, 1.0],
        "y_inset_top": 10,
        "color_label": "Organizations",
        "color_domain": organizations or "fixed",
    }
    attributes = defaults | attributes

    # add custom marks
    components.extend(marks)

    # resolve legend
    if num_organizations > 1:
        plot_legend = legend("color", target=data.selection)
    else:
        plot_legend = None

    # plot
    pl = plot(
        components,
        legend=plot_legend,
        x_label=time_label,
        y_label=score_label,
        title=title,
        width=width,
        height=height,
        **attributes,
    )

    # compose view
    return vconcat(*inputs, vspace(), pl)
