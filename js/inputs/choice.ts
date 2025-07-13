import {
    isParam,
    isSelection,
    clausePoint,
    clausePoints,
    toDataColumns,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm';

import {
    FilterExpr,
    Query,
    SelectQuery,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm';

import { isObject } from '../util/object';

import { Input, InputOptions } from './input';
import { Option } from './types';
import { setupActivationListeners } from './util';

export interface ChoiceInputOptions extends InputOptions {
    from?: string;
    column?: string;
    options?: Array<Option>;
    field?: string;
    label?: string;
}

export abstract class ChoiceInput extends Input {
    protected data_: Option[] = [];
    constructor(protected readonly options_: ChoiceInputOptions) {
        super(options_.filterBy);
    }

    abstract get selectedValue(): string | string[];

    abstract set selectedValue(value: string | string[]);

    abstract update(): this;

    activate() {
        if (isSelection(this.options_.as) && this.options_.column) {
            const field = this.options_.field || this.options_.column;
            this.options_.as.activate(clausePoint(field, undefined, { source: this }));
        }
    }

    publish(value?: string | string[]) {
        const { as, field, column } = this.options_;
        if (isSelection(as) && column) {
            let clause = clausePoint(field || column, undefined, { source: this });
            if (Array.isArray(value) && value.length > 0) {
                clause = clausePoints(
                    [field || column],
                    value.map(v => [v]),
                    { source: this }
                );
            } else if (value?.length) {
                clause = clausePoint(field || column, value, { source: this });
            }
            as.update(clause);
        } else if (isParam(as)) {
            as.update(value);
        }
    }

    query(filter: FilterExpr[] = []): SelectQuery | null {
        const { from, column } = this.options_;

        if (!from) {
            return null;
        }

        if (!column) {
            throw new Error('You must specify a column along with a data source');
        }

        return Query.from(from)
            .select({ value: column })
            .distinct()
            .where(...filter)
            .orderby(column);
    }

    queryResult(data: any): this {
        if (this.options_.options === undefined) {
            this.setData([{ value: '', label: 'All' }, ...this.queryResultOptions(data)]);
        }

        return this;
    }

    queryResultOptions(data: any): Option[] {
        const columns = toDataColumns(data);
        const values = columns.columns.value as string[];
        return values.map(v => ({ value: v }));
    }

    protected setOptions(options: Option[]) {
        this.setData(options.map(opt => (isObject(opt) ? opt : { value: opt })));
        this.update();
    }

    protected setupParamListener() {
        if (!isSelection(this.options_.as)) {
            this.options_.as.addEventListener('value', value => {
                this.selectedValue = value;
            });
        }
    }

    protected setupActivationListeners(element: HTMLElement) {
        if (isSelection(this.options_.as)) {
            setupActivationListeners(this, element);
        }
    }

    protected updateSelectedValue() {
        // update value based on param/selection
        const value = isSelection(this.options_.as)
            ? this.options_.as.valueFor(this)
            : this.options_.as.value;
        this.selectedValue = value === undefined ? '' : value;
    }

    setData(options: Option[]) {
        if (!isSelection(this.options_.as)) {
            const paramValue = this.options_.as.value;
            if (
                paramValue &&
                !Array.isArray(paramValue) &&
                !options.some(option => option.value === paramValue)
            ) {
                options = [...options, { value: paramValue }];
            }
        }
        this.data_ = options;
    }
}
