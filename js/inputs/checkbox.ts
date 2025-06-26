import {
    clausePoint,
    isParam,
    isSelection,
    SelectionClause,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm';
import { Input, InputOptions } from './input';
import { createLabeledInput, setupActivationListeners } from './util';
import { generateId } from '../util/id';

export interface CheckboxOptions extends InputOptions {
    label: string;
    checked: boolean;
    values: [string | number | boolean | null, string | number | boolean | null];
    field?: string;
}

export class Checkbox extends Input {
    constructor(protected readonly options_: CheckboxOptions) {
        super(options_.filterBy);

        // create element
        const { inputLabel, input } = createLabeledInput('checkbox', options_.label);
        input.id = generateId();
        this.element.appendChild(inputLabel);

        // handle initial checked state
        input.checked = options_.checked;

        // publish input (and sync to checkbox changes)
        const publish = () =>
            this.publish(
                input.checked ? options_.values[0] || undefined : options_.values[1] || undefined
            );
        input.addEventListener('change', publish);
        publish();

        // setup param listener
        if (!isSelection(this.options_.as)) {
            this.options_.as.addEventListener('value', value => {
                input.checked = value === this.options_.values[0];
            });
        }

        // setup activation listener for selection
        else {
            setupActivationListeners(this, input);
        }
    }

    activate(): void {
        if (isSelection(this.options_.as)) {
            this.options_.as.activate(this.clause());
        }
    }

    clause(value?: string | number | boolean): SelectionClause {
        if (!this.options_.field) {
            throw new Error("checkbox 'field' option must be specified with selection");
        }

        return clausePoint(this.options_.field, value, { source: this });
    }

    publish(value?: string | number | boolean) {
        if (isSelection(this.options_.as)) {
            this.options_.as.update(this.clause(value));
        } else if (isParam(this.options_.as)) {
            this.options_.as.update(value);
        }
    }
}
