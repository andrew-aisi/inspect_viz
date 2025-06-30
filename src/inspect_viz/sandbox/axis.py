from pydantic import BaseModel


class ValueAxis(BaseModel):
    """Plot value axis options."""

    label: str
    """Axis label."""

    value_field: str
    """Field to read value from."""

    stderr_field: str | None
    """Field to read stderr from (optional, required for plotting confidence intervals)."""

    ci: float | None
    """Confidence interval (e.g. 0.80, 0.90, 0.95, etc.)."""

    domain: list[float] | None
    """Domain of axis (range of values to display)."""


def score_axis(ci: float = 0.95) -> ValueAxis:
    """Axis definition for scores from `evals_df()` data frames.

    Args:
        ci: Confidence interval (e.g. 0.80, 0.90, 0.95, etc.).
    """
    return ValueAxis(
        label="score",
        value_field="score_headline_value",
        stderr_field="score_headline_stderr",
        ci=ci,
        domain=[0.0, 1.0],
    )
