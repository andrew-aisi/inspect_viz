from inspect_viz._core.param import Param
from inspect_viz._util.stats import z_score

from ._sql import sql
from ._transform import Transform


def ci_bounds(
    level: float,
    *,
    score: str | Param,
    stderr: str | Param | tuple[str | Param, str | Param],
) -> tuple[Transform, Transform]:
    """Compute a confidence interval boundary.

    Returns a tuple of two `Transform` objects corresponding to the lower and upper bounds of the confidence interval.

    Args:
       level: Confidence level (e.g. 0.95)
       score: Column name for score.
       stderr: Column name(s) for stderr. Pass a tuple to use distinct columns for lower and upper bounds.
    """
    if not 0 < level < 1:
        raise ValueError("level must be between 0 and 1 (exclusive)")

    stderr = stderr if isinstance(stderr, tuple) else (stderr, stderr)

    def bound(sign: str, col: str) -> Transform:
        return sql(f"{score} {sign}" + f"({z_score(level)} * {col})")

    return bound("-", stderr[0]), bound("+", stderr[1])
