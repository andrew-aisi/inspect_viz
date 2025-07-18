from typing import Unpack

from inspect_viz import Component, Data
from inspect_viz._util.channels import resolve_log_viewer_channel
from inspect_viz.input import checkbox_group, select
from inspect_viz.layout._concat import vconcat
from inspect_viz.layout._space import vspace
from inspect_viz.mark._dot import dot
from inspect_viz.mark._rule import rule_x
from inspect_viz.plot._attributes import PlotAttributes
from inspect_viz.plot._legend import legend
from inspect_viz.plot._plot import plot
from inspect_viz.transform import ci_bounds


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
       data: Data with the following fields:

          - `model`: Model name (e.g. "gpt-4o")
          - `organization`: Organization that created the model (e.g. "OpenAI")
          - `release_date`: Date of model release.
          - `eval`: Name of eval (e.g. "SWE-bench Verified")
          - `scorer`: Scorer used (e.g. "choice").
          - `score`: Benchmark score (scaled 0-1).
          - `stderr`: Standard error.
          - `log_viewer`: Optional. URL to view evaluation log.
       organizations: List of organizations to include (in order of desired presentation).
       ci: Confidence interval (defaults to 0.95, pass `False` for no confidence intervals)
       x_label: x-axis label
       y_label: y-axis label
       eval_label: Eval select label.
       **attributes: Additional `PlotAttributes`. By default, the `x_domain` is set to "fixed", the `y_domain` is set to `[0,1.0]`, `color_label` is set to "Organizations", and `color_domain` is set to `organizations`.
    """
    # validate the required fields
    for field in [
        "model",
        "organization",
        "release_date",
        "eval",
        "scorer",
        "score",
        "stderr",
    ]:
        if field not in data.columns:
            raise ValueError(f"Field '{field}' not provided in passed 'data'.")

    # inputs
    benchmark_select = select(
        data,
        label=f"{eval_label}: ",
        column="eval",
        value="auto",
        width=370,
    )
    org_checkboxes = checkbox_group(data, column="organization", options=organizations)

    # build channels (log_viewer is optional)
    channels: dict[str, str] = {
        "Organization": "organization",
        "Model": "model",
        "Release Date": "release_date",
        "Scorer": "scorer",
        "Score": "score",
        "Stderr": "stderr",
    }
    resolve_log_viewer_channel(data, channels)

    # start with dot plot
    components = [
        dot(
            data,
            x="release_date",
            y="score",
            r=3,
            fill="organization",
            channels=channels,
        )
    ]

    # add ci if requested
    if ci is not False:
        ci = 0.95 if ci is True else ci
        ci_lower, ci_upper = ci_bounds(ci, score="score", stderr="stderr")
        components.append(
            rule_x(
                data,
                x="release_date",
                y="score",
                y1=ci_lower,
                y2=ci_upper,
                stroke="organization",
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
