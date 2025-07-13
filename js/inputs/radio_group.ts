import { ChoiceInput, ChoiceInputOptions } from './choice';
import { createFieldset, setFieldsetOptions } from './util';

export interface RadioGroupOptions extends ChoiceInputOptions {}

export class RadioGroup extends ChoiceInput {
    private readonly fieldset_: HTMLFieldSetElement;
    constructor(options: RadioGroupOptions) {
        // propagate filterBy
        super(options);

        // outer fieldset
        this.fieldset_ = createFieldset(options.label);
        this.element.append(this.fieldset_);

        // bind explicit options to data if specified
        if (options.options) {
            this.setOptions(options.options);
        }

        // set selected value to "all"
        this.selectedValue = '';

        // publish selected value on radio change
        this.fieldset_.addEventListener('change', e => {
            if (e.target instanceof HTMLInputElement) {
                if (e.target.type === 'radio') {
                    this.publish(this.selectedValue ?? null);
                }
            }
        });

        // listeners
        this.setupParamListener();
        this.setupActivationListeners(this.fieldset_);
    }

    get selectedValue(): string {
        const checked = this.fieldset_.querySelector(
            'input[type="radio"]:checked'
        ) as HTMLInputElement;
        return checked?.value ? (checked.value === 'on' ? '' : checked.value) : '';
    }

    set selectedValue(value: string) {
        value = value === '' ? 'on' : value;
        const radios = this.fieldset_.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
            if ((radio as HTMLInputElement).value === value) {
                (radio as HTMLInputElement).checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    }

    update(): this {
        setFieldsetOptions(this.fieldset_, this.data_, 'radio');
        this.updateSelectedValue();
        return this;
    }
}
