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
} from 'https://cdn.jsdelivr.net/npm/ag-grid-community@33.3.2/+esm';

import * as d3Format from 'https://cdn.jsdelivr.net/npm/d3-format@3.1.0/+esm';
import * as d3TimeFormat from 'https://cdn.jsdelivr.net/npm/d3-time-format@4.1.0/+esm';
import { Input, InputOptions } from './input';
import { generateId } from '../util/id';
import { suffix } from '@uwdata/mosaic-sql';

export interface TableOptions extends InputOptions {
    from: string;
    columns?: string[];
    align?: Record<string, 'left' | 'right' | 'center' | 'justify'>;
    format?: Record<string, string>;
    width?: number | Record<string, number>;
    maxWidth?: number;
    height?: number;
}

interface ColSortModel {
    colId: string;
    sort: 'asc' | 'desc' | null | undefined;
}

export class Table extends Input {
    private readonly id_: string;
    private readonly columns_: string[];
    private readonly align_: Record<string, 'left' | 'right' | 'center' | 'justify'>;
    private readonly format_: Record<string, string> = {};
    private readonly height_: number;
    private readonly widths_: Record<string, number>;

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
        this.columns_ = this.options_.columns || ['*'];
        this.align_ = this.options_.align || {};
        this.format_ = this.options_.format || {};
        this.height_ = this.options_.height || 500;
        this.widths_ = typeof this.options_.width === 'object' ? this.options_.width : {};

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
        this.element.style.height = `${this.height_}px`;

        // create grid container
        this.gridContainer_ = document.createElement('div');
        this.gridContainer_.id = this.id_;
        this.gridContainer_.style.width = '100%';
        this.gridContainer_.style.height = '100%';
        this.element.appendChild(this.gridContainer_);

        // initialize grid options
        this.gridOptions_ = {
            animateRows: false,
            columnDefs: [],
            rowData: [],
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
            },
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
            onCellMouseOver: event => {
                if (isSelection(this.options_.as)) {
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
                if (isSelection(this.options_.as)) {
                    this.currentRow_ = -1;
                    this.options_.as.update(this.clause());
                }
            },
            onGridReady: () => {
                // Patch the filters to always return true
                this.patchColumns();
            },
        };
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
        const fields = this.columns_.map(column => ({ column, table }));
        this.schema_ = await queryFieldInfo(this.coordinator!, fields);

        // create column definitions for ag-grid
        const columnDefs: ColDef[] = this.schema_.map(({ column, type }) => {
            const align = this.align_[column] || (type === 'number' ? 'right' : 'left');
            const formatter = formatterForType(type, this.format_[column]);

            const colDef: ColDef = {
                field: column,
                headerName: column,
                cellStyle: { textAlign: align },
                comparator: (_valueA, _valueB) => {
                    return 0;
                },
                filter: filterForColumnType(type),
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
            const width = this.widths_[column];
            if (width) {
                colDef.width = width;
            } else {
                colDef.flex = 1;
            }

            return colDef;
        });

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
        let query = Query.from(this.options_.from).select(this.schema_.map(s => s.column));

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

    private patchColumns() {
        if (!this.grid_) {
            return;
        }

        const columns = this.grid_.getColumns();
        if (columns) {
            columns.forEach(async column => {
                const colId = column.getColId();
                const filterInstance = await this.grid_!.getColumnFilterInstance(colId);

                // Patch filters to always return true
                // This is a workaround to disable client side filtering so we can implement
                // filtering using the query method instead.
                if (filterInstance && typeof filterInstance.doesFilterPass === 'function') {
                    filterInstance.doesFilterPass = () => true;
                }
            });
        }
    }

    // all mosaic inputs implement this, not exactly sure what it does
    activate() {
        if (isSelection(this.options_.as)) {
            this.options_.as.activate(this.clause([]));
        }
    }
}

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
        const exp = filter.operator === 'AND' ? and : or;
        const expressions = filter.conditions
            ?.map((f: any) => {
                const typedF = f as SupportedFilter;
                return filterExpression(colId, typedF, query);
            })
            .filter(e => e !== undefined);
        if (expressions && expressions.length > 0) {
            return exp(...expressions);
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
