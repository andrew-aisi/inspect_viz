from typing import Sequence

from inspect_viz import Component, Data
from inspect_viz.table import Column, column, table


def evals_table(
    evals: Data, columns: Sequence[str | Column] | None = None
) -> Component:
    """Table that summarizes eval scores by model and task.

    Args:
       evals: Evals data table.
       columns: Column definitions (defaults to model, task_name, and headline metric).
    """
    columns = (
        columns
        if columns is not None
        else [
            column("model", label="Model"),
            column("task_name", label="Task"),
            column("score_headline_metric", label="Metric"),
            column("score_headline_value", label="Value", align="center"),
            column("score_headline_stderr", label="Stderr", align="center"),
        ]
    )

    return table(data=evals, columns=columns)
