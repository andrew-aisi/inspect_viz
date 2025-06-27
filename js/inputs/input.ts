import {
    coordinator,
    MosaicClient,
    Param,
    Selection,
} from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm';

export interface InputOptions {
    as: Param;
    filterBy?: Selection;
}

export type InputFunction<T extends InputOptions = any> = (options: T) => HTMLElement;

export function input<T extends new (...args: any[]) => Input>(
    InputClass: T,
    ...params: ConstructorParameters<T>
): HTMLElement {
    const input = new InputClass(...params);
    coordinator().connect(input);
    return input.element;
}

export class Input extends MosaicClient {
    public readonly element: HTMLElement;
    constructor(filterBy?: Selection) {
        super(filterBy);
        this.element = document.createElement('div');
        Object.defineProperty(this.element, 'value', { value: this });
    }

    activate() {
        // subclasses should override
    }
}
