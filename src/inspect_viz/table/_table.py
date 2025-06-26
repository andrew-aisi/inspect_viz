from typing import Literal

from pydantic import JsonValue

from inspect_viz._util.marshall import dict_remove_none

from .._core import Component, Data
from .._core.selection import Selection
from ..input._params import column_validated


def table(
    data: Data,
    filter_by: Selection | None = None,
    columns: list[str] | None = None,
    target: Selection | None = None,
    align: dict[str, Literal["left", "right", "center", "justify"]] | None = None,
    format: dict[str, str] | None = None,
    width: float | dict[str, float] | None = None,
    max_width: float | None = None,
    height: float | None = None,
    pagination: bool | None = None,
    paginationPageSize: int | None = None,
    paginationPageSizeSelector: list[int] | bool | None = None,
    paginationAutoPageSize: bool | None = None,
) -> Component:
    """Tabular display of data.

    Args:
       data: The data source for the table.
       filter_by: Selection to filter by (defaults to data source selection).
       columns: A list of column names to include in the table grid. If unspecified, all table columns are included.
       target: The output selection. A selection clause of the form column IN (rows) will be added to the selection for each currently selected table row.
       align: A dict of per-column alignment values. Column names should be object keys, which map to alignment values. Valid alignment values are: `"left"`, `"right"`, `"center"`, and `"justify"`. By default, numbers are right-aligned and other values are left-aligned.
       format: A dict of per-column d3-format (for numeric columns) or d3-time-format strings (for datetime columns) used to format column values.
       width: If a number, sets the total width of the table widget, in pixels. If an object, provides per-column pixel width values. Column names should be object keys, mapped to numeric width values.
       max_width: The maximum width of the table widget, in pixels.
       height: The height of the table widget, in pixels.
       pagination: Set whether pagination is enabled.
       paginationPageSize: How many rows to load per page. If paginationAutoPageSize is specified, this property is ignored.
       paginationPageSizeSelector: Determines if the page size selector is shown in the pagination panel or not. Set to an list of values to show the page size selector with custom list of possible page sizes. Set to true to show the page size selector with the default page sizes [20, 50, 100]. Set to false to hide the page size selector.
       paginationAutoPageSize: Set to true so that the number of rows to load per page is automatically adjusted by the grid so each page shows enough rows to just fill the area designated for the grid. If false, paginationPageSize is used.
    """
    config: dict[str, JsonValue] = dict_remove_none(
        {
            "input": "table",
            "from": data.table,
            "filterBy": filter_by or data.selection,
            "columns": [column_validated(data, c) for c in columns]
            if columns
            else None,
            "as": target,
            "align": {column_validated(data, k): v for k, v in align.items()}
            if isinstance(align, dict)
            else align,
            "format": format,
            "width": {column_validated(data, k): v for k, v in width.items()}
            if isinstance(width, dict)
            else width,
            "maxWidth": max_width,
            "height": height,
            "pagination": pagination,
            "paginationPageSize": paginationPageSize,
            "paginationPageSizeSelector": paginationPageSizeSelector,
            "paginationAutoPageSize": paginationAutoPageSize,
        }
    )

    return Component(config=config)
