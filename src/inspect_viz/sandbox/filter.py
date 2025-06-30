from typing import Literal

from pydantic import BaseModel, Field


class Filter(BaseModel):
    """Filter definition for plot component."""

    label: str | None = Field(default=None)
    """Filter label (defaults to column namne)."""

    value: Literal["all"] | str | list[str] = Field(default="all")
    """Initial value (defaults to "all" which applies to filter)."""

    multiple: bool = Field(default=False)
    """Enable filtering on multiple values."""

    width: int | None = Field(default=None)
    """Width of filter input in pixels."""
