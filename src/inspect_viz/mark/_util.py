from pydantic import JsonValue

from .._core import Data, Param
from ..transform._column import column
from ._channel import ChannelIntervalSpec
from ._mark import Mark
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
