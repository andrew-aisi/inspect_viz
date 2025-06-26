import {
    clauseMatch,
    isParam,
    isSelection,
    SelectionClause,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm';
import { FilterExpr, Query } from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm';
import { Input, InputOptions } from './input';
import { setupActivationListeners } from './util';
import { generateId } from '../util/id';
import { kInputSearch, kSidebarFullwidth } from './types';

export interface SearchOptions extends InputOptions {
    from: string;
    type: 'contains' | 'prefix' | 'suffix' | 'regexp';
    column: string;
    label?: string;
    placeholder?: string;
    field?: string;
    width?: number;
}

export class Search extends Input {
    private readonly input_: HTMLInputElement;
    private readonly id_: string = generateId();
    private data_: Array<{ list: string }> = [];
    private datalist_?: HTMLDataListElement;

    constructor(protected readonly options_: SearchOptions) {
        super(options_.filterBy);

        this.element.classList.add(kSidebarFullwidth);

        if (options_.label) {
            const inputLabel = window.document.createElement('label');
            inputLabel.setAttribute('for', this.id_);
            inputLabel.innerText = options_.label;
            this.element.appendChild(inputLabel);
        }

        // search box
        this.input_ = window.document.createElement('input');
        this.input_.autocomplete = 'off';
        this.input_.classList.add(kInputSearch);
        this.input_.id = this.id_;
        this.input_.type = 'text';
        if (this.options_.placeholder) {
            this.input_.setAttribute('placeholder', this.options_.placeholder);
        }
        if (this.options_.width) {
            this.input_.style.width = `${options_.width}px`;
        }
        this.element.appendChild(this.input_);

        // track changes to search box
        this.input_.addEventListener('input', () => {
            this.publish(this.input_.value);
        });

        // track changes to param
        if (!isSelection(this.options_.as)) {
            this.options_.as.addEventListener('value', value => {
                if (value !== this.input_.value) {
                    this.input_.value = value;
                }
            });
        } else {
            setupActivationListeners(this, this.input_);
        }
    }

    reset() {
        this.input_.value = '';
    }

    clause(value?: string): SelectionClause {
        const field = this.options_.field || this.options_.column;
        return clauseMatch(field, value, { source: this, method: this.options_.type });
    }

    activate() {
        if (isSelection(this.options_.as)) {
            this.options_.as.activate(this.clause(''));
        }
    }

    publish(value?: string) {
        if (isSelection(this.options_.as)) {
            this.options_.as.update(this.clause(value));
        } else if (isParam(this.options_.as)) {
            this.options_.as.update(value);
        }
    }

    query(filter: FilterExpr[] = []) {
        return Query.from(this.options_.from)
            .select({ list: this.options_.column })
            .distinct()
            .where(...filter);
    }

    queryResult(data: any): this {
        this.data_ = data;
        return this;
    }

    update(): this {
        const list = document.createElement('datalist');
        const id = `${this.id_}_list`;
        list.setAttribute('id', id);
        for (const d of this.data_) {
            const opt = document.createElement('option');
            opt.setAttribute('value', d.list);
            list.append(opt);
        }
        if (this.datalist_) {
            this.datalist_.remove();
        }
        this.element.appendChild((this.datalist_ = list));
        this.input_.setAttribute('list', id);
        return this;
    }
}
