from typing import Literal

from inspect_viz import Component, Data
from inspect_viz.input import checkbox_group, select
from inspect_viz.layout._concat import vconcat
from inspect_viz.layout._space import vspace
from inspect_viz.mark._dot import dot
from inspect_viz.mark._rule import rule_x
from inspect_viz.plot._legend import legend
from inspect_viz.plot._plot import plot
from inspect_viz.transform._sql import sql
from inspect_viz.transform._transform import Transform


def eval_scores_timeline(data: Data) -> Component:
    """Eval scores by model, organization, and release date.

    Args:
       data: Data with the following fields:
          - `model`: Model name (e.g. "gpt-4o")
          - `organization`: Organization that created the model (e.g. "OpenAI")
          - `release_date`: Date of model release.
          - `benchmark`: Name of eval benchmark (e.g. "SWE-bench Verified")
          - `scorer`: Scorer used (e.g. "choice").
          - `score`: Benchmark score (scaled 0-1).
          - `stderr`: Standard error.
          - `log_viewer`: URL to view evaluation log.
    """
    # validate the required fields
    for field in [
        "model",
        "organization",
        "release_date",
        "benchmark",
        "scorer",
        "score",
        "stderr",
        "log_viewer",
    ]:
        if field not in data.columns:
            raise ValueError(f"Field '{field}' not provided in passed 'data'.")

    # inputs
    benchmark_select = select(
        data,
        label="Benchmark: ",
        column="benchmark",
        value="first",
        width=370,
    )
    org_checkboxes = checkbox_group(data, column="organization")

    # plot
    pl = plot(
        dot(
            data,
            x="release_date",
            y="score",
            r=3,
            fill="organization",
            channels={  # <3>
                "Model": "model",
                "Scorer": "scorer",
                "Stderr": "stderr",
                "Log Viewer": "log_viewer",
            },  # <3>
        ),
        rule_x(
            data,
            x="release_date",
            y="score",
            y1=_ci_value("-"),
            y2=_ci_value("+"),
            stroke="organization",
            stroke_opacity=0.4,
            marker="tick-x",
        ),
        legend=legend("color", target=data.selection),
        x_domain="fixed",
        y_domain=[0, 1.0],
        x_label="Release Date",
        y_label="Score",
        color_label="Organization",
    )

    # compose view
    return vconcat(benchmark_select, org_checkboxes, vspace(15), pl)


def _ci_value(direction: Literal["+", "-"]) -> Transform:
    Z_ALPHA = 1.960
    return sql("score" + f"{direction}" + f"({Z_ALPHA} * stderr)")


# from inspect_viz import Data, Selection
# from inspect_viz.input import checkbox_group, select
# from inspect_viz.layout import vconcat, vspace
# from inspect_viz.plot import plot, legend
# from inspect_viz.mark import dot, rule_x
# from inspect_viz.table import table
# from inspect_viz.transform import sql

# # read data
# benchmarks = Data.from_file("benchmarks.parquet") # <1>

# # provide explicit sequence of org names
# orgs = ["OpenAI", "Anthropic", "Google", "Meta AI", "xAI", "Mistral AI"]

# # compute confidence interval value
# def ci_value(direction):  # <2>
#     Z_ALPHA = 1.960
#     return sql(
#         "score" +
#         f"{direction}" +
#         f"({Z_ALPHA} * stderr)"
#     )  # <2>

vconcat(
    # select benchmark
    select(
        benchmarks,
        label="Benchmark: ",
        column="benchmark",
        value="GPQA Diamond",
        width=370,
    ),
    # filter models by organization(s)
    checkbox_group(benchmarks, column="organization", options=orgs),
    # dot plot w/ error bars
    vspace(15),
    plot(
        dot(
            benchmarks,
            x="release_date",
            y="score",
            r=3,
            fill="organization",
            channels={  # <3>
                "Model": "model",
                "Scorer": "scorer",
                "Stderr": "stderr",
                "Log Viewer": "log_viewer",
            },  # <3>
        ),
        rule_x(
            benchmarks,
            x="release_date",
            y="score",
            y1=ci_value("-"),  # <4>
            y2=ci_value("+"),
            stroke="organization",
            stroke_opacity=0.4,  # <4>
            marker="tick-x",
        ),
        legend=legend("color", target=benchmarks.selection),  # <5>
        x_domain="fixed",  # <6>
        y_domain=[0, 1.0],  # <6>
        color_domain=orgs,
        x_label="Release Date",
        y_label="Score",
        color_label="Organization",
    ),
)
