from typing import Literal

from pydantic import BaseModel, JsonValue

from inspect_viz._util.marshall import dict_remove_none

from .._core import Component, Data
from .._core.selection import Selection


class Column(BaseModel):
    """Column configuration options for table display.

    Args:
        name: The column name as it appears in the data source. This is required.
        label: The text label for the column header. If not specified, the column name is used.
        align: Text alignment for the column. Valid values are "left", "right",
            "center", and "justify". By default, numbers are right-aligned and other values are left-aligned.
        width: Column width in pixels.
        flex: The flex value of the table widget, used to determine how much space it should take relative to other widgets in a layout. If specified, width is ignored.
        sortable: Whether sorting is enabled for this column.
        filterable: Whether filtering is enabled for this column.
        resizable: Whether the column width can be adjusted by the user.
        minWidth: Minimum column width in pixels.
        maxWidth: Maximum column width in pixels.
        format: Format string for column values. Use d3-format for numeric columns or d3-time-format for datetime columns.
        autoHeight: Whether the column cell height is automatically adjusted based on content.
        wrapText: Whether the column text is wrapped to fit within the cell.
        headerAlign: Text alignment for the column header. Valid values are "left", "right",
            "center", and "justify". By default, left aligned.
        headerAutoHeight: Whether the column header cell height is automatically adjusted based on content.
        headerWrapText: Whether the column header text is wrapped to fit within the header cell.


    """

    name: str
    label: str | None = None
    align: Literal["left", "right", "center", "justify"] | None = None

    format: str | None = None
    width: float | None = None
    flex: float | None = None
    minWidth: float | None = None
    maxWidth: float | None = None
    sortable: bool | None = None
    filterable: bool | None = None
    resizable: bool | None = None
    autoHeight: bool | None = None
    wrapText: bool | None = None
    headerAlign: Literal["left", "right", "center", "justify"] | None = None
    headerAutoHeight: bool | None = None
    headerWrapText: bool | None = None


def table(
    data: Data,
    filter_by: Selection | None = None,
    columns: list[str | Column] | None = None,
    target: Selection | None = None,
    width: float | None = None,
    max_width: float | None = None,
    height: float | None = None,
    sorting: bool | None = None,
    filtering: bool | None = None,
    pagination: bool | None = None,
    paginationPageSize: int | None = None,
    paginationPageSizeSelector: list[int] | bool | None = None,
    paginationAutoPageSize: bool | None = None,
    headerHeight: float | None = None,
    rowHeight: float | None = None,
    select: Literal["hover", "single", "multiple", "none"] = "hover",
) -> Component:
    """Tabular display of data.

    Args:
       data: The data source for the table.
       filter_by: Selection to filter by (defaults to data source selection).
       columns: A list of column names to include in the table grid. If unspecified, all table columns are included.
       target: The output selection. A selection clause of the form column IN (rows) will be added to the selection for each currently selected table row.
       select: The type of selection to use for the table. Valid values are "hover", "single", "multiple", and "none". Defaults to "hover".
       column_options: A dictionary of column configuration options. The keys are column names and the values are dictionaries with column options.
       width: The total width of the table widget, in pixels.
       max_width: The maximum width of the table widget, in pixels.
       height: The height of the table widget, in pixels.
       sorting: Set whether sorting is enabled.
       filtering: Set whether filtering is enabled.
       pagination: Set whether pagination is enabled.
       paginationPageSize: How many rows to load per page. If paginationAutoPageSize is specified, this property is ignored.
       paginationPageSizeSelector: Determines if the page size selector is shown in the pagination panel or not. Set to an list of values to show the page size selector with custom list of possible page sizes. Set to true to show the page size selector with the default page sizes [20, 50, 100]. Set to false to hide the page size selector.
       paginationAutoPageSize: Set to true so that the number of rows to load per page is automatically adjusted by the grid so each page shows enough rows to just fill the area designated for the grid. If false, paginationPageSize is used.
       headerHeight: The height of the table header, in pixels.
       rowHeight: The height of each table row, in pixels.

    """
    config: dict[str, JsonValue] = dict_remove_none(
        {
            "input": "table",
            "from": data.table,
            "filterBy": filter_by or data.selection,
            "columns": [validate_column(data, c) for c in columns] if columns else None,
            "as": target,
            "width": width,
            "maxWidth": max_width,
            "height": height,
            "sorting": sorting,
            "filtering": filtering,
            "pagination": pagination,
            "paginationPageSize": paginationPageSize,
            "paginationPageSizeSelector": paginationPageSizeSelector,
            "paginationAutoPageSize": paginationAutoPageSize,
            "headerHeight": headerHeight,
            "rowHeight": rowHeight,
            "select": select,
        }
    )

    return Component(config=config)


def validate_column(data: Data | None, column: str | Column) -> str | Column:
    column_name = column.name if isinstance(column, Column) else column
    if data is not None:
        if column_name not in data.columns:
            raise ValueError(f"Column '{column}' was not found in the data source.")
    return column
