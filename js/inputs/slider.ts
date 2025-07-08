import {
    clauseInterval,
    clausePoint,
    isParam,
    isSelection,
    SelectionClause,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm';
import { generateId } from '../util/id';
import { Input, InputOptions } from './input';
import {
    FilterExpr,
    max,
    min,
    Query,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm';
import { setupActivationListeners } from './util';
import { kSidebarFullwidth } from './types';

import {
    create as createSlider,
    API as SliderAPI,
} from 'https://cdn.jsdelivr.net/npm/nouislider@15.8.1/+esm';

export interface SliderOptions extends InputOptions {
    select: 'point' | 'interval';
    value?: number | [number, number];
    from?: string;
    column?: string;
    field?: string;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    width?: number;
}

const kSliderInput = 'slider-input';

export class Slider extends Input {
    private readonly slider_: HTMLDivElement;
    private readonly sliderApi_: SliderAPI;
    private readonly curval_: HTMLLabelElement;
    private firstQuery_: boolean = false;
    constructor(protected readonly options_: SliderOptions) {
        super(options_.filterBy);

        // register as fullwidth
        this.element.classList.add(kSliderInput, kSidebarFullwidth);

        // add label if specified
        const id = generateId();
        const label = options_.label || options_.column;
        let container: HTMLElement = this.element;
        if (label) {
            container = window.document.createElement('label');
            container.innerText = label;
            this.element.appendChild(container);
        }

        // add slider
        let { value, width, min, max } = options_;

        // create slider widget
        this.slider_ = document.createElement('div');
        this.slider_.classList.add('noUi-round');
        this.slider_.setAttribute('id', id);
        if (width != undefined) {
            this.slider_.style.width = `${+width}px`;
        }
        if (container) {
            container.appendChild(this.slider_);
        } else {
            this.element.appendChild(this.slider_);
        }
        this.sliderApi_ = createSlider(this.slider_, {
            range: { min: 0, max: 0 },
            connect: options_.select === 'interval',
            start: options_.select === 'interval' ? [0, 0] : 0,
        });

        // add current value label
        this.curval_ = document.createElement('label');
        this.curval_.setAttribute('class', 'slider-value');
        this.element.appendChild(this.curval_);

        // handle initial value
        if (this.options_.as?.value === undefined) {
            this.publish(value);
        } else if (value === undefined) {
            value = this.options_.as?.value;
        }

        // set value display
        this.updateCurrentValue();
        this.curval_.innerText = this.sliderValue.toString();

        // respond to slider input
        this.sliderApi_.on('update', () => {
            this.updateCurrentValue();
            this.publish(this.sliderValue);
        });

        // track param updates
        if (!isSelection(this.options_.as)) {
            this.options_.as.addEventListener('value', value => {
                if (!areEqual(value, this.sliderValue)) {
                    this.sliderApi_.set(value);
                    this.updateCurrentValue();
                }
            });
        }

        // setup activation listeners
        else {
            setupActivationListeners(this, this.slider_);
        }

        // configure slider if we aren't using the db
        if (!options_.from) {
            min = min ?? (Array.isArray(value) ? value[0] : (value ?? 0));
            max = max ?? (Array.isArray(value) ? value[1] : (value ?? 0));
            const start = value ?? (options_.select === 'interval' ? [0, 0] : 0);
            this.updateSlider(min, max, start);
        }
    }

    updateCurrentValue() {
        const value = this.sliderValue;
        if (Array.isArray(value)) {
            this.curval_.innerText = `${value[0].toLocaleString()}-${value[1].toLocaleString()}`;
        } else {
            this.curval_.innerHTML = value.toLocaleString();
        }
    }

    get sliderValue(): number | [number, number] {
        const value = this.sliderApi_.get();
        if (Array.isArray(value)) {
            return value.map(cleanNumber).slice(0, 2) as [number, number];
        } else {
            return cleanNumber(value);
        }
    }

    set sliderValue(value: number | [number, number]) {
        this.sliderApi_.set(value, true);
    }

    activate(): void {
        const target = this.options_.as;
        if (isSelection(target)) {
            target.activate(this.clause());
        }
    }

    query(filter: FilterExpr[] = []) {
        const { from, column } = this.options_;
        if (!from || !column) {
            return null;
        }
        return Query.select({ min: min(column), max: max(column) })
            .from(from)
            .where(...filter);
    }

    queryResult(data: any) {
        // get min and max
        const { min: dataMin, max: dataMax } = Array.from(data)[0] as { min: number; max: number };
        const min = this.options_.min ?? dataMin;
        const max = this.options_.max ?? dataMax;

        // snap to min and max if first query and no value specified
        let start = this.sliderValue;
        if (!this.firstQuery_) {
            this.firstQuery_ = true;
            if (this.options_.value === undefined) {
                start = this.options_.select === 'interval' ? [min, max] : max;
            } else {
                start = this.options_.value;
            }
        }
        this.updateSlider(min, max, start);
        return this;
    }

    updateSlider(min: number, max: number, start: number | [number, number]) {
        const step = this.options_.step ?? (min >= 5 || max >= 5 ? 1 : undefined);
        this.sliderApi_.updateOptions(
            {
                range: {
                    min,
                    max,
                },
                step,
                start,
            },
            true
        );
        return this;
    }

    clause(value?: number | [number, number]): SelectionClause {
        let { field, column, min, select = 'point' } = this.options_;
        field = field || column;
        if (!field) {
            throw new Error(
                "You must specify a 'column' or 'field' for a slider targeting a selection."
            );
        }
        if (select === 'interval' && value !== undefined) {
            const domain: [number, number] = Array.isArray(value) ? value : [min ?? 0, value];
            return clauseInterval(field, domain, {
                source: this,
                bin: 'ceil',
                scale: { type: 'identity', domain },
                pixelSize: this.options_.step || undefined,
            });
        } else {
            return clausePoint(field, Array.isArray(value) ? value[0] : value, {
                source: this,
            });
        }
    }

    publish(value?: number | [number, number]) {
        const target = this.options_.as;
        if (isSelection(target)) {
            target.update(this.clause(value));
        } else if (isParam(target)) {
            target.update(value);
        }
    }
}

function areEqual(a: number | [number, number], b: number | [number, number]) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.map(cleanNumber) === b.map(cleanNumber);
    } else if (!Array.isArray(a) && !Array.isArray(b)) {
        return cleanNumber(a) === cleanNumber(b);
    } else {
        return false;
    }
}

function cleanNumber(num: number | string) {
    if (typeof num === 'string') {
        num = parseFloat(num);
    }

    // Special cases
    if (!isFinite(num)) return num;
    if (num === 0) return 0;

    // Determine a reasonable epsilon based on the magnitude of the number
    const magnitude = Math.abs(num);
    const epsilon = magnitude * Number.EPSILON * 100;

    // Round to the nearest "clean" value
    const rounded = Math.round(num);

    // If very close to an integer, return the integer
    if (Math.abs(num - rounded) < epsilon) {
        return rounded;
    }

    // Otherwise, use toPrecision to clean up
    return parseFloat(num.toPrecision(15));
}
