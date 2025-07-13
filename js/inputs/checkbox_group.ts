import { ChoiceInput, ChoiceInputOptions } from './choice';
import { createFieldset, setFieldsetOptions } from './util';

export interface CheckboxGroupOptions extends ChoiceInputOptions {}

export class CheckboxGroup extends ChoiceInput {
    private readonly fieldset_: HTMLFieldSetElement;
    constructor(options: CheckboxGroupOptions) {
        // propagate filterBy
        super(options);

        // outer fieldset
        this.fieldset_ = createFieldset(options.label);
        this.element.append(this.fieldset_);

        // bind explicit options to data if specified
        if (options.options) {
            this.setOptions(options.options);
        }

        // publish selected value on checkbox change
        this.fieldset_.addEventListener('change', e => {
            if (e.target instanceof HTMLInputElement) {
                if (e.target.type === 'checkbox') {
                    this.publish(this.selectedValue ?? []);
                }
            }
        });

        // listeners
        this.setupParamListener();
        this.setupActivationListeners(this.fieldset_);
    }

    get selectedValue(): string[] {
        const checked = this.fieldset_.querySelectorAll(
            'input[type="checkbox"]:checked'
        ) as NodeListOf<HTMLInputElement>;
        return Array.from(checked).map(checkbox => checkbox.value);
    }

    set selectedValue(values: string[]) {
        const checkboxes = this.fieldset_.querySelectorAll('input[type="checkbox"]');
        for (const checkbox of checkboxes) {
            const input = checkbox as HTMLInputElement;
            const shouldBeChecked = values.includes(input.value);

            if (input.checked !== shouldBeChecked) {
                input.checked = shouldBeChecked;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    queryResult(data: any): this {
        if (this.options_.options === undefined) {
            this.setData(this.queryResultOptions(data));
        }
        return this;
    }

    update(): this {
        setFieldsetOptions(this.fieldset_, this.data_, 'checkbox');
        this.updateSelectedValue();
        return this;
    }
}
