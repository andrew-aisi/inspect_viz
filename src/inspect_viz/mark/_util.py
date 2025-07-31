from pydantic import JsonValue

from .._core import Data, Param
from ..transform._column import column
from ._channel import ChannelIntervalSpec
from ._mark import Mark, Marks
from ._options import MarkOptions


def column_param(
    data: Data | None, param: ChannelIntervalSpec | Param | None
) -> ChannelIntervalSpec | Param | None:
    if data is not None and isinstance(param, str):
        if not isinstance(param, Param) and param not in data.columns:
            raise ValueError(f"Column '{param}' was not found in the data source.")

        return column(param)
    else:
        return param


def tip_mark(type: str, config: dict[str, JsonValue], options: MarkOptions) -> Mark:
    return Mark(type, config, options, {"tip": True})


def flatten_marks(marks: Marks | None) -> list[Mark]:
    if marks is None:
        return []
    if isinstance(marks, Mark):
        return [marks]

    # Handle list case
    result = []
    for item in marks:
        if isinstance(item, Mark):
            result.append(item)
        else:
            result.extend(item)
    return result
