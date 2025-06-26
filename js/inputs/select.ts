import { TomSettings } from 'tom-select/dist/esm/types/settings.js';
import { generateId } from '../util/id';
import { ChoiceInput, ChoiceInputOptions } from './choice';
import { kSidebarFullwidth } from './types';

import TomSelect from 'https://cdn.jsdelivr.net/npm/tom-select@2.4.3/+esm';

export interface SelectOptions extends ChoiceInputOptions {
    multiple?: boolean;
    width?: number;
}

export class Select extends ChoiceInput {
    private readonly select_: HTMLSelectElement;
    private readonly multiple_: boolean;
    private tomSelect_?: TomSelect = undefined;
    constructor(options: SelectOptions) {
        // propagate filter
        super(options);

        // note multiple
        this.multiple_ = options.multiple || false;

        // add fullwidth class (for sidebars)
        this.element.classList.add(kSidebarFullwidth);

        // create label if specified
        const label = options.label || options.column;
        let labelEl: HTMLLabelElement | null = null;
        if (label !== undefined) {
            labelEl = window.document.createElement('label');
            labelEl.innerText = label;
            this.element.appendChild(labelEl);
        }

        // create select
        this.select_ = document.createElement('select');
        if (options.width) {
            this.select_.style.width = `${options.width}px`;
        }
        this.select_.id = generateId();
        if (labelEl) {
            labelEl.appendChild(this.select_);
        } else {
            this.element.appendChild(this.select_);
        }

        // bind explicit options to data if specified
        if (options.options) {
            this.setOptions(options.options);
        }

        // publish selected value upon menu change
        this.select_.addEventListener('input', () => {
            this.publish(this.selectedValue ?? null);
        });

        // listeners
        this.setupParamListener();
        this.setupActivationListeners(this.select_);
    }

    queryResult(data: any): this {
        if (this.multiple_) {
            this.setData(this.queryResultOptions(data));
            return this;
        } else {
            return super.queryResult(data);
        }
    }

    get selectedValue(): string | string[] {
        return this.tomSelect_?.getValue() ?? '';
    }

    set selectedValue(value: string | string[]) {
        this.tomSelect_?.setValue(value);
    }

    update(): this {
        // create tomSelect if necessary
        if (!this.tomSelect_) {
            if (this.multiple_) {
                this.select_.multiple = true;
            }
            const config: Partial<TomSettings> = {
                create: false,
                dropdownParent: 'body',
            };
            if (!this.select_.multiple) {
                config.allowEmptyOption = !this.select_.multiple;
                // @ts-ignore
                config.controlInput = null;
            } else {
                config.plugins = {
                    remove_button: {
                        title: 'Remove this item',
                    },
                };
            }

            this.tomSelect_ = new TomSelect(this.select_, config);

            if (this.multiple_) {
                this.tomSelect_.on('item_add', () => {
                    this.tomSelect_!.control_input.value = '';
                    this.tomSelect_?.refreshOptions();
                });
            }
        }

        // reset options
        this.tomSelect_.clearOptions();
        this.tomSelect_.addOption(
            this.data_.map(o => ({ value: o.value, text: o.label || o.value }))
        );
        this.tomSelect_.refreshOptions(false);

        // update value based on param/selection
        this.updateSelectedValue();

        return this;
    }
}
