import { RadioGroup } from './radio_group';
import { Select } from './select';
import { input, InputFunction } from './input';
import { CheckboxGroup } from './checkbox_group';
import { Checkbox } from './checkbox';
import { Slider } from './slider';
import { Table } from './table';
import { Search } from './search';

export const INPUTS: Record<string, InputFunction> = {
    select: options => input(Select, options),
    slider: options => input(Slider, options),
    search: options => input(Search, options),
    checkbox: options => input(Checkbox, options),
    radio_group: options => input(RadioGroup, options),
    checkbox_group: options => input(CheckboxGroup, options),
    table: options => input(Table, options),
};
