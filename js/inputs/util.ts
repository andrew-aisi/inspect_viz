import { generateId } from '../util/id';
import { Input } from './input';
import { Option } from './types';

export function createFieldset(legend?: string): HTMLFieldSetElement {
    const fieldset = window.document.createElement('fieldset');

    if (legend) {
        const legendEl = window.document.createElement('legend');
        legendEl.innerText = legend;
        fieldset.append(legend);
    }

    return fieldset;
}

export function setFieldsetOptions(
    fieldset: HTMLFieldSetElement,
    options: Option[],
    type: 'radio' | 'checkbox'
) {
    // remove input elements
    fieldset.querySelectorAll('input, label').forEach(el => {
        el.remove();
    });

    // populate radio buttons
    const name = generateId();
    for (const { value, label } of options || []) {
        const { inputLabel } = createLabeledInput(type, label, name, value);
        fieldset.appendChild(inputLabel);
    }
}

export function createLabeledInput(
    type: 'radio' | 'checkbox',
    label?: string,
    name?: string,
    value?: string
) {
    const inputLabel = window.document.createElement('label');
    const input = window.document.createElement('input');
    input.type = type;
    if (name) {
        input.name = name;
    }
    if (value) {
        input.value = value;
    }
    inputLabel.appendChild(input);
    inputLabel.appendChild(window.document.createTextNode(` ${label || value}`));
    return { inputLabel, input };
}

export function setupActivationListeners(input: Input, element: HTMLElement) {
    // trigger selection activation
    element.addEventListener('pointerenter', evt => {
        if (!evt.buttons) input.activate();
    });
    element.addEventListener('focus', () => input.activate());
}
