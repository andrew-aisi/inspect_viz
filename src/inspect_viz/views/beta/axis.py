from typing import Literal

from pydantic import BaseModel, Field


class AxisValue(BaseModel):
    """Axis value options."""

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


class AxisFilter(BaseModel):
    """Filter definition for plot axis."""

    label: str | None = Field(default=None)
    """Filter label (defaults to column namne)."""

    value: Literal["all"] | str | list[str] = Field(default="all")
    """Initial value (defaults to "all" which applies to filter)."""

    multiple: bool = Field(default=False)
    """Enable filtering on multiple values."""

    width: int | None = Field(default=None)
    """Width of filter input in pixels."""


def axis_score(ci: float = 0.95) -> AxisValue:
    """Axis definition for scores from `evals_df()` data frames.

    Args:
        ci: Confidence interval (e.g. 0.80, 0.90, 0.95, etc.).
    """
    return AxisValue(
        label="score",
        value_field="score_headline_value",
        stderr_field="score_headline_stderr",
        ci=ci,
        domain=[0.0, 1.0],
    )
