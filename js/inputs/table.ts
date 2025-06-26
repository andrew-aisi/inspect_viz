import {
    clausePoints,
    FieldInfo,
    isSelection,
    queryFieldInfo,
    throttle,
    toDataColumns,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm';

import {
    and,
    asc,
    contains,
    desc,
    eq,
    ExprNode,
    FilterExpr,
    gt,
    gte,
    isNull,
    literal,
    lt,
    lte,
    neq,
    not,
    or,
    prefix,
    suffix,
    Query,
    SelectQuery,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm';

import {
    createGrid,
    GridOptions,
    ColDef,
    ModuleRegistry,
    AllCommunityModule,
    GridApi,
    themeBalham,
    FilterModel,
    TextFilterModel,
    NumberFilterModel,
    DateFilterModel,
    IMultiFilterModel,
    SetFilterModel,
    ICombinedSimpleModel,
    RowSelectionOptions,
} from 'https://cdn.jsdelivr.net/npm/ag-grid-community@33.3.2/+esm';

import * as d3Format from 'https://cdn.jsdelivr.net/npm/d3-format@3.1.0/+esm';
import * as d3TimeFormat from 'https://cdn.jsdelivr.net/npm/d3-time-format@4.1.0/+esm';
import { Input, InputOptions } from './input';
import { generateId } from '../util/id';
import { JSType } from '@uwdata/mosaic-core';

export interface Column {
    name: string;
    label?: string;
    align?: 'left' | 'right' | 'center' | 'justify';
    format?: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: number;
    flex?: number;
    resizable?: boolean;
    minWidth?: number;
    maxWidth?: number;
    autoHeight?: boolean;
    wrapText?: boolean;
    headerAutoHeight?: boolean;
    headerAlign?: 'left' | 'right' | 'center' | 'justify';
    headerWrapText?: boolean;
}

export interface TableOptions extends InputOptions {
    from: string;
    columns?: Array<string | Column>;
    width?: number;
    maxWidth?: number;
    height?: number;
    pagination?: boolean;
    paginationAutoPageSize?: boolean;
    paginationPageSize?: number;
    paginationPageSizeSelector?: number[] | boolean;
    sorting?: boolean;
    filtering?: boolean;
    filterLocation?: 'header' | 'secondary';
    headerHeight?: number | 'auto';
    rowHeight?: number;
    select?: 'hover' | 'single' | 'multiple' | 'none';
    selectAll?: 'all' | 'filtered' | 'currentPage';
}

interface ColSortModel {
    colId: string;
    sort: 'asc' | 'desc' | null | undefined;
}

export class Table extends Input {
    private readonly id_: string;
    private readonly columns_: Column[];
    private readonly columnOptions_: Record<string, Column>;
    private readonly height_: number | undefined;

    private readonly gridContainer_: HTMLDivElement;
    private grid_: GridApi | null = null;
    private gridOptions_: GridOptions;

    private schema_: FieldInfo[];
    private currentRow_: number;
    private sortModel_: ColSortModel[] = [];
    private filterModel_: FilterModel = {};

    private data_: { numRows: number; columns: Record<string, Array<unknown>> } = {
        numRows: 0,
        columns: {},
    };

    constructor(protected readonly options_: TableOptions) {
        super(options_.filterBy);

        // register ag-grid modules
        ModuleRegistry.registerModules([AllCommunityModule]);

        // id
        this.id_ = generateId();

        // defaults
        this.columns_ = resolveColumns(this.options_.columns || ['*']);
        this.columnOptions_ = this.columns_.reduce(
            (acc, col) => {
                acc[col.name] = col;
                return acc;
            },
            {} as Record<string, Column>
        );
        this.height_ = this.options_.height;

        // state
        this.currentRow_ = -1;
        this.schema_ = [];

        // height and width
        if (typeof this.options_.width === 'number') {
            this.element.style.width = `${this.options_.width}px`;
        }
        if (this.options_.maxWidth) {
            this.element.style.maxWidth = `${this.options_.maxWidth}px`;
        }
        if (this.options_.height) {
            this.element.style.height = `${this.height_}px`;
        } else {
            this.element.style.height = '100%';
        }

        // create grid container
        this.gridContainer_ = document.createElement('div');
        this.gridContainer_.id = this.id_;
        this.gridContainer_.style.width = '100%';
        this.gridContainer_.style.height = '100%';
        this.element.appendChild(this.gridContainer_);

        // create grid options
        this.gridOptions_ = this.createGridOptions(this.options_);
    }

    // contribute a selection clause back to the target selection
    clause(rows: number[] = []) {
        const fields = this.schema_.map(s => s.column);
        const values = rows.map(row => {
            return fields.map(f => this.data_.columns[f][row]);
        });
        return clausePoints(fields, values, { source: this });
    }

    // mosaic calls this and initialization to let us fetch the schema
    // and do related setup
    async prepare() {
        // query for column schema information
        const table = this.options_.from;
        const fields = this.columns_.map(column => ({ column: column.name, table }));
        this.schema_ = await queryFieldInfo(this.coordinator!, fields);

        // create column definitions for ag-grid
        const columnDefs: ColDef[] = this.schema_.map(({ column, type }) =>
            this.createColumnDef(column, type)
        );
        this.gridOptions_.columnDefs = columnDefs;

        // Set the custom grid theme
        const myTheme = themeBalham.withParams({
            spacing: 4,
            accentColor: 'blue',
        });
        this.gridOptions_.theme = myTheme;

        // create the grid
        this.grid_ = createGrid(this.gridContainer_, this.gridOptions_);
    }

    // mosaic calls this every time it needs to show data to find
    // out what query we want to run
    query(filter: FilterExpr[] = []) {
        // Select the columns
        let query = Query.from(this.options_.from).select(
            this.schema_.length ? this.schema_.map(s => s.column) : '*'
        );

        // apply the external filter
        query = query.where(...filter);

        // apply the filter model
        Object.keys(this.filterModel_).forEach(colId => {
            const filter = this.filterModel_[colId] as SupportedFilter;
            const expression = filterExpression(colId, filter, query);
            if (expression) {
                query = query.where(expression);
            }
        });

        // Apply sorting
        if (this.sortModel_.length > 0) {
            this.sortModel_.forEach(sort => {
                query = query.orderby(sort.sort === 'asc' ? asc(sort.colId) : desc(sort.colId));
            });
        }

        return query;
    }

    // mosaic returns the results of the query() in this function.
    queryResult(data: any) {
        this.data_ = toDataColumns(data);
        return this;
    }

    // requests a client UI update (e.g. to reflect results from a query)
    update() {
        this.updateGrid(null);
        return this;
    }

    private updateGrid = throttle(async () => {
        if (!this.grid_) return;

        // convert column-based data to row-based data for ag-grid
        const rowData: any[] = [];
        for (let i = 0; i < this.data_.numRows; i++) {
            const row: any = {};
            this.schema_.forEach(({ column }) => {
                row[column] = this.data_.columns[column][i];
            });
            rowData.push(row);
        }

        this.grid_.setGridOption('rowData', rowData);
    });

    private createGridOptions(options: TableOptions): GridOptions {
        const headerHeightPixels =
            typeof options.headerHeight === 'string' ? undefined : options.headerHeight;
        const hoverSelect = options.select === 'hover' || options.select === undefined;
        const explicitSelection = resolveRowSelection(options);

        // initialize grid options
        return {
            // always pass filter to allow server-side filtering
            alwaysPassFilter: () => true,
            pagination: !!options.pagination,
            paginationAutoPageSize: !!options.paginationAutoPageSize,
            paginationPageSizeSelector: options.paginationPageSizeSelector,
            paginationPageSize: options.paginationPageSize,
            animateRows: true,
            headerHeight: headerHeightPixels,
            rowHeight: options.rowHeight,
            columnDefs: [],
            rowData: [],
            rowSelection: explicitSelection,
            onFilterChanged: () => {
                // Capture the filter model for server-side use
                this.filterModel_ = this.grid_?.getFilterModel() || {};

                // Trigger server-side query
                this.requestQuery();
            },
            onSortChanged: () => {
                if (this.grid_) {
                    // make a sort model
                    const sortModel = this.grid_
                        .getColumnState()
                        .filter(col => col.sort)
                        .map(col => ({ colId: col.colId, sort: col.sort }));
                    this.sortModel_ = sortModel;

                    // requery using the new sort model
                    this.requestQuery();
                }
            },
            onSelectionChanged: event => {
                if (explicitSelection !== undefined && isSelection(this.options_.as)) {
                    if (event.selectedNodes) {
                        // Get the selected rows
                        const rowIndices = event.selectedNodes
                            .map(n => n.rowIndex)
                            .filter(n => n !== null);

                        // Update the selection clause in the target selection
                        this.options_.as.update(this.clause(rowIndices));
                    }
                }
            },
            onCellMouseOver: event => {
                if (hoverSelect && isSelection(this.options_.as)) {
                    const rowIndex = event.rowIndex;
                    if (
                        rowIndex !== undefined &&
                        rowIndex !== null &&
                        rowIndex !== this.currentRow_
                    ) {
                        this.currentRow_ = rowIndex;
                        this.options_.as.update(this.clause([rowIndex]));
                    }
                }
            },
            onCellMouseOut: () => {
                if (hoverSelect && isSelection(this.options_.as)) {
                    this.currentRow_ = -1;
                    this.options_.as.update(this.clause());
                }
            },
        };
    }

    private createColumnDef(column: string, type: JSType): ColDef {
        const columnOptions = this.columnOptions_[column] || {};

        // Align, numbers right aligned by default
        const align = columnOptions.align || (type === 'number' ? 'right' : 'left');
        const headerAlignment = columnOptions.headerAlign;

        // Format string
        const formatter = formatterForType(type, columnOptions.format);

        // Sorting / filtering
        const sortable = this.options_.sorting !== false && columnOptions.sortable !== false;
        const filterable = this.options_.filtering !== false && columnOptions.filterable !== false;

        // Sizing
        const resizable = columnOptions.resizable !== false;

        // Min and max width
        const minWidth = columnOptions.minWidth;
        const maxWidth = columnOptions.maxWidth;

        // auto height
        const autoHeight = columnOptions.autoHeight;
        const autoHeaderHeight =
            this.options_.headerHeight === 'auto' && columnOptions.headerAutoHeight !== false;

        // wrap text
        const wrapText = columnOptions.wrapText;
        const wrapHeaderText = columnOptions.headerWrapText;

        // flex
        const flex = columnOptions.flex;

        // Position the filter below the header
        const floatingFilter = this.options_.filterLocation === 'secondary';

        const colDef: ColDef = {
            field: column,
            headerName: columnOptions.label || column,
            headerClass: headerClasses(headerAlignment),
            cellStyle: { textAlign: align },
            comparator: (_valueA, _valueB) => {
                // Sorting is handled by the database, so never client sort
                return 0;
            },
            filter: !filterable ? false : filterForColumnType(type),
            flex,
            sortable,
            resizable,
            minWidth,
            maxWidth,
            autoHeight,
            autoHeaderHeight,
            wrapText,
            wrapHeaderText,
            floatingFilter,
            valueFormatter: params => {
                // Format the value if a format is provided
                const value = params.value;
                if (formatter && value !== null && value !== undefined) {
                    return formatter(value);
                }
                return value;
            },
        };

        // Set columns widths, if explicitly provided
        // otherwise use flex to make all columns equal
        const width = columnOptions.width;
        if (width) {
            colDef.width = width;
        } else if (flex === undefined || flex === null) {
            colDef.flex = 1;
        }

        return colDef;
    }

    // all mosaic inputs implement this, not exactly sure what it does
    activate() {
        if (isSelection(this.options_.as)) {
            this.options_.as.activate(this.clause([]));
        }
    }
}

const resolveColumns = (columns: Array<string | Column>): Column[] => {
    return columns.map(col => {
        if (typeof col === 'string') {
            return { name: col };
        } else if (typeof col === 'object' && col !== null) {
            return col as Column;
        } else {
            throw new Error(`Invalid column definition: ${col}`);
        }
    });
};

const headerClasses = (align?: 'left' | 'right' | 'center' | 'justify'): string[] | undefined => {
    if (!align) {
        return undefined;
    }
    return [`header-${align}`];
};

const resolveRowSelection = (options: TableOptions): RowSelectionOptions<any, any> | undefined => {
    const explicitSelect = options.select === 'single' || options.select === 'multiple';
    const selectAll = options.selectAll || 'all';
    return !explicitSelect
        ? undefined
        : options.select === 'single'
          ? {
                mode: 'singleRow',
            }
          : { mode: 'multiRow', selectAll };
};

const filterForColumnType = (type: string): string => {
    // Select the proper filter type based on the column type
    switch (type) {
        case 'number':
        case 'integer':
        case 'float':
        case 'decimal':
            return 'agNumberColumnFilter';
        case 'date':
        case 'datetime':
        case 'timestamp':
            return 'agDateColumnFilter';
        case 'boolean':
            return 'agTextColumnFilter';
        default:
            return 'agTextColumnFilter';
    }
};

const formatterForType = (type: string, formatStr?: string) => {
    switch (type) {
        case 'integer':
            return d3Format.format(formatStr || ',');
        case 'number':
        case 'float':
            return d3Format.format(formatStr || ',.2~f');
        case 'decimal':
            return d3Format.format(formatStr || ',.4~f');
        case 'date':
            return d3TimeFormat.format(formatStr || '%Y-%m-%d'); // ISO date format (2024-03-15)
        case 'datetime':
        case 'timestamp':
            return d3TimeFormat.format(formatStr || '%Y-%m-%d %H:%M:%S'); // ISO datetime format
        case 'boolean':
        case 'string':
        default:
            return undefined;
    }
};

type BaseFilter =
    | TextFilterModel
    | NumberFilterModel
    | DateFilterModel
    | IMultiFilterModel
    | SetFilterModel;

type SupportedFilter = BaseFilter | ICombinedSimpleModel<BaseFilter>;

const filterExpression = (
    colId: string,
    filter: SupportedFilter,
    query: SelectQuery
): ExprNode | undefined => {
    if (isCombinedSimpleModel(filter)) {
        const operator = filter.operator === 'AND' ? and : or;
        const expressions = filter.conditions
            ?.map((f: any) => {
                return filterExpression(colId, f as SupportedFilter, query);
            })
            .filter(e => e !== undefined);
        if (expressions && expressions.length > 0) {
            return operator(...expressions);
        }
    } else if (isTextFilter(filter)) {
        return simpleExpression(colId, filter.type, filter.filter);
    } else if (isNumberFilter(filter)) {
        return simpleExpression(colId, filter.type, filter.filter);
    } else if (isMultiFilter(filter)) {
        const expr = filter.filterModels
            ?.map((f: any) => {
                return filterExpression(colId, f, query);
            })
            .filter(e => e !== undefined);
        if (expr && expr.length > 0) {
            return and(...expr);
        }
    } else if (isDateFilter(filter)) {
        return simpleExpression(colId, filter.type, filter.dateFrom, filter.dateTo || undefined);
    } else if (isSetFilter(filter)) {
        console.warn('Set filter not implemented');
    }
};

export const simpleExpression = (
    colId: string,
    type:
        | 'empty'
        | 'equals'
        | 'notEqual'
        | 'lessThan'
        | 'lessThanOrEqual'
        | 'greaterThan'
        | 'greaterThanOrEqual'
        | 'inRange'
        | 'contains'
        | 'notContains'
        | 'startsWith'
        | 'endsWith'
        | 'blank'
        | 'notBlank'
        | null
        | undefined,
    filter: string | number | null | undefined,
    filterTo: string | number | null | undefined = undefined
): ExprNode | undefined => {
    switch (type) {
        case 'equals':
            return eq(colId, literal(filter));
        case 'notEqual':
            return neq(colId, literal(filter));
        case 'contains':
            return contains(colId, String(filter));
        case 'notContains':
            return not(contains(colId, String(filter)));
        case 'blank':
            return isNull(colId);
        case 'notBlank':
            return not(isNull(colId));
        case 'startsWith':
            return prefix(colId, String(filter));
        case 'endsWith':
            return suffix(colId, String(filter));
        case 'greaterThan':
            return gt(colId, literal(filter));
        case 'lessThan':
            return lt(colId, literal(filter));
        case 'greaterThanOrEqual':
            return gte(colId, literal(filter));
        case 'lessThanOrEqual':
            return lte(colId, literal(filter));
        case 'inRange':
            if (filterTo !== undefined && filterTo !== null) {
                return (gte(colId, literal(filter)), lte(colId, literal(filterTo)));
            }
            break;
        default:
            console.warn(`Unsupported filter type: ${type}`);
    }
    return undefined;
};

const isCombinedSimpleModel = (
    filter: any
): filter is ICombinedSimpleModel<TextFilterModel | NumberFilterModel> => {
    return (
        typeof filter === 'object' &&
        filter !== null &&
        'operator' in filter &&
        'conditions' in filter &&
        (filter.operator === 'AND' || filter.operator === 'OR') &&
        typeof filter.conditions === 'object'
    );
};

const isTextFilter = (filter: any): filter is TextFilterModel => {
    return filter?.filterType === 'text';
};

const isNumberFilter = (filter: any): filter is NumberFilterModel => {
    return filter?.filterType === 'number';
};

const isDateFilter = (filter: any): filter is DateFilterModel => {
    return filter?.filterType === 'date' || filter?.filterType === 'dateString';
};

const isMultiFilter = (filter: any): filter is IMultiFilterModel => {
    return filter?.filterType === 'multi' && 'filterModels' in filter;
};

const isSetFilter = (filter: any): filter is SetFilterModel => {
    return filter?.filterType === 'set';
};
