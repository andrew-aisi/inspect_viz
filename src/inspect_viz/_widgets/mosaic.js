// js/widgets/mosaic.ts
import {
  parseSpec
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-spec@0.16.2/+esm";
import { throttle as throttle2 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";

// js/context/index.ts
import { wasmConnector } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
import { InstantiateContext } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-spec@0.16.2/+esm";

// js/inputs/choice.ts
import {
  isParam,
  isSelection,
  clausePoint,
  clausePoints,
  toDataColumns
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
import {
  Query
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm";

// js/util/object.ts
var isObject = (v) => {
  return v !== null && typeof v === "object" && !Array.isArray(v);
};

// js/inputs/input.ts
import {
  coordinator,
  MosaicClient
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
function input(InputClass, ...params) {
  const input2 = new InputClass(...params);
  coordinator().connect(input2);
  return input2.element;
}
var Input = class extends MosaicClient {
  element;
  constructor(filterBy) {
    super(filterBy);
    this.element = document.createElement("div");
    Object.defineProperty(this.element, "value", { value: this });
  }
  activate() {
  }
};

// js/util/id.ts
function generateId() {
  return "id-" + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// js/inputs/util.ts
function createFieldset(legend) {
  const fieldset = window.document.createElement("fieldset");
  if (legend) {
    const legendEl = window.document.createElement("legend");
    legendEl.innerText = legend;
    fieldset.append(legend);
  }
  return fieldset;
}
function setFieldsetOptions(fieldset, options, type) {
  fieldset.querySelectorAll("input, label").forEach((el) => {
    el.remove();
  });
  const name = generateId();
  for (const { value, label } of options || []) {
    const { inputLabel } = createLabeledInput(type, label, name, value);
    fieldset.appendChild(inputLabel);
  }
}
function createLabeledInput(type, label, name, value) {
  const inputLabel = window.document.createElement("label");
  const input2 = window.document.createElement("input");
  input2.type = type;
  if (name) {
    input2.name = name;
  }
  if (value) {
    input2.value = value;
  }
  inputLabel.appendChild(input2);
  inputLabel.appendChild(window.document.createTextNode(` ${label || value}`));
  return { inputLabel, input: input2 };
}
function setupActivationListeners(input2, element) {
  element.addEventListener("pointerenter", (evt) => {
    if (!evt.buttons) input2.activate();
  });
  element.addEventListener("focus", () => input2.activate());
}

// js/inputs/choice.ts
var ChoiceInput = class extends Input {
  constructor(options_) {
    super(options_.filterBy);
    this.options_ = options_;
  }
  data_ = [];
  activate() {
    if (isSelection(this.options_.as) && this.options_.column) {
      const field = this.options_.field || this.options_.column;
      this.options_.as.activate(clausePoint(field, void 0, { source: this }));
    }
  }
  publish(value) {
    const { as, field, column: column2 } = this.options_;
    if (isSelection(as) && column2) {
      let clause = clausePoint(field || column2, void 0, { source: this });
      if (Array.isArray(value) && value.length > 0) {
        clause = clausePoints(
          [field || column2],
          value.map((v) => [v]),
          { source: this }
        );
      } else if (value?.length) {
        clause = clausePoint(field || column2, value, { source: this });
      }
      as.update(clause);
    } else if (isParam(as)) {
      as.update(value);
    }
  }
  query(filter = []) {
    const { from, column: column2 } = this.options_;
    if (!from) {
      return null;
    }
    if (!column2) {
      throw new Error("You must specify a column along with a data source");
    }
    return Query.from(from).select({ value: column2 }).distinct().where(...filter).orderby(column2);
  }
  queryResult(data) {
    this.setData([{ value: "", label: "All" }, ...this.queryResultOptions(data)]);
    return this;
  }
  queryResultOptions(data) {
    const columns = toDataColumns(data);
    const values = columns.columns.value;
    return values.map((v) => ({ value: v }));
  }
  setOptions(options) {
    this.setData(options.map((opt) => isObject(opt) ? opt : { value: opt }));
    this.update();
  }
  setupParamListener() {
    if (!isSelection(this.options_.as)) {
      this.options_.as.addEventListener("value", (value) => {
        this.selectedValue = value;
      });
    }
  }
  setupActivationListeners(element) {
    if (isSelection(this.options_.as)) {
      setupActivationListeners(this, element);
    }
  }
  updateSelectedValue() {
    const value = isSelection(this.options_.as) ? this.options_.as.valueFor(this) : this.options_.as.value;
    this.selectedValue = value === void 0 ? "" : value;
  }
  setData(options) {
    if (!isSelection(this.options_.as)) {
      const paramValue = this.options_.as.value;
      if (paramValue && !Array.isArray(paramValue) && !options.some((option) => option.value === paramValue)) {
        options = [...options, { value: paramValue }];
      }
    }
    this.data_ = options;
  }
};

// js/inputs/radio_group.ts
var RadioGroup = class extends ChoiceInput {
  fieldset_;
  constructor(options) {
    super(options);
    this.fieldset_ = createFieldset(options.label || options.column);
    this.element.append(this.fieldset_);
    if (options.options) {
      this.setOptions(options.options);
    }
    this.selectedValue = "";
    this.fieldset_.addEventListener("change", (e) => {
      if (e.target instanceof HTMLInputElement) {
        if (e.target.type === "radio") {
          this.publish(this.selectedValue ?? null);
        }
      }
    });
    this.setupParamListener();
    this.setupActivationListeners(this.fieldset_);
  }
  get selectedValue() {
    const checked = this.fieldset_.querySelector(
      'input[type="radio"]:checked'
    );
    return checked?.value ? checked.value === "on" ? "" : checked.value : "";
  }
  set selectedValue(value) {
    value = value === "" ? "on" : value;
    const radios = this.fieldset_.querySelectorAll('input[type="radio"]');
    for (const radio of radios) {
      if (radio.value === value) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }
    }
  }
  update() {
    setFieldsetOptions(this.fieldset_, this.data_, "radio");
    this.updateSelectedValue();
    return this;
  }
};

// js/inputs/types.ts
var kSidebarFullwidth = "sidebar-fullwidth";
var kInputSearch = "input-search";

// js/inputs/select.ts
import TomSelect from "https://cdn.jsdelivr.net/npm/tom-select@2.4.3/+esm";
import { isSelection as isSelection2 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
var Select = class extends ChoiceInput {
  select_;
  multiple_;
  allowEmpty_;
  initialValue_;
  tomSelect_ = void 0;
  constructor(options) {
    super(options);
    this.multiple_ = options.multiple ?? false;
    this.allowEmpty_ = options.value === "all";
    this.initialValue_ = options.value === "all" || options.value === "auto" ? void 0 : options.value;
    this.element.classList.add(kSidebarFullwidth);
    const label = options.label || options.column;
    let labelEl = null;
    if (label !== void 0) {
      labelEl = window.document.createElement("label");
      labelEl.innerText = label;
      this.element.appendChild(labelEl);
    }
    this.select_ = document.createElement("select");
    if (options.width) {
      this.select_.style.width = `${options.width}px`;
    }
    this.select_.id = generateId();
    if (labelEl) {
      labelEl.appendChild(this.select_);
    } else {
      this.element.appendChild(this.select_);
    }
    if (options.options) {
      this.setOptions(options.options);
    }
    if (this.initialValue_ !== void 0 && isSelection2(this.options_.as)) {
      this.publish(options.value);
    }
    this.select_.addEventListener("input", () => {
      this.publish(this.selectedValue ?? null);
    });
    this.setupParamListener();
    this.setupActivationListeners(this.select_);
  }
  queryResult(data) {
    if (this.multiple_ || !this.allowEmpty_) {
      this.setData(this.queryResultOptions(data));
      return this;
    } else {
      return super.queryResult(data);
    }
  }
  get selectedValue() {
    return this.tomSelect_?.getValue() ?? "";
  }
  set selectedValue(value) {
    this.tomSelect_?.setValue(value);
  }
  update() {
    if (!this.tomSelect_) {
      if (this.multiple_) {
        this.select_.multiple = true;
      }
      const config = {
        create: false,
        dropdownParent: "body"
      };
      if (!this.select_.multiple) {
        config.allowEmptyOption = this.allowEmpty_;
        config.controlInput = null;
      } else {
        config.plugins = {
          remove_button: {
            title: "Remove this item"
          }
        };
      }
      this.tomSelect_ = new TomSelect(this.select_, config);
      if (this.multiple_) {
        this.tomSelect_.on("item_add", () => {
          this.tomSelect_.control_input.value = "";
          this.tomSelect_?.refreshOptions(false);
        });
      }
      const defaultValue = this.initialValue_ ?? (this.allowEmpty_ ? "" : this.data_?.[0].value);
      const value = isSelection2(this.options_.as) ? defaultValue : this.options_.as.value || defaultValue;
      this.selectedValue = value;
      this.publish(value);
    }
    this.tomSelect_.clearOptions();
    this.tomSelect_.addOptions(
      this.data_.map((o) => ({ value: o.value, text: o.label || o.value }))
    );
    this.tomSelect_.refreshOptions(false);
    this.updateSelectedValue();
    return this;
  }
};

// js/inputs/checkbox_group.ts
var CheckboxGroup = class extends ChoiceInput {
  fieldset_;
  constructor(options) {
    super(options);
    this.fieldset_ = createFieldset(options.label || options.column);
    this.element.append(this.fieldset_);
    if (options.options) {
      this.setOptions(options.options);
    }
    this.fieldset_.addEventListener("change", (e) => {
      if (e.target instanceof HTMLInputElement) {
        if (e.target.type === "checkbox") {
          this.publish(this.selectedValue ?? []);
        }
      }
    });
    this.setupParamListener();
    this.setupActivationListeners(this.fieldset_);
  }
  get selectedValue() {
    const checked = this.fieldset_.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    return Array.from(checked).map((checkbox) => checkbox.value);
  }
  set selectedValue(values) {
    const checkboxes = this.fieldset_.querySelectorAll('input[type="checkbox"]');
    for (const checkbox of checkboxes) {
      const input2 = checkbox;
      const shouldBeChecked = values.includes(input2.value);
      if (input2.checked !== shouldBeChecked) {
        input2.checked = shouldBeChecked;
        input2.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }
  queryResult(data) {
    this.setData(this.queryResultOptions(data));
    return this;
  }
  update() {
    setFieldsetOptions(this.fieldset_, this.data_, "checkbox");
    this.updateSelectedValue();
    return this;
  }
};

// js/inputs/checkbox.ts
import {
  clausePoint as clausePoint2,
  isParam as isParam2,
  isSelection as isSelection3
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
var Checkbox = class extends Input {
  constructor(options_) {
    super(options_.filterBy);
    this.options_ = options_;
    const { inputLabel, input: input2 } = createLabeledInput("checkbox", options_.label);
    input2.id = generateId();
    this.element.appendChild(inputLabel);
    input2.checked = !isSelection3(this.options_.as) ? this.options_.as?.value ?? options_.checked : options_.checked;
    const publish = () => this.publish(
      input2.checked ? options_.values[0] || void 0 : options_.values[1] || void 0
    );
    input2.addEventListener("change", publish);
    publish();
    if (!isSelection3(this.options_.as)) {
      this.options_.as.addEventListener("value", (value) => {
        input2.checked = value === this.options_.values[0];
      });
    } else {
      setupActivationListeners(this, input2);
    }
  }
  activate() {
    if (isSelection3(this.options_.as)) {
      this.options_.as.activate(this.clause());
    }
  }
  clause(value) {
    if (!this.options_.field) {
      throw new Error("checkbox 'field' option must be specified with selection");
    }
    return clausePoint2(this.options_.field, value, { source: this });
  }
  publish(value) {
    if (isSelection3(this.options_.as)) {
      this.options_.as.update(this.clause(value));
    } else if (isParam2(this.options_.as)) {
      this.options_.as.update(value);
    }
  }
};

// js/inputs/slider.ts
import {
  clauseInterval,
  clausePoint as clausePoint3,
  isParam as isParam3,
  isSelection as isSelection4
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
import {
  max,
  min,
  Query as Query2
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm";
import {
  create as createSlider
} from "https://cdn.jsdelivr.net/npm/nouislider@15.8.1/+esm";
var kSliderInput = "slider-input";
var Slider = class extends Input {
  constructor(options_) {
    super(options_.filterBy);
    this.options_ = options_;
    this.element.classList.add(kSliderInput, kSidebarFullwidth);
    const id = generateId();
    const label = options_.label || options_.column;
    let container = this.element;
    if (label) {
      container = window.document.createElement("label");
      container.innerText = label;
      this.element.appendChild(container);
    }
    let { value, width, min: min3, max: max3 } = options_;
    this.slider_ = document.createElement("div");
    this.slider_.classList.add("noUi-round");
    this.slider_.setAttribute("id", id);
    if (width != void 0) {
      this.slider_.style.width = `${+width}px`;
    }
    if (container) {
      container.appendChild(this.slider_);
    } else {
      this.element.appendChild(this.slider_);
    }
    this.sliderApi_ = createSlider(this.slider_, {
      range: { min: 0, max: 0 },
      connect: options_.select === "interval",
      start: options_.select === "interval" ? [0, 0] : 0
    });
    this.curval_ = document.createElement("label");
    this.curval_.setAttribute("class", "slider-value");
    this.element.appendChild(this.curval_);
    if (this.options_.as?.value === void 0) {
      this.publish(value);
    } else if (value === void 0) {
      value = this.options_.as?.value;
    }
    this.updateCurrentValue();
    if (!isSelection4(this.options_.as)) {
      this.options_.as.addEventListener("value", (value2) => {
        if (!areEqual(value2, this.sliderValue)) {
          this.sliderApi_.set(value2);
          this.updateCurrentValue();
        }
      });
    } else {
      setupActivationListeners(this, this.slider_);
    }
    if (!options_.from) {
      min3 = min3 ?? (Array.isArray(value) ? value[0] : value ?? 0);
      max3 = max3 ?? (Array.isArray(value) ? value[1] : value ?? 0);
      const start = value ?? (options_.select === "interval" ? [0, 0] : 0);
      this.updateSlider(min3, max3, start);
      this.sliderApi_.on("update", () => {
        this.updateCurrentValue();
        this.publish(this.sliderValue);
      });
    }
  }
  slider_;
  sliderApi_;
  curval_;
  firstQuery_ = false;
  updateCurrentValue() {
    const value = this.sliderValue;
    if (Array.isArray(value)) {
      this.curval_.innerText = `${value[0].toLocaleString()}-${value[1].toLocaleString()}`;
    } else {
      this.curval_.innerHTML = value.toLocaleString();
    }
  }
  get sliderValue() {
    const value = this.sliderApi_.get();
    if (Array.isArray(value)) {
      return value.map(cleanNumber).slice(0, 2);
    } else {
      return cleanNumber(value);
    }
  }
  set sliderValue(value) {
    this.sliderApi_.set(value, true);
  }
  activate() {
    const target = this.options_.as;
    if (isSelection4(target)) {
      target.activate(this.clause());
    }
  }
  query(filter = []) {
    const { from, column: column2 } = this.options_;
    if (!from || !column2) {
      return null;
    }
    return Query2.select({ min: min(column2), max: max(column2) }).from(from).where(...filter);
  }
  queryResult(data) {
    const { min: dataMin, max: dataMax } = Array.from(data)[0];
    const min3 = this.options_.min ?? dataMin;
    const max3 = this.options_.max ?? dataMax;
    let start = this.sliderValue;
    if (!this.firstQuery_) {
      this.firstQuery_ = true;
      if (this.options_.value === void 0) {
        start = this.options_.select === "interval" ? [min3, max3] : max3;
      } else {
        start = this.options_.value;
      }
      this.updateSlider(min3, max3, start);
      this.sliderApi_.on("update", () => {
        this.updateCurrentValue();
        this.publish(this.sliderValue);
      });
    } else {
      this.updateSlider(min3, max3, start);
    }
    return this;
  }
  updateSlider(min3, max3, start) {
    const step = this.options_.step ?? (min3 >= 5 || max3 >= 5 ? 1 : void 0);
    this.sliderApi_.updateOptions(
      {
        range: {
          min: min3,
          max: max3
        },
        step,
        start
      },
      true
    );
    return this;
  }
  clause(value) {
    let { field, column: column2, min: min3, select = "point" } = this.options_;
    field = field || column2;
    if (!field) {
      throw new Error(
        "You must specify a 'column' or 'field' for a slider targeting a selection."
      );
    }
    if (select === "interval" && value !== void 0) {
      const domain = Array.isArray(value) ? value : [min3 ?? 0, value];
      return clauseInterval(field, domain, {
        source: this,
        bin: "ceil",
        scale: { type: "identity", domain },
        pixelSize: this.options_.step || void 0
      });
    } else {
      return clausePoint3(field, Array.isArray(value) ? value[0] : value, {
        source: this
      });
    }
  }
  publish(value) {
    const target = this.options_.as;
    if (isSelection4(target)) {
      target.update(this.clause(value));
    } else if (isParam3(target)) {
      target.update(value);
    }
  }
};
function areEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.map(cleanNumber) === b.map(cleanNumber);
  } else if (!Array.isArray(a) && !Array.isArray(b)) {
    return cleanNumber(a) === cleanNumber(b);
  } else {
    return false;
  }
}
function cleanNumber(num) {
  if (typeof num === "string") {
    num = parseFloat(num);
  }
  if (!isFinite(num)) return num;
  if (num === 0) return 0;
  const magnitude = Math.abs(num);
  const epsilon = magnitude * Number.EPSILON * 100;
  const rounded = Math.round(num);
  if (Math.abs(num - rounded) < epsilon) {
    return rounded;
  }
  return parseFloat(num.toPrecision(15));
}

// js/inputs/table.ts
import {
  clausePoints as clausePoints2,
  isSelection as isSelection5,
  queryFieldInfo,
  throttle,
  toDataColumns as toDataColumns2
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
import {
  and,
  asc,
  contains,
  desc,
  eq,
  gt,
  gte,
  isNull,
  literal,
  lt,
  lte,
  neq,
  not,
  or,
  prefix,
  suffix,
  Query as Query3,
  sql,
  column,
  avg,
  count,
  sum,
  argmax,
  mad,
  max as max2,
  min as min2,
  product,
  geomean,
  median,
  mode,
  variance,
  stddev,
  skewness,
  kurtosis,
  entropy,
  varPop,
  stddevPop,
  first,
  last,
  stringAgg,
  arrayAgg,
  argmin,
  quantile,
  corr,
  covarPop,
  regrIntercept,
  regrSlope,
  regrCount,
  regrR2,
  regrSXX,
  regrSYY,
  regrSXY,
  regrAvgX,
  regrAvgY
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm";
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  themeBalham
} from "https://cdn.jsdelivr.net/npm/ag-grid-community@33.3.2/+esm";
import * as d3Format from "https://cdn.jsdelivr.net/npm/d3-format@3.1.0/+esm";
import * as d3TimeFormat from "https://cdn.jsdelivr.net/npm/d3-time-format@4.1.0/+esm";
var kAutoRowCount = 12;
var kAutoRowMaxHeight = 380;
var Table = class extends Input {
  constructor(options_) {
    super(options_.filter_by);
    this.options_ = options_;
    ModuleRegistry.registerModules([AllCommunityModule]);
    this.id_ = generateId();
    this.currentRow_ = -1;
    this.element.classList.add("inspect-viz-table");
    if (typeof this.options_.width === "number") {
      this.element.style.width = `${this.options_.width}px`;
    }
    if (this.options_.max_width) {
      this.element.style.maxWidth = `${this.options_.max_width}px`;
    }
    if (this.options_.auto_filling) {
      this.element.style.height = `100%`;
    } else if (this.options_.height && this.options_.height !== "auto") {
      this.element.style.height = `${this.options_.height}px`;
    }
    if (this.options_.style) {
      if (this.options_.style?.background_color) {
        this.element.style.setProperty(
          "--ag-background-color",
          this.options_.style.background_color
        );
      }
      if (this.options_.style?.foreground_color) {
        this.element.style.setProperty(
          "--ag-foreground-color",
          this.options_.style.foreground_color
        );
      }
      if (this.options_.style?.accent_color) {
        this.element.style.setProperty(
          "--ag-accent-color",
          this.options_.style.accent_color
        );
      }
    }
    this.gridContainer_ = document.createElement("div");
    this.gridContainer_.id = this.id_;
    this.gridContainer_.style.width = "100%";
    this.gridContainer_.style.height = "100%";
    this.element.appendChild(this.gridContainer_);
    this.gridOptions_ = this.createGridOptions(this.options_);
  }
  id_;
  columns_ = [];
  columnsByName_ = {};
  columnTypes_ = {};
  gridContainer_;
  grid_ = null;
  gridOptions_;
  currentRow_;
  sortModel_ = [];
  filterModel_ = {};
  data_ = {
    numRows: 0,
    columns: {}
  };
  // contribute a selection clause back to the target selection
  clause(rows = []) {
    const fields = this.getDatabaseColumns().map((column2) => column2.column_id);
    const values = rows.map((row) => {
      return fields.map((f) => this.data_.columns[f][row]);
    });
    return clausePoints2(fields, values, { source: this });
  }
  // mosaic calls this and initialization to let us fetch the schema
  // and do related setup
  async prepare() {
    const table = this.options_.from;
    const schema = await queryFieldInfo(this.coordinator, [{ column: "*", table }]);
    const userColumns = this.options_.columns ? this.options_.columns : schema.map((f) => f.column);
    this.columns_ = resolveColumns(userColumns);
    this.columnsByName_ = this.columns_.reduce(
      (acc, col) => {
        acc[col.column_name] = col;
        return acc;
      },
      {}
    );
    this.columns_.filter((c) => c.type !== "literal").forEach((column2) => {
      const item = schema.find((s) => s.column === column2.column_id);
      if (item) {
        this.columnTypes_[column2.column_name] = item.type;
      }
    });
    this.getLiteralColumns().forEach((c) => {
      const colVal = c.column;
      if (Array.isArray(colVal)) {
        const firstVal = colVal[0];
        const typeStr = typeof firstVal === "boolean" ? "boolean" : typeof firstVal === "number" ? "number" : void 0;
        if (typeStr) {
          this.columnTypes_[c.column_name] = typeStr;
        }
      } else if (typeof colVal === "boolean") {
        this.columnTypes_[c.column_name] = "boolean";
      } else if (typeof colVal === "number") {
        this.columnTypes_[c.column_name] = "number";
      }
    });
    const columnDefs = this.columns_.map((column2) => {
      const t = this.columnTypes_[column2.column_name];
      return this.createColumnDef(column2.column_name, t);
    });
    this.gridOptions_.columnDefs = columnDefs;
    this.grid_ = createGrid(this.gridContainer_, this.gridOptions_);
  }
  // mosaic calls this every time it needs to show data to find
  // out what query we want to run
  query(filter = []) {
    const selectItems = {};
    const groupBy = [];
    let has_aggregate = false;
    for (const column2 of this.getDatabaseColumns()) {
      if (column2.type === "aggregate") {
        const item = aggregateExpression(column2);
        selectItems[item[0]] = item[1];
        has_aggregate = true;
      } else if (column2.type === "column") {
        selectItems[column2.column_id] = column2.column_id;
        groupBy.push(column2.column_id);
      }
    }
    let query = Query3.from(this.options_.from).select(
      Object.keys(selectItems).length ? selectItems : "*"
    );
    if (has_aggregate && groupBy.length > 0) {
      query.groupby(groupBy);
    }
    query = query.where(...filter);
    Object.keys(this.filterModel_).forEach((columnName) => {
      const col = this.columnsByName_[columnName] || {};
      if (col.type !== "literal") {
        const useHaving = col.type === "aggregate";
        const filter2 = this.filterModel_[columnName];
        const expression = filterExpression(columnName, filter2, query);
        if (expression) {
          if (useHaving) {
            query.having(expression);
          } else {
            query = query.where(expression);
          }
        }
      }
    });
    if (this.sortModel_.length > 0) {
      this.sortModel_.forEach((sort) => {
        const col = this.columnsByName_[sort.colId] || {};
        if (col.type !== "literal") {
          query = query.orderby(sort.sort === "asc" ? asc(sort.colId) : desc(sort.colId));
        }
      });
    }
    return query;
  }
  // mosaic returns the results of the query() in this function.
  queryResult(data) {
    this.data_ = toDataColumns2(data);
    return this;
  }
  // requests a client UI update (e.g. to reflect results from a query)
  update() {
    this.updateGrid(null);
    return this;
  }
  updateGrid = throttle(async () => {
    if (!this.grid_) {
      return;
    }
    const rowData = [];
    for (let i = 0; i < this.data_.numRows; i++) {
      const row = {};
      this.columns_.forEach(({ column_name, column: column2 }) => {
        if (Array.isArray(column2)) {
          const index = i % column2.length;
          row[column_name] = column2[index];
        } else if (typeof column2 === "boolean" || typeof column2 === "number") {
          row[column_name] = column2;
        } else {
          row[column_name] = this.data_.columns[column_name][i];
        }
      });
      rowData.push(row);
    }
    this.grid_.setGridOption("rowData", rowData);
    if (this.data_.numRows < kAutoRowCount && this.options_.height === void 0) {
      this.grid_.setGridOption("domLayout", "autoHeight");
    } else if (!this.options_.auto_filling && (this.options_.height === "auto" || this.options_.height === void 0)) {
      this.element.style.height = `${kAutoRowMaxHeight}px`;
    }
  });
  createGridOptions(options) {
    const headerHeightPixels = typeof options.header_height === "string" ? void 0 : options.header_height;
    const hoverSelect = options.select === "hover";
    const explicitSelection = resolveRowSelection(options);
    const gridTheme = themeBalham.withParams({
      textColor: this.options_.style?.text_color,
      headerTextColor: this.options_.style?.header_text_color || this.options_.style?.text_color,
      cellTextColor: this.options_.style?.cell_text_color,
      fontFamily: this.options_.style?.font_family,
      headerFontFamily: this.options_.style?.header_font_family || this.options_.style?.font_family,
      cellFontFamily: this.options_.style?.cell_font_family || this.options_.style?.font_family,
      spacing: this.options_.style?.spacing || 4,
      borderColor: this.options_.style?.border_color,
      borderRadius: this.options_.style?.border_radius,
      selectedRowBackgroundColor: this.options_.style?.selected_row_background_color
    });
    const domLayout = this.options_.height === "auto" ? "autoHeight" : void 0;
    return {
      // always pass filter to allow server-side filtering
      pagination: !!options.pagination,
      paginationAutoPageSize: options.pagination?.page_size === "auto" || options.pagination?.page_size === void 0,
      paginationPageSizeSelector: options.pagination?.page_size_selector,
      paginationPageSize: typeof options.pagination?.page_size === "number" ? options.pagination.page_size : void 0,
      animateRows: false,
      headerHeight: headerHeightPixels,
      rowHeight: options.row_height,
      domLayout,
      columnDefs: [],
      rowData: [],
      rowSelection: explicitSelection,
      suppressCellFocus: true,
      enableCellTextSelection: true,
      theme: gridTheme,
      onFilterChanged: () => {
        this.filterModel_ = this.grid_?.getFilterModel() || {};
        this.requestQuery();
      },
      onSortChanged: () => {
        if (this.grid_) {
          const sortModel = this.grid_.getColumnState().filter((col) => col.sort).map((col) => ({ colId: col.colId, sort: col.sort }));
          this.sortModel_ = sortModel;
          this.requestQuery();
        }
      },
      onSelectionChanged: (event) => {
        if (explicitSelection !== void 0 && isSelection5(this.options_.as)) {
          if (event.selectedNodes) {
            const rowIndices = event.selectedNodes.map((n) => n.rowIndex).filter((n) => n !== null);
            this.options_.as.update(this.clause(rowIndices));
          }
        }
      },
      onCellMouseOver: (event) => {
        if (hoverSelect && isSelection5(this.options_.as)) {
          const rowIndex = event.rowIndex;
          if (rowIndex !== void 0 && rowIndex !== null && rowIndex !== this.currentRow_) {
            this.currentRow_ = rowIndex;
            this.options_.as.update(this.clause([rowIndex]));
          }
        }
      },
      onCellMouseOut: () => {
        if (hoverSelect && isSelection5(this.options_.as)) {
          this.currentRow_ = -1;
          this.options_.as.update(this.clause());
        }
      },
      onGridReady: () => {
        this.patchGrid();
      }
    };
  }
  getLiteralColumns() {
    return this.columns_.filter((c) => c.type === "literal");
  }
  getDatabaseColumns() {
    return this.columns_.filter((c) => c.type === "column" || c.type === "aggregate");
  }
  createColumnDef(column_name, type) {
    const column2 = this.columnsByName_[column_name] || {};
    const align = column2.align || (type === "number" ? "right" : "left");
    const headerAlignment = column2.header_align;
    const formatter = formatterForType(type, column2.format);
    const sortable = this.options_.sorting !== false && column2.sortable !== false;
    const filterable = this.options_.filtering !== false && column2.filterable !== false;
    const resizable = column2.resizable !== false;
    const minWidth = column2.min_width;
    const maxWidth = column2.max_width;
    const autoHeight = column2.auto_height;
    const autoHeaderHeight = this.options_.header_height === "auto" && column2.header_auto_height !== false;
    const wrapText = column2.wrap_text;
    const wrapHeaderText = column2.header_wrap_text;
    const flex = column2.flex;
    const disableClientSort = (_valueA, _valueB) => {
      return 0;
    };
    const colDef = {
      field: column_name,
      headerName: column2.label || column_name,
      headerClass: headerClasses(headerAlignment),
      cellStyle: { textAlign: align },
      comparator: column2.type !== "literal" ? disableClientSort : void 0,
      filter: !filterable ? false : filterForColumnType(type),
      flex,
      sortable,
      resizable,
      minWidth,
      maxWidth,
      autoHeight,
      autoHeaderHeight,
      wrapText,
      wrapHeaderText,
      floatingFilter: this.options_.filtering === "row",
      // Disable column moving
      suppressMovable: true,
      valueFormatter: (params) => {
        const value = params.value;
        if (formatter && value !== null && value !== void 0) {
          return formatter(value);
        }
        return value;
      }
    };
    const width = column2.width;
    if (width) {
      colDef.width = width;
    } else if (flex === void 0 || flex === null) {
      colDef.flex = 1;
    }
    return colDef;
  }
  patchGrid() {
    if (!this.grid_) {
      return;
    }
    const columns = this.grid_.getColumns();
    if (columns) {
      columns.forEach(async (column2) => {
        const colId = column2.getColId();
        const filterInstance = await this.grid_.getColumnFilterInstance(colId);
        const col = this.columnsByName_[colId] || {};
        if (filterInstance && typeof filterInstance.doesFilterPass === "function" && col.type !== "literal") {
          filterInstance.doesFilterPass = () => true;
        }
      });
    }
  }
  // all mosaic inputs implement this, not exactly sure what it does
  activate() {
    if (isSelection5(this.options_.as)) {
      this.options_.as.activate(this.clause([]));
    }
  }
};
var resolveColumns = (columns) => {
  let columnCount = 1;
  const incrementedColumnName = () => {
    return `col_${columnCount++}`;
  };
  return columns.map((col) => {
    if (typeof col === "string") {
      return {
        column_name: col,
        column_id: col,
        column: col,
        type: "column"
      };
    } else if (typeof col === "object" && col !== null) {
      if (typeof col.column === "string") {
        return {
          ...col,
          column_name: col.column,
          column_id: col.column,
          type: "column"
        };
      } else if (typeof col.column === "number") {
        return {
          ...col,
          column_name: incrementedColumnName(),
          column: col.column,
          type: "literal"
        };
      } else if (typeof col.column === "boolean") {
        return {
          ...col,
          column_name: incrementedColumnName(),
          column: col.column,
          type: "literal"
        };
      } else if (Array.isArray(col.column)) {
        if (col.column.length === 0) {
          throw new Error("Empty array column is not supported");
        }
        return {
          ...col,
          column_name: incrementedColumnName(),
          column: col.column,
          type: "literal"
        };
      } else if (typeof col.column === "object") {
        const agg = Object.keys(col.column)[0];
        const targetColumn = col.column[agg];
        return {
          ...col,
          column_name: `${agg}_${targetColumn}`,
          column_id: targetColumn,
          agg_expr: agg,
          agg_expr_args: [targetColumn],
          type: "aggregate"
        };
      } else {
        throw new Error("Unsupported column type: " + typeof col.column);
      }
    } else {
      throw new Error(`Invalid column definition: ${col}`);
    }
  });
};
var headerClasses = (align) => {
  if (!align) {
    return void 0;
  }
  return [`header-${align}`];
};
var resolveRowSelection = (options) => {
  if (options.select === "hover") {
    return void 0;
  }
  const selectType = options.select || "single_row";
  if (selectType.startsWith("single_")) {
    return {
      mode: "singleRow",
      checkboxes: options.select === "single_checkbox",
      enableClickSelection: options.select === "single_row"
    };
  } else if (selectType.startsWith("multiple_")) {
    return {
      mode: "multiRow",
      selectAll: "filtered",
      checkboxes: options.select === "multiple_checkbox"
    };
  } else {
    throw new Error("Invalid select option: " + options.select);
  }
};
var filterForColumnType = (type) => {
  switch (type) {
    case "number":
    case "integer":
    case "float":
    case "decimal":
      return "agNumberColumnFilter";
    case "date":
    case "datetime":
    case "timestamp":
      return "agDateColumnFilter";
    case "boolean":
      return "agTextColumnFilter";
    default:
      return "agTextColumnFilter";
  }
};
var formatterForType = (type, formatStr) => {
  switch (type) {
    case "integer":
      return d3Format.format(formatStr || ",");
    case "number":
    case "float":
      return d3Format.format(formatStr || ",.2~f");
    case "decimal":
      return d3Format.format(formatStr || ",.4~f");
    case "date":
      return d3TimeFormat.timeFormat(formatStr || "%Y-%m-%d");
    case "datetime":
    case "timestamp":
      return d3TimeFormat.timeFormat(formatStr || "%Y-%m-%d %H:%M:%S");
    case "boolean":
    case "string":
    default:
      return void 0;
  }
};
var filterExpression = (colId, filter, query) => {
  if (isCombinedSimpleModel(filter)) {
    const operator = filter.operator === "AND" ? and : or;
    const expressions = filter.conditions?.map((f) => {
      return filterExpression(colId, f, query);
    }).filter((e) => e !== void 0);
    if (expressions && expressions.length > 0) {
      return operator(...expressions);
    }
  } else if (isTextFilter(filter)) {
    return simpleExpression(colId, filter.type, filter.filter, void 0, true);
  } else if (isNumberFilter(filter)) {
    return simpleExpression(colId, filter.type, filter.filter);
  } else if (isMultiFilter(filter)) {
    const expr = filter.filterModels?.map((f) => {
      return filterExpression(colId, f, query);
    }).filter((e) => e !== void 0);
    if (expr && expr.length > 0) {
      return and(...expr);
    }
  } else if (isDateFilter(filter)) {
    return simpleExpression(colId, filter.type, filter.dateFrom, filter.dateTo || void 0);
  } else if (isSetFilter(filter)) {
    console.warn("Set filter not implemented");
  }
};
var simpleExpression = (colId, type, filter, filterTo = void 0, textColumn = false) => {
  switch (type) {
    case "equals":
      return eq(colId, literal(filter));
    case "notEqual":
      return neq(colId, literal(filter));
    case "contains":
      if (textColumn) {
        return sql`${column(colId)} ILIKE ${literal("%" + filter + "%")}`;
      } else {
        return contains(colId, String(filter));
      }
    case "notContains":
      return not(contains(colId, String(filter)));
    case "blank":
      return isNull(colId);
    case "notBlank":
      return not(isNull(colId));
    case "startsWith":
      return prefix(colId, String(filter));
    case "endsWith":
      return suffix(colId, String(filter));
    case "greaterThan":
      return gt(colId, literal(filter));
    case "lessThan":
      return lt(colId, literal(filter));
    case "greaterThanOrEqual":
      return gte(colId, literal(filter));
    case "lessThanOrEqual":
      return lte(colId, literal(filter));
    case "inRange":
      if (filterTo !== void 0 && filterTo !== null) {
        return gte(colId, literal(filter)), lte(colId, literal(filterTo));
      }
      break;
    default:
      console.warn(`Unsupported filter type: ${type}`);
  }
  return void 0;
};
var aggregateExpression = (c) => {
  const aggExpr = c.agg_expr;
  const firstArg = () => {
    if (c.agg_expr_args.length > 0) {
      return c.agg_expr_args[0];
    }
    throw new Error(`Aggregate expression ${aggExpr} requires at least one argument`);
  };
  const secondArg = () => {
    if (c.agg_expr_args.length > 1) {
      return c.agg_expr_args[1];
    }
    throw new Error(`Aggregate expression ${aggExpr} requires at least two arguments`);
  };
  const r = (val) => {
    return [c.column_name, val];
  };
  switch (aggExpr) {
    case "count":
      return r(count(firstArg()));
    case "sum":
      return r(sum(firstArg()));
    case "avg":
      return r(avg(firstArg()));
    case "argmax":
      return r(argmax(firstArg(), secondArg()));
    case "mad":
      return r(mad(firstArg()));
    case "max":
      return r(max2(firstArg()));
    case "min":
      return r(min2(firstArg()));
    case "product":
      return r(product(firstArg()));
    case "geomean":
      return r(geomean(firstArg()));
    case "median":
      return r(median(firstArg()));
    case "mode":
      return r(mode(firstArg()));
    case "variance":
      return r(variance(firstArg()));
    case "stddev":
      return r(stddev(firstArg()));
    case "skewness":
      return r(skewness(firstArg()));
    case "kurtosis":
      return r(kurtosis(firstArg()));
    case "entropy":
      return r(entropy(firstArg()));
    case "varPop":
      return r(varPop(firstArg()));
    case "stddevPop":
      return r(stddevPop(firstArg()));
    case "first":
      return r(first(firstArg()));
    case "last":
      return r(last(firstArg()));
    case "stringAgg":
      return r(stringAgg(firstArg()));
    case "arrayAgg":
      return r(arrayAgg(firstArg()));
    case "argmin":
      return r(argmin(firstArg(), secondArg()));
    case "quantile":
      return r(quantile(firstArg(), secondArg()));
    case "corr":
      return r(corr(firstArg(), secondArg()));
    case "covarPop":
      return r(covarPop(firstArg(), secondArg()));
    case "regrIntercept":
      return r(regrIntercept(firstArg(), secondArg()));
    case "regrSlope":
      return r(regrSlope(firstArg(), secondArg()));
    case "regrCount":
      return r(regrCount(firstArg(), secondArg()));
    case "regrR2":
      return r(regrR2(firstArg(), secondArg()));
    case "regrSXX":
      return r(regrSXX(firstArg(), secondArg()));
    case "regrSYY":
      return r(regrSYY(firstArg(), secondArg()));
    case "regrSXY":
      return r(regrSXY(firstArg(), secondArg()));
    case "regrAvgX":
      return r(regrAvgX(firstArg(), secondArg()));
    case "regrAvgY":
      return r(regrAvgY(firstArg(), secondArg()));
    default:
      throw new Error(`Unsupported aggregate expression: ${aggExpr}.`);
  }
};
var isCombinedSimpleModel = (filter) => {
  return typeof filter === "object" && filter !== null && "operator" in filter && "conditions" in filter && (filter.operator === "AND" || filter.operator === "OR") && typeof filter.conditions === "object";
};
var isTextFilter = (filter) => {
  return filter?.filterType === "text";
};
var isNumberFilter = (filter) => {
  return filter?.filterType === "number";
};
var isDateFilter = (filter) => {
  return filter?.filterType === "date" || filter?.filterType === "dateString";
};
var isMultiFilter = (filter) => {
  return filter?.filterType === "multi" && "filterModels" in filter;
};
var isSetFilter = (filter) => {
  return filter?.filterType === "set";
};

// js/inputs/search.ts
import {
  clauseMatch,
  isParam as isParam4,
  isSelection as isSelection6
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
import { Query as Query4 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm";
var Search = class extends Input {
  constructor(options_) {
    super(options_.filterBy);
    this.options_ = options_;
    this.element.classList.add(kSidebarFullwidth);
    if (options_.label) {
      const inputLabel = window.document.createElement("label");
      inputLabel.setAttribute("for", this.id_);
      inputLabel.innerText = options_.label;
      this.element.appendChild(inputLabel);
    }
    this.input_ = window.document.createElement("input");
    this.input_.autocomplete = "off";
    this.input_.classList.add(kInputSearch);
    this.input_.id = this.id_;
    this.input_.type = "text";
    if (this.options_.placeholder) {
      this.input_.setAttribute("placeholder", this.options_.placeholder);
    }
    if (this.options_.width) {
      this.input_.style.width = `${options_.width}px`;
    }
    this.element.appendChild(this.input_);
    this.input_.addEventListener("input", () => {
      this.publish(this.input_.value);
    });
    if (!isSelection6(this.options_.as)) {
      this.options_.as.addEventListener("value", (value) => {
        if (value !== this.input_.value) {
          this.input_.value = value;
        }
      });
    } else {
      setupActivationListeners(this, this.input_);
    }
  }
  input_;
  id_ = generateId();
  data_ = [];
  datalist_;
  reset() {
    this.input_.value = "";
  }
  clause(value) {
    const field = this.options_.field || this.options_.column;
    return clauseMatch(field, value, { source: this, method: this.options_.type });
  }
  activate() {
    if (isSelection6(this.options_.as)) {
      this.options_.as.activate(this.clause(""));
    }
  }
  publish(value) {
    if (isSelection6(this.options_.as)) {
      this.options_.as.update(this.clause(value));
    } else if (isParam4(this.options_.as)) {
      this.options_.as.update(value);
    }
  }
  query(filter = []) {
    return Query4.from(this.options_.from).select({ list: this.options_.column }).distinct().where(...filter);
  }
  queryResult(data) {
    this.data_ = data;
    return this;
  }
  update() {
    const list = document.createElement("datalist");
    const id = `${this.id_}_list`;
    list.setAttribute("id", id);
    for (const d of this.data_) {
      const opt = document.createElement("option");
      opt.setAttribute("value", d.list);
      list.append(opt);
    }
    if (this.datalist_) {
      this.datalist_.remove();
    }
    this.element.appendChild(this.datalist_ = list);
    this.input_.setAttribute("list", id);
    return this;
  }
};

// js/inputs/index.ts
var INPUTS = {
  select: (options) => input(Select, options),
  slider: (options) => input(Slider, options),
  search: (options) => input(Search, options),
  checkbox: (options) => input(Checkbox, options),
  radio_group: (options) => input(RadioGroup, options),
  checkbox_group: (options) => input(CheckboxGroup, options),
  table: (options) => input(Table, options)
};

// js/context/duckdb.ts
import {
  getJsDelivrBundles,
  selectBundle,
  AsyncDuckDB,
  ConsoleLogger,
  LogLevel
} from "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm";

// js/util/async.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// js/context/duckdb.ts
async function initDuckdb() {
  const JSDELIVR_BUNDLES = getJsDelivrBundles();
  const bundle = await selectBundle(JSDELIVR_BUNDLES);
  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript"
    })
  );
  const worker = new Worker(worker_url);
  const logger = new ConsoleLogger(LogLevel.WARNING);
  const db = new AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);
  return { db, worker };
}
async function waitForTable(conn, table, { interval = 250 } = {}) {
  while (true) {
    try {
      const res = await conn.query(
        `SELECT 1
           FROM information_schema.tables
         WHERE table_schema = 'main'
           AND table_name   = '${table}'
         LIMIT 1`
      );
      if (res.numRows) return;
    } catch (err) {
      console.log(
        `Table ${table} not yet available, trying again in ${interval}ms (error: ${err})`
      );
    }
    await sleep(interval);
  }
}

// js/util/errors.ts
function initializeErrorHandling(ctx, worker) {
  window.addEventListener("error", (event) => {
    ctx.recordUnhandledError(errorInfo(event.error));
  });
  window.addEventListener("unhandledrejection", (event) => {
    ctx.recordUnhandledError(errorInfo(event.reason));
  });
  worker.addEventListener("message", (event) => {
    if (event.data.type === "ERROR") {
      ctx.recordUnhandledError(errorInfo(event.data.data.message));
    }
  });
}
function errorInfo(error) {
  if (isError(error)) {
    return {
      name: error.name || "Error",
      message: error.message || "An unknown error occurred",
      stack: error.stack || "",
      code: error.code || null,
      ...error
      // Include any custom properties
    };
  } else if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
      stack: new Error().stack || "",
      code: null
    };
  } else {
    return {
      name: "Unknown Error",
      message: JSON.stringify(error, null, 2),
      stack: new Error().stack || "",
      code: null,
      originalValue: error
    };
  }
}
function errorAsHTML(error) {
  const colors = {
    bg: "#ffffff",
    border: "#dc3545",
    title: "#dc3545",
    text: "#212529",
    subtext: "#6c757d",
    codeBg: "#f8f9fa",
    link: "#007bff"
  };
  const stackLines = parseStackTrace(error.stack);
  let html = `
    <div style="
      background: ${colors.bg};
      border: 2px solid ${colors.border};
      border-radius: 8px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      color: ${colors.text};
      margin: 10px 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      width: 100%;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="margin-right: 10px;">
          <circle cx="12" cy="12" r="10" stroke="${colors.title}" stroke-width="2" fill="none"/>
          <path d="M12 8v5m0 4h.01" stroke="${colors.title}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3 style="margin: 0; color: ${colors.title}; font-size: 20px; font-weight: 600;">
          ${escapeHtml(error.name)}
        </h3>
      </div>
      
      <div style="
        background: ${colors.codeBg};
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 15px;
        border-left: 4px solid ${colors.border};
      ">
        <p style="margin: 0; font-size: 13px; line-height: 1.5; font-family: monospace; white-space: pre-wrap;">${escapeHtml(error.message)}</p>
      </div>`;
  if (error.code !== null) {
    html += `
      <div style="margin-bottom: 10px;">
        <span style="color: ${colors.subtext}; font-size: 143x;">Error Code:</span>
        <span style="color: ${colors.text}; font-weight: 500; margin-left: 8px;">
          ${escapeHtml(String(error.code))}
        </span>
      </div>`;
  }
  if (stackLines.length > 0) {
    html += `
      <details style="margin-top: 15px;">
        <summary style="
          cursor: pointer;
          color: ${colors.subtext};
          font-size: 13px;
          font-weight: 500;
          outline: none;
          user-select: none;
        ">
          Stack Trace (${stackLines.length} frames)
        </summary>
        <div style="margin-top: 10px; font-size: 13px; font-family: monospace;">`;
    stackLines.forEach((line, i) => {
      html += `
        <div style="
          background: ${i % 2 === 0 ? colors.codeBg : "transparent"};
          border-radius: 4px;
          margin: 2px 0;
          display: flex;
          align-items: center;
        ">
          <span style="color: ${colors.subtext}; min-width: 24px;">${i + 1}.</span>
          <span style="color: ${colors.link}; margin-left: 8px;">
            ${escapeHtml(line)}
          </span>
        </div>`;
    });
    html += `
        </div>
      </details>`;
  }
  html += `</div>`;
  return html;
}
function displayRenderError(error, renderEl) {
  renderEl.setAttribute("style", "");
  renderEl.innerHTML = errorAsHTML(error);
}
function parseStackTrace(stack) {
  if (!stack) return [];
  const lines = stack.split("\n");
  const functions = [];
  const patterns = [
    // Chrome/Edge: "    at functionName (file:line:column)"
    /^\s*at\s+(.+?)\s+\(/,
    // Chrome/Edge: "    at file:line:column" (anonymous)
    /^\s*at\s+[^(]+$/,
    // Firefox/Safari: "functionName@file:line:column"
    /^(.+?)@/
  ];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "Error") continue;
    let functionName = "anonymous";
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        if (match[1]) {
          functionName = match[1].trim();
        }
        break;
      }
    }
    if (functionName === "anonymous" && !patterns.some((p) => p.test(trimmed))) {
      functionName = trimmed;
    }
    functions.push(functionName);
  }
  return functions;
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
function isError(value) {
  return value instanceof Error;
}

// js/context/index.ts
var VizContext = class extends InstantiateContext {
  constructor(conn_, plotDefaults) {
    super({ plotDefaults });
    this.conn_ = conn_;
    this.api = { ...this.api, ...INPUTS };
    this.coordinator.databaseConnector(wasmConnector({ connection: this.conn_ }));
  }
  tables_ = /* @__PURE__ */ new Set();
  unhandledErrors_ = [];
  async insertTable(table, data) {
    if (this.tables_.has(table)) {
      await this.waitForTable(table);
      return;
    }
    this.tables_.add(table);
    await this.conn_?.insertArrowFromIPCStream(data, {
      name: table,
      create: true
    });
  }
  async waitForTable(table) {
    await waitForTable(this.conn_, table);
  }
  recordUnhandledError(error) {
    this.unhandledErrors_.push(error);
  }
  async collectUnhandledError(wait = 1e3) {
    const startTime = Date.now();
    while (Date.now() - startTime < wait) {
      if (this.unhandledErrors_.length > 0) {
        return this.unhandledErrors_.shift();
      }
      await sleep(100);
    }
    return void 0;
  }
  clearUnhandledErrors() {
    this.unhandledErrors_ = [];
  }
};
var VIZ_CONTEXT_KEY = Symbol.for("@@inspect-viz-context");
async function vizContext(plotDefaults) {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  if (!globalScope[VIZ_CONTEXT_KEY]) {
    globalScope[VIZ_CONTEXT_KEY] = (async () => {
      const { db, worker } = await initDuckdb();
      const conn = await db.connect();
      const ctx = new VizContext(conn, plotDefaults);
      initializeErrorHandling(ctx, worker);
      return ctx;
    })();
  }
  return globalScope[VIZ_CONTEXT_KEY];
}

// js/util/platform.ts
function isNotebook() {
  const win = window;
  const hasNotebookGlobal = typeof win.Jupyter !== "undefined" || typeof win._JUPYTERLAB !== "undefined" || typeof win.google !== "undefined" && win.google.colab || typeof win.IPython !== "undefined" || typeof win.mo !== "undefined" || typeof win.acquireVsCodeApi !== "undefined";
  return hasNotebookGlobal || isVSCodeNotebook();
}
function isVSCodeNotebook() {
  return window.location.protocol === "vscode-webview:" && window.location.search.includes("purpose=notebookRenderer");
}

// js/plot/tooltips.ts
import svgPathParser from "https://cdn.jsdelivr.net/npm/svg-path-parser@1.1.0/+esm";
import tippy from "https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/+esm";
var replaceTooltipImpl = (specEl) => {
  configureSpecSvgTooltips(specEl);
  const observer = new MutationObserver(() => {
    configureSpecSvgTooltips(specEl);
  });
  observer.observe(specEl, { childList: true, subtree: true });
};
var configuredSvgs = /* @__PURE__ */ new WeakSet();
var configureSpecSvgTooltips = (specEl) => {
  const childSvgEls = specEl.querySelectorAll("svg");
  childSvgEls.forEach((svgEl) => {
    if (svgEl && !configuredSvgs.has(svgEl)) {
      setupTooltipObserver(svgEl, specEl);
      configuredSvgs.add(svgEl);
      return;
    }
  });
};
var tooltipInstance = void 0;
function hideTooltip() {
  tooltipInstance.hide();
  window.removeEventListener("scroll", hideTooltip);
}
function showTooltip() {
  tooltipInstance.show();
  window.addEventListener("scroll", hideTooltip, { once: true });
}
var setupTooltipObserver = (svgEl, specEl) => {
  if (!tooltipInstance) {
    tooltipInstance = tippy(specEl, {
      trigger: "manual",
      theme: "inspect"
    });
  }
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        const tipElements = svgEl.querySelectorAll('g[aria-label="tip"]');
        if (tipElements.length === 1) {
          const tipContainerEl = tipElements[0];
          tipContainerEl.style.display = "none";
          const tipEl = tipContainerEl.firstChild;
          if (!tipEl) {
            hideTooltip();
          } else {
            const parsed = parseSVGTooltip(tipEl);
            const svgPoint = svgEl.createSVGPoint();
            svgPoint.x = parsed.transform?.x || 0;
            svgPoint.y = parsed.transform?.y || 0;
            const screenPoint = svgPoint.matrixTransform(svgEl.getScreenCTM());
            const centerX = screenPoint.x;
            const centerY = screenPoint.y;
            tooltipInstance.setProps({
              placement: parsed.placement !== "middle" ? parsed.placement || "top" : "top",
              getReferenceClientRect: () => {
                return {
                  width: 0,
                  height: 0,
                  top: centerY,
                  bottom: centerY,
                  left: centerX,
                  right: centerX,
                  x: centerX,
                  y: centerY,
                  toJSON: () => {
                  }
                };
              },
              arrow: parsed.placement !== "middle",
              offset: parsed.placement === "middle" ? [0, 0] : void 0,
              popperOptions: (
                // Special handling for middle placement, which isn't a supported
                // tippy placement
                parsed.placement === "middle" ? {
                  modifiers: [
                    {
                      name: "preventOverflow",
                      enabled: false
                    },
                    {
                      name: "flip",
                      enabled: false
                    },
                    {
                      name: "customMiddle",
                      enabled: true,
                      phase: "main",
                      fn: ({ state }) => {
                        state.modifiersData.popperOffsets.x = centerX - state.rects.popper.width / 2;
                        state.modifiersData.popperOffsets.y = centerY - state.rects.popper.height / 2;
                      }
                    }
                  ]
                } : void 0
              )
            });
            const contentEl = document.createElement("div");
            contentEl.classList.add("inspect-tip-container");
            let count2 = 0;
            for (const row of parsed.values) {
              const rowEl = document.createElement("div");
              rowEl.className = "inspect-tip-row";
              contentEl.appendChild(rowEl);
              const keyEl = document.createElement("div");
              keyEl.className = "inspect-tip-key";
              keyEl.append(document.createTextNode(row.key));
              const valueEl = document.createElement("div");
              valueEl.className = "inspect-tip-value";
              valueEl.append(document.createTextNode(row.value));
              if (row.color) {
                const colorEl = document.createElement("span");
                colorEl.className = "inspect-tip-color";
                colorEl.style.backgroundColor = row.color;
                valueEl.append(colorEl);
              }
              rowEl.appendChild(keyEl);
              rowEl.appendChild(valueEl);
              count2++;
            }
            tooltipInstance.setContent(contentEl);
            showTooltip();
          }
        } else {
          throw new Error(
            `Expected exactly one tip element, found ${tipElements.length}`
          );
        }
      }
    });
  });
  observer.observe(svgEl, {
    childList: true,
    subtree: true
  });
};
var parseSVGTooltip = (tipEl) => {
  const result = { values: [] };
  const transformVal = tipEl.getAttribute("transform");
  if (transformVal) {
    const match = transformVal.match(/translate\(([^)]+)\)/);
    if (match) {
      const [x, y] = match[1].split(",").map(Number);
      result.transform = { x, y };
    }
  }
  const tspanEls = tipEl.querySelectorAll("tspan");
  tspanEls.forEach((tspan) => {
    let key = void 0;
    let value = void 0;
    let color = void 0;
    tspan.childNodes.forEach((node) => {
      if (node.nodeName === "tspan") {
        const colorAttr = node.getAttribute("fill");
        if (colorAttr) {
          color = colorAttr;
        } else {
          key = node.textContent?.trim();
        }
      } else if (node.nodeName === "#text") {
        value = node.textContent?.trim();
      }
    });
    if (key !== void 0 && value !== void 0) {
      result.values.push({ key, value, color });
    }
  });
  const pathEl = tipEl.querySelector("path");
  if (pathEl) {
    const pathData = pathEl.getAttribute("d");
    if (pathData) {
      result.placement = parseArrowDirection(pathData);
    }
  }
  return result;
};
var parseArrowPosition = (a, b) => {
  if (a < b) {
    return "end";
  } else if (a > b) {
    return "start";
  } else {
    return "center";
  }
};
var parseArrowDirection = (pathData) => {
  const parsed = svgPathParser.parseSVG(pathData);
  if (parsed.length < 3) {
    return "top";
  }
  const moveTo = parsed[0];
  if (moveTo.code !== "M") {
    console.warn("Expected moveto command (M) in path data, found:", moveTo);
    return "top";
  }
  if (moveTo.x !== 0 && moveTo.y !== 0) {
    return "middle";
  }
  const lineTo = parsed[1];
  if (lineTo.code !== "l") {
    console.warn("Expected lineto command (l) in path data, found:", lineTo);
    return "top";
  }
  const firstEdgeLineTo = parsed[2];
  if (firstEdgeLineTo.code !== "h" && firstEdgeLineTo.code !== "v") {
    console.warn(
      "Expected horizontal (h) or vertical (v) line command after move, found:",
      firstEdgeLineTo
    );
    return "top";
  }
  const lastEdgeLineTo = parsed[parsed.length - 2];
  if (lastEdgeLineTo.code !== "h" && lastEdgeLineTo.code !== "v") {
    console.warn(
      "Expected horizontal (h) or vertical (v) line command before close, found:",
      lastEdgeLineTo
    );
    return "top";
  }
  const x = lineTo.x;
  const y = lineTo.y;
  let arrowDirection = "top";
  if (x > 0 && y > 0) {
    arrowDirection = "bottom";
  } else if (x < 0 && y < 0) {
    if (firstEdgeLineTo.code === "h") {
      arrowDirection = "bottom";
    } else {
      arrowDirection = "left";
    }
  } else if (x > 0 && y < 0) {
    if (firstEdgeLineTo.code === "h") {
      arrowDirection = "top";
    } else {
      arrowDirection = "right";
    }
  } else if (x < 0 && y > 0) {
    arrowDirection = "bottom";
  } else {
    console.warn(
      "Could not determine arrow direction from path data, returning default placement: top"
    );
  }
  let arrowPosition = "center";
  if (firstEdgeLineTo.code === "h") {
    arrowPosition = parseArrowPosition(firstEdgeLineTo.x, lastEdgeLineTo.x);
  } else {
    arrowPosition = parseArrowPosition(firstEdgeLineTo.y, lastEdgeLineTo.y);
  }
  if (arrowPosition === "center") {
    return arrowDirection;
  } else {
    return `${arrowDirection}-${arrowPosition}`;
  }
};

// js/widgets/mosaic.ts
async function render({ model, el }) {
  const spec = JSON.parse(model.get("spec"));
  const plotDefaultsSpec = { plotDefaults: spec.plotDefaults, vspace: 0 };
  const plotDefaultsAst = parseSpec(plotDefaultsSpec);
  const ctx = await vizContext(plotDefaultsAst.plotDefaults);
  const tables = model.get("tables") || {};
  await syncTables(ctx, tables);
  el.classList.add("mosaic-widget");
  const renderOptions = renderSetup(el);
  const inputs = new Set(Object.keys(INPUTS));
  if (renderOptions.autoFillScrolling && isPlotSpec(spec)) {
    el.style.width = "100%";
    el.style.height = "400px";
  }
  if (renderOptions.autoFill && isTableSpec(spec)) {
    const card = el.closest(".card-body");
    if (card) {
      card.style.padding = "0";
    }
  }
  const renderSpec = async () => {
    try {
      ctx.clearUnhandledErrors();
      const targetSpec = renderOptions.autoFill ? responsiveSpec(spec, el) : spec;
      const ast = parseSpec(targetSpec, { inputs });
      const specEl = await astToDOM(ast, ctx);
      el.innerHTML = "";
      el.appendChild(specEl);
      replaceTooltipImpl(specEl);
      await displayUnhandledErrors(ctx, el);
    } catch (e) {
      console.error(e);
      const error = errorInfo(e);
      el.innerHTML = errorAsHTML(error);
    }
  };
  await renderSpec();
  if (renderOptions.autoFill && !isInputSpec(spec)) {
    let lastContainerWidth = el.clientWidth;
    let lastContainerHeight = el.clientHeight;
    const resizeObserver = new ResizeObserver(
      throttle2(async () => {
        if (lastContainerWidth !== el.clientWidth || lastContainerHeight !== el.clientHeight) {
          lastContainerWidth = el.clientWidth;
          lastContainerHeight = el.clientHeight;
          renderSpec();
        }
      })
    );
    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
    };
  }
}
async function syncTables(ctx, tables) {
  for (const [tableName, base64Data] of Object.entries(tables)) {
    if (base64Data) {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await ctx.insertTable(tableName, bytes);
    } else {
      await ctx.waitForTable(tableName);
    }
  }
}
function renderSetup(containerEl) {
  const widgetEl = containerEl.closest(".widget-subarea");
  if (widgetEl) {
    widgetEl.style.marginBottom = "0";
  }
  const autoFill = window.document.body.classList.contains("quarto-dashboard");
  const autoFillScrolling = autoFill && !window.document.body.classList.contains("dashboard-fill");
  return { autoFill, autoFillScrolling };
}
function responsiveSpec(spec, containerEl) {
  const kLegendWidth = 80;
  const kLegendHeight = 35;
  spec = structuredClone(spec);
  if ("input" in spec && spec.input === "table") {
    const table = spec;
    table.auto_filling = true;
  } else if ("hconcat" in spec && spec.hconcat.length == 1) {
    const hconcat = spec.hconcat;
    const plot = "plot" in hconcat[0] ? hconcat[0] : null;
    if (plot) {
      plot.width = containerEl.clientWidth - (hconcat.length > 1 ? kLegendWidth : 0);
      plot.height = containerEl.clientHeight;
    }
  } else if ("hconcat" in spec && spec.hconcat.length == 2) {
    const hconcat = spec.hconcat;
    const plot = "plot" in hconcat[0] && "legend" in hconcat[1] ? hconcat[0] : "plot" in hconcat[1] && "legend" in hconcat[0] ? hconcat[1] : void 0;
    if (plot) {
      plot.width = containerEl.clientWidth - (spec.hconcat.length > 1 ? kLegendWidth : 0);
      plot.height = containerEl.clientHeight;
    }
  } else if ("vconcat" in spec && spec.vconcat.length == 2) {
    const vconcat = spec.vconcat;
    const plot = "plot" in vconcat[0] && "legend" in vconcat[1] ? vconcat[0] : "plot" in vconcat[1] && "legend" in vconcat[0] ? vconcat[1] : void 0;
    if (plot) {
      plot.width = containerEl.clientWidth;
      plot.height = containerEl.clientHeight - (spec.vconcat.length > 1 ? kLegendHeight : 0);
    }
  }
  return spec;
}
function isPlotSpec(spec) {
  if ("plot" in spec) {
    return true;
  } else if ("input" in spec && spec.input === "table") {
    return true;
  } else if ("hconcat" in spec && spec.hconcat.length === 2 && ("plot" in spec.hconcat[0] || "plot" in spec.hconcat[1])) {
    return true;
  } else if ("vconcat" in spec && spec.vconcat.length === 2 && ("plot" in spec.vconcat[0] || "plot" in spec.vconcat[1])) {
    return true;
  } else {
    return false;
  }
}
function isInputSpec(spec) {
  return "input" in spec && spec.input !== "table";
}
function isTableSpec(spec) {
  return "input" in spec && spec.input === "table";
}
async function astToDOM(ast, ctx) {
  for (const [name, node] of Object.entries(ast.params)) {
    if (!ctx.activeParams.has(name) || isNotebook()) {
      const param = node.instantiate(ctx);
      ctx.activeParams.set(name, param);
    }
  }
  return ast.root.instantiate(ctx);
}
async function displayUnhandledErrors(ctx, widgetEl) {
  const emptyPlotDivs = widgetEl.querySelectorAll("div.plot:empty");
  for (const emptyDiv of emptyPlotDivs) {
    const error = await ctx.collectUnhandledError();
    if (error) {
      displayRenderError(error, emptyDiv);
    }
  }
}
var mosaic_default = { render };
export {
  mosaic_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vanMvd2lkZ2V0cy9tb3NhaWMudHMiLCAiLi4vLi4vLi4vanMvY29udGV4dC9pbmRleC50cyIsICIuLi8uLi8uLi9qcy9pbnB1dHMvY2hvaWNlLnRzIiwgIi4uLy4uLy4uL2pzL3V0aWwvb2JqZWN0LnRzIiwgIi4uLy4uLy4uL2pzL2lucHV0cy9pbnB1dC50cyIsICIuLi8uLi8uLi9qcy91dGlsL2lkLnRzIiwgIi4uLy4uLy4uL2pzL2lucHV0cy91dGlsLnRzIiwgIi4uLy4uLy4uL2pzL2lucHV0cy9yYWRpb19ncm91cC50cyIsICIuLi8uLi8uLi9qcy9pbnB1dHMvdHlwZXMudHMiLCAiLi4vLi4vLi4vanMvaW5wdXRzL3NlbGVjdC50cyIsICIuLi8uLi8uLi9qcy9pbnB1dHMvY2hlY2tib3hfZ3JvdXAudHMiLCAiLi4vLi4vLi4vanMvaW5wdXRzL2NoZWNrYm94LnRzIiwgIi4uLy4uLy4uL2pzL2lucHV0cy9zbGlkZXIudHMiLCAiLi4vLi4vLi4vanMvaW5wdXRzL3RhYmxlLnRzIiwgIi4uLy4uLy4uL2pzL2lucHV0cy9zZWFyY2gudHMiLCAiLi4vLi4vLi4vanMvaW5wdXRzL2luZGV4LnRzIiwgIi4uLy4uLy4uL2pzL2NvbnRleHQvZHVja2RiLnRzIiwgIi4uLy4uLy4uL2pzL3V0aWwvYXN5bmMudHMiLCAiLi4vLi4vLi4vanMvdXRpbC9lcnJvcnMudHMiLCAiLi4vLi4vLi4vanMvdXRpbC9wbGF0Zm9ybS50cyIsICIuLi8uLi8uLi9qcy9wbG90L3Rvb2x0aXBzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgdHlwZSB7IFJlbmRlclByb3BzIH0gZnJvbSAnQGFueXdpZGdldC90eXBlcyc7XG5cbmltcG9ydCB7XG4gICAgU3BlYyxcbiAgICBTcGVjTm9kZSxcbiAgICBwYXJzZVNwZWMsXG4gICAgSW5zdGFudGlhdGVDb250ZXh0LFxuICAgIEFTVE5vZGUsXG59IGZyb20gJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQHV3ZGF0YS9tb3NhaWMtc3BlY0AwLjE2LjIvK2VzbSc7XG5cbmltcG9ydCB7IHRocm90dGxlIH0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AdXdkYXRhL21vc2FpYy1jb3JlQDAuMTYuMi8rZXNtJztcblxuaW1wb3J0IHsgVml6Q29udGV4dCwgdml6Q29udGV4dCB9IGZyb20gJy4uL2NvbnRleHQnO1xuaW1wb3J0IHsgSU5QVVRTIH0gZnJvbSAnLi4vaW5wdXRzJztcbmltcG9ydCB7IGVycm9ySW5mbywgZXJyb3JBc0hUTUwsIGRpc3BsYXlSZW5kZXJFcnJvciB9IGZyb20gJy4uL3V0aWwvZXJyb3JzJztcbmltcG9ydCB7IGlzTm90ZWJvb2sgfSBmcm9tICcuLi91dGlsL3BsYXRmb3JtJztcbmltcG9ydCB7IFRhYmxlT3B0aW9ucyB9IGZyb20gJy4uL2lucHV0cy90YWJsZSc7XG5pbXBvcnQgeyByZXBsYWNlVG9vbHRpcEltcGwgYXMgaW5zdGFsbFBsb3RUb29sdGlwcyB9IGZyb20gJy4uL3Bsb3QvdG9vbHRpcHMnO1xuXG5pbnRlcmZhY2UgTW9zYWljUHJvcHMge1xuICAgIHRhYmxlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgICBzcGVjOiBzdHJpbmc7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlbmRlcih7IG1vZGVsLCBlbCB9OiBSZW5kZXJQcm9wczxNb3NhaWNQcm9wcz4pIHtcbiAgICAvLyBnZXQgdGhlIHNwZWMgYW5kIHBhcnNlIGl0IGZvciBwbG90IGRlZmF1bHRzXG4gICAgY29uc3Qgc3BlYzogU3BlYyA9IEpTT04ucGFyc2UobW9kZWwuZ2V0KCdzcGVjJykpO1xuICAgIGNvbnN0IHBsb3REZWZhdWx0c1NwZWMgPSB7IHBsb3REZWZhdWx0czogc3BlYy5wbG90RGVmYXVsdHMsIHZzcGFjZTogMCB9IGFzIFNwZWM7XG4gICAgY29uc3QgcGxvdERlZmF1bHRzQXN0ID0gcGFyc2VTcGVjKHBsb3REZWZhdWx0c1NwZWMpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSBjb250ZXh0XG4gICAgY29uc3QgY3R4ID0gYXdhaXQgdml6Q29udGV4dChwbG90RGVmYXVsdHNBc3QucGxvdERlZmF1bHRzKTtcblxuICAgIC8vIGluc2VydC93YWl0IGZvciB0YWJsZXMgdG8gYmUgcmVhZHlcbiAgICBjb25zdCB0YWJsZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSBtb2RlbC5nZXQoJ3RhYmxlcycpIHx8IHt9O1xuICAgIGF3YWl0IHN5bmNUYWJsZXMoY3R4LCB0YWJsZXMpO1xuXG4gICAgLy8gcmVuZGVyIG1vc2FpYyBzcGVjXG4gICAgZWwuY2xhc3NMaXN0LmFkZCgnbW9zYWljLXdpZGdldCcpO1xuICAgIGNvbnN0IHJlbmRlck9wdGlvbnMgPSByZW5kZXJTZXR1cChlbCk7XG4gICAgY29uc3QgaW5wdXRzID0gbmV3IFNldChPYmplY3Qua2V5cyhJTlBVVFMpKTtcbiAgICBpZiAocmVuZGVyT3B0aW9ucy5hdXRvRmlsbFNjcm9sbGluZyAmJiBpc1Bsb3RTcGVjKHNwZWMpKSB7XG4gICAgICAgIGVsLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICBlbC5zdHlsZS5oZWlnaHQgPSAnNDAwcHgnO1xuICAgIH1cbiAgICBpZiAocmVuZGVyT3B0aW9ucy5hdXRvRmlsbCAmJiBpc1RhYmxlU3BlYyhzcGVjKSkge1xuICAgICAgICAvLyBpZiB3ZSBhcmUgYXV0by1maWxsaW5nIGEgdGFibGUgc3BlYywgdGhlbiByZW1vdmUgYW55IHBhZGRpbmcgZnJvbSB0aGUgY2FyZCBib2R5XG4gICAgICAgIC8vIGFzIHRoZSB0YWJsZSB3aWxsIGZpbGwgdGhlIGVudGlyZSBzcGFjZSAodGhpcyBpcyBiYXNpY2FsbHkgaW4gYSBxdWFydG8gZGFzaGJvYXJkIGNhcmQpXG4gICAgICAgIGNvbnN0IGNhcmQgPSBlbC5jbG9zZXN0KCcuY2FyZC1ib2R5JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICBpZiAoY2FyZCkge1xuICAgICAgICAgICAgY2FyZC5zdHlsZS5wYWRkaW5nID0gJzAnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlbmRlclNwZWMgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjdHguY2xlYXJVbmhhbmRsZWRFcnJvcnMoKTtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldFNwZWMgPSByZW5kZXJPcHRpb25zLmF1dG9GaWxsID8gcmVzcG9uc2l2ZVNwZWMoc3BlYywgZWwpIDogc3BlYztcbiAgICAgICAgICAgIGNvbnN0IGFzdCA9IHBhcnNlU3BlYyh0YXJnZXRTcGVjLCB7IGlucHV0cyB9KTtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNFbCA9IChhd2FpdCBhc3RUb0RPTShhc3QsIGN0eCkpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBlbC5hcHBlbmRDaGlsZChzcGVjRWwpO1xuXG4gICAgICAgICAgICAvLyBGb3IgcGxvdHMsIHJlcGxhY2UgdGhlIHRvb2x0aXAgaW1wbGVtZW50YXRpb24gd2l0aFxuICAgICAgICAgICAgLy8gb3VyIG93biBpbXBsZW1lbnRhdGlvblxuICAgICAgICAgICAgaW5zdGFsbFBsb3RUb29sdGlwcyhzcGVjRWwpO1xuXG4gICAgICAgICAgICBhd2FpdCBkaXNwbGF5VW5oYW5kbGVkRXJyb3JzKGN0eCwgZWwpO1xuICAgICAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgY29uc3QgZXJyb3IgPSBlcnJvckluZm8oZSk7XG4gICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBlcnJvckFzSFRNTChlcnJvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGF3YWl0IHJlbmRlclNwZWMoKTtcblxuICAgIC8vIGlmIHdlIGFyZSBkb2luZyBhdXRvLWZpbGwgdGhlbiByZS1yZW5kZXIgd2hlbiBzaXplIGNoYW5nZXNcbiAgICBpZiAocmVuZGVyT3B0aW9ucy5hdXRvRmlsbCAmJiAhaXNJbnB1dFNwZWMoc3BlYykpIHtcbiAgICAgICAgbGV0IGxhc3RDb250YWluZXJXaWR0aCA9IGVsLmNsaWVudFdpZHRoO1xuICAgICAgICBsZXQgbGFzdENvbnRhaW5lckhlaWdodCA9IGVsLmNsaWVudEhlaWdodDtcblxuICAgICAgICAvLyByZS1yZW5kZXIgb24gY29udGFpbmVyIHNpemUgY2hhbmdlZFxuICAgICAgICBjb25zdCByZXNpemVPYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcihcbiAgICAgICAgICAgIHRocm90dGxlKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgIGxhc3RDb250YWluZXJXaWR0aCAhPT0gZWwuY2xpZW50V2lkdGggfHxcbiAgICAgICAgICAgICAgICAgICAgbGFzdENvbnRhaW5lckhlaWdodCAhPT0gZWwuY2xpZW50SGVpZ2h0XG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RDb250YWluZXJXaWR0aCA9IGVsLmNsaWVudFdpZHRoO1xuICAgICAgICAgICAgICAgICAgICBsYXN0Q29udGFpbmVySGVpZ2h0ID0gZWwuY2xpZW50SGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJTcGVjKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZShlbCk7XG5cbiAgICAgICAgLy8gY2xlYW51cCByZXNpemUgb2JzZXJ2ZXIgb24gZGlzY29ubmVjdFxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgcmVzaXplT2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICB9O1xuICAgIH1cbn1cblxuLy8gaW5zZXJ0L3dhaXQgZm9yIHRhYmxlcyB0byBiZSByZWFkeVxuYXN5bmMgZnVuY3Rpb24gc3luY1RhYmxlcyhjdHg6IFZpekNvbnRleHQsIHRhYmxlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPikge1xuICAgIGZvciAoY29uc3QgW3RhYmxlTmFtZSwgYmFzZTY0RGF0YV0gb2YgT2JqZWN0LmVudHJpZXModGFibGVzKSkge1xuICAgICAgICBpZiAoYmFzZTY0RGF0YSkge1xuICAgICAgICAgICAgLy8gZGVjb2RlIGJhc2U2NCB0byBieXRlc1xuICAgICAgICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihiYXNlNjREYXRhKTtcbiAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5U3RyaW5nLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGJ5dGVzW2ldID0gYmluYXJ5U3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGluc2VydCB0YWJsZSBpbnRvIGNvbnRleHRcbiAgICAgICAgICAgIGF3YWl0IGN0eC5pbnNlcnRUYWJsZSh0YWJsZU5hbWUsIGJ5dGVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHdhaXQgZm9yIHRhYmxlIGlmIG5vIGRhdGEgcHJvdmlkZWRcbiAgICAgICAgICAgIGF3YWl0IGN0eC53YWl0Rm9yVGFibGUodGFibGVOYW1lKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuaW50ZXJmYWNlIFJlbmRlck9wdGlvbnMge1xuICAgIGF1dG9GaWxsOiBib29sZWFuO1xuICAgIGF1dG9GaWxsU2Nyb2xsaW5nOiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiByZW5kZXJTZXR1cChjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiBSZW5kZXJPcHRpb25zIHtcbiAgICAvLyBtb3NhaWMgd2lkZ2V0cyBhbHJlYWR5IGhhdmUgc3VmZmljaWVudCBtYXJnaW4vcGFkZGluZyBzbyBvdmVycmlkZVxuICAgIC8vIGFueSBob3N0IHByZXNjcmliZWQgYm90dG9tIG1hcmdpbi5cbiAgICBjb25zdCB3aWRnZXRFbCA9IGNvbnRhaW5lckVsLmNsb3Nlc3QoJy53aWRnZXQtc3ViYXJlYScpIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgIGlmICh3aWRnZXRFbCkge1xuICAgICAgICB3aWRnZXRFbC5zdHlsZS5tYXJnaW5Cb3R0b20gPSAnMCc7XG4gICAgfVxuXG4gICAgLy8gZGV0ZWN0IHdoZXRoZXIgd2Ugc2hvdWxkIGJlIGF1dG8tZmlsbGluZyBvdXIgY29udGFpbmVyXG4gICAgY29uc3QgYXV0b0ZpbGwgPSB3aW5kb3cuZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ3F1YXJ0by1kYXNoYm9hcmQnKTtcblxuICAgIC8vIGRldGVjdCB3aGV0aGVyIHdlIGFyZSBpbiBhIHNjcm9sbGluZyBsYXlvdXQgdy8gYXV0by1maWxsIChzbyB3ZSBuZWVkIHRvIHByb3ZpZGUgZWxlbWVudCBoZWlnaHRzKVxuICAgIGNvbnN0IGF1dG9GaWxsU2Nyb2xsaW5nID1cbiAgICAgICAgYXV0b0ZpbGwgJiYgIXdpbmRvdy5kb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucygnZGFzaGJvYXJkLWZpbGwnKTtcblxuICAgIHJldHVybiB7IGF1dG9GaWxsLCBhdXRvRmlsbFNjcm9sbGluZyB9O1xufVxuXG4vLyBpZiB0aGlzIGlzIGEgc2luZ2xlIHBsb3QgKHcvIG9wdGlvbmFsIGxlZ2VuZCkgaW4gYW4gaGNvbmNhdCBvciB2Y29uY2F0LFxuLy8gdGhlbiBnaXZlIGl0IGR5bmFtaWMgc2l6aW5nIChtb3JlIGNvbXBsZXggbGF5b3V0cyBkb24ndCBnZXQgYXV0by1zaXplZClcbmZ1bmN0aW9uIHJlc3BvbnNpdmVTcGVjKHNwZWM6IFNwZWMsIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IFNwZWMge1xuICAgIGNvbnN0IGtMZWdlbmRXaWR0aCA9IDgwOyAvLyBiZXN0IGd1ZXNzIGVzdGltYXRlXG4gICAgY29uc3Qga0xlZ2VuZEhlaWdodCA9IDM1OyAvLyBiZXN0IGd1ZXNzIGVzdGltYXRlXG5cbiAgICBzcGVjID0gc3RydWN0dXJlZENsb25lKHNwZWMpO1xuICAgIGlmICgnaW5wdXQnIGluIHNwZWMgJiYgc3BlYy5pbnB1dCA9PT0gJ3RhYmxlJykge1xuICAgICAgICBjb25zdCB0YWJsZSA9IHNwZWM7XG4gICAgICAgIC8vIGRpc2FibGUgbWF4LXdpZHRoIGZvciB0YWJsZSBpbnB1dHNcbiAgICAgICAgKHRhYmxlIGFzIHVua25vd24gYXMgVGFibGVPcHRpb25zKS5hdXRvX2ZpbGxpbmcgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2hjb25jYXQnIGluIHNwZWMgJiYgc3BlYy5oY29uY2F0Lmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIC8vIHN0YW5kYWxvbmUgcGxvdFxuICAgICAgICBjb25zdCBoY29uY2F0ID0gc3BlYy5oY29uY2F0O1xuICAgICAgICBjb25zdCBwbG90ID0gJ3Bsb3QnIGluIGhjb25jYXRbMF0gPyBoY29uY2F0WzBdIDogbnVsbDtcbiAgICAgICAgaWYgKHBsb3QpIHtcbiAgICAgICAgICAgIHBsb3Qud2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aCAtIChoY29uY2F0Lmxlbmd0aCA+IDEgPyBrTGVnZW5kV2lkdGggOiAwKTtcbiAgICAgICAgICAgIHBsb3QuaGVpZ2h0ID0gY29udGFpbmVyRWwuY2xpZW50SGVpZ2h0O1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICgnaGNvbmNhdCcgaW4gc3BlYyAmJiBzcGVjLmhjb25jYXQubGVuZ3RoID09IDIpIHtcbiAgICAgICAgLy8gcGxvdCB3aXRoIGhvcml6b250YWwgbGVnZW5kXG4gICAgICAgIGNvbnN0IGhjb25jYXQgPSBzcGVjLmhjb25jYXQ7XG4gICAgICAgIGNvbnN0IHBsb3QgPVxuICAgICAgICAgICAgJ3Bsb3QnIGluIGhjb25jYXRbMF0gJiYgJ2xlZ2VuZCcgaW4gaGNvbmNhdFsxXVxuICAgICAgICAgICAgICAgID8gaGNvbmNhdFswXVxuICAgICAgICAgICAgICAgIDogJ3Bsb3QnIGluIGhjb25jYXRbMV0gJiYgJ2xlZ2VuZCcgaW4gaGNvbmNhdFswXVxuICAgICAgICAgICAgICAgICAgPyBoY29uY2F0WzFdXG4gICAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHBsb3QpIHtcbiAgICAgICAgICAgIHBsb3Qud2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aCAtIChzcGVjLmhjb25jYXQubGVuZ3RoID4gMSA/IGtMZWdlbmRXaWR0aCA6IDApO1xuICAgICAgICAgICAgcGxvdC5oZWlnaHQgPSBjb250YWluZXJFbC5jbGllbnRIZWlnaHQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCd2Y29uY2F0JyBpbiBzcGVjICYmIHNwZWMudmNvbmNhdC5sZW5ndGggPT0gMikge1xuICAgICAgICAvLyBwbG90IHdpdGggdmVydGljYWwgbGVnZW5kXG4gICAgICAgIGNvbnN0IHZjb25jYXQgPSBzcGVjLnZjb25jYXQ7XG4gICAgICAgIGNvbnN0IHBsb3QgPVxuICAgICAgICAgICAgJ3Bsb3QnIGluIHZjb25jYXRbMF0gJiYgJ2xlZ2VuZCcgaW4gdmNvbmNhdFsxXVxuICAgICAgICAgICAgICAgID8gdmNvbmNhdFswXVxuICAgICAgICAgICAgICAgIDogJ3Bsb3QnIGluIHZjb25jYXRbMV0gJiYgJ2xlZ2VuZCcgaW4gdmNvbmNhdFswXVxuICAgICAgICAgICAgICAgICAgPyB2Y29uY2F0WzFdXG4gICAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHBsb3QpIHtcbiAgICAgICAgICAgIHBsb3Qud2lkdGggPSBjb250YWluZXJFbC5jbGllbnRXaWR0aDtcbiAgICAgICAgICAgIHBsb3QuaGVpZ2h0ID0gY29udGFpbmVyRWwuY2xpZW50SGVpZ2h0IC0gKHNwZWMudmNvbmNhdC5sZW5ndGggPiAxID8ga0xlZ2VuZEhlaWdodCA6IDApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzcGVjO1xufVxuXG5mdW5jdGlvbiBpc1Bsb3RTcGVjKHNwZWM6IFNwZWMpIHtcbiAgICBpZiAoJ3Bsb3QnIGluIHNwZWMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnaW5wdXQnIGluIHNwZWMgJiYgc3BlYy5pbnB1dCA9PT0gJ3RhYmxlJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAnaGNvbmNhdCcgaW4gc3BlYyAmJlxuICAgICAgICBzcGVjLmhjb25jYXQubGVuZ3RoID09PSAyICYmXG4gICAgICAgICgncGxvdCcgaW4gc3BlYy5oY29uY2F0WzBdIHx8ICdwbG90JyBpbiBzcGVjLmhjb25jYXRbMV0pXG4gICAgKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICd2Y29uY2F0JyBpbiBzcGVjICYmXG4gICAgICAgIHNwZWMudmNvbmNhdC5sZW5ndGggPT09IDIgJiZcbiAgICAgICAgKCdwbG90JyBpbiBzcGVjLnZjb25jYXRbMF0gfHwgJ3Bsb3QnIGluIHNwZWMudmNvbmNhdFsxXSlcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaXNJbnB1dFNwZWMoc3BlYzogU3BlYykge1xuICAgIHJldHVybiAnaW5wdXQnIGluIHNwZWMgJiYgc3BlYy5pbnB1dCAhPT0gJ3RhYmxlJztcbn1cblxuZnVuY3Rpb24gaXNUYWJsZVNwZWMoc3BlYzogU3BlYykge1xuICAgIHJldHVybiAnaW5wdXQnIGluIHNwZWMgJiYgc3BlYy5pbnB1dCA9PT0gJ3RhYmxlJztcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXN0VG9ET00oYXN0OiBTcGVjTm9kZSwgY3R4OiBJbnN0YW50aWF0ZUNvbnRleHQpIHtcbiAgICAvLyBwcm9jZXNzIHBhcmFtL3NlbGVjdGlvbiBkZWZpbml0aW9uc1xuICAgIGZvciAoY29uc3QgW25hbWUsIG5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKGFzdC5wYXJhbXMpKSB7XG4gICAgICAgIC8vIGRlZmluZSB0aGUgcGFyYW1ldGVyIGlmIGl0IGRvZXNuJ3QgZXhpc3Qgb3IgaWYgd2UgYXJlIGluIGEgbm90ZWJvb2tcbiAgICAgICAgLy8gKGFzIGluIGEgbm90ZWJvb2sgd2UgYXJlIGxvc2luZyB0aGUgcHJpb3IgY2VsbCBzbyB3ZSB3YW50IHRvIHJlc2V0IHRoZSBzZWxlY3Rpb24pXG4gICAgICAgIGlmICghY3R4LmFjdGl2ZVBhcmFtcy5oYXMobmFtZSkgfHwgaXNOb3RlYm9vaygpKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJhbSA9IChub2RlIGFzIEFTVE5vZGUpLmluc3RhbnRpYXRlKGN0eCk7XG4gICAgICAgICAgICBjdHguYWN0aXZlUGFyYW1zLnNldChuYW1lLCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpbnN0YW50aWF0ZSBhbmQgcmV0dXJuIGVsZW1lbnRcbiAgICByZXR1cm4gYXN0LnJvb3QuaW5zdGFudGlhdGUoY3R4KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZGlzcGxheVVuaGFuZGxlZEVycm9ycyhjdHg6IFZpekNvbnRleHQsIHdpZGdldEVsOiBIVE1MRWxlbWVudCkge1xuICAgIC8vIGVtcHR5IHBsb3QgZGl2cyBpbmRpY2F0ZSBhIHBvc3NpYmxlIHVuaGFuZGxlZCBlcnJvciwgbG9vayBmb3IgdGhlc2VcbiAgICAvLyBhbmQgdGhlbiBhdHRlbXB0IHRvIGNvbGxlY3QgYW5kIGRpc3BsYXkgdW5oYW5kbGVkIGVycm9yc1xuICAgIGNvbnN0IGVtcHR5UGxvdERpdnMgPSB3aWRnZXRFbC5xdWVyeVNlbGVjdG9yQWxsKCdkaXYucGxvdDplbXB0eScpO1xuICAgIGZvciAoY29uc3QgZW1wdHlEaXYgb2YgZW1wdHlQbG90RGl2cykge1xuICAgICAgICBjb25zdCBlcnJvciA9IGF3YWl0IGN0eC5jb2xsZWN0VW5oYW5kbGVkRXJyb3IoKTtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBkaXNwbGF5UmVuZGVyRXJyb3IoZXJyb3IsIGVtcHR5RGl2IGFzIEhUTUxFbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgeyByZW5kZXIgfTtcbiIsICJpbXBvcnQgeyBBc3luY0R1Y2tEQkNvbm5lY3Rpb24gfSBmcm9tICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0BkdWNrZGIvZHVja2RiLXdhc21AMS4yOS4wLytlc20nO1xuXG5pbXBvcnQgeyB3YXNtQ29ubmVjdG9yIH0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AdXdkYXRhL21vc2FpYy1jb3JlQDAuMTYuMi8rZXNtJztcblxuaW1wb3J0IHsgSW5zdGFudGlhdGVDb250ZXh0IH0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AdXdkYXRhL21vc2FpYy1zcGVjQDAuMTYuMi8rZXNtJztcblxuaW1wb3J0IHsgSU5QVVRTIH0gZnJvbSAnLi4vaW5wdXRzJztcbmltcG9ydCB7IGluaXREdWNrZGIsIHdhaXRGb3JUYWJsZSB9IGZyb20gJy4vZHVja2RiJztcbmltcG9ydCB7IEVycm9ySW5mbywgaW5pdGlhbGl6ZUVycm9ySGFuZGxpbmcgfSBmcm9tICcuLi91dGlsL2Vycm9ycy5qcyc7XG5pbXBvcnQgeyBzbGVlcCB9IGZyb20gJy4uL3V0aWwvYXN5bmMuanMnO1xuXG5jbGFzcyBWaXpDb250ZXh0IGV4dGVuZHMgSW5zdGFudGlhdGVDb250ZXh0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRhYmxlc18gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBwcml2YXRlIHVuaGFuZGxlZEVycm9yc186IEVycm9ySW5mb1tdID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSByZWFkb25seSBjb25uXzogQXN5bmNEdWNrREJDb25uZWN0aW9uLFxuICAgICAgICBwbG90RGVmYXVsdHM6IGFueVtdXG4gICAgKSB7XG4gICAgICAgIHN1cGVyKHsgcGxvdERlZmF1bHRzIH0pO1xuICAgICAgICB0aGlzLmFwaSA9IHsgLi4udGhpcy5hcGksIC4uLklOUFVUUyB9O1xuICAgICAgICB0aGlzLmNvb3JkaW5hdG9yLmRhdGFiYXNlQ29ubmVjdG9yKHdhc21Db25uZWN0b3IoeyBjb25uZWN0aW9uOiB0aGlzLmNvbm5fIH0pKTtcbiAgICB9XG5cbiAgICBhc3luYyBpbnNlcnRUYWJsZSh0YWJsZTogc3RyaW5nLCBkYXRhOiBVaW50OEFycmF5KSB7XG4gICAgICAgIC8vIGp1c3Qgd2FpdCBmb3IgaXQgaWYgd2UgYWxyZWFkeSBoYXZlIGl0XG4gICAgICAgIGlmICh0aGlzLnRhYmxlc18uaGFzKHRhYmxlKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy53YWl0Rm9yVGFibGUodGFibGUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIHRvIGxpc3Qgb2YgdGFibGVzXG4gICAgICAgIHRoaXMudGFibGVzXy5hZGQodGFibGUpO1xuXG4gICAgICAgIC8vIGluc2VydCB0YWJsZSBpbnRvIGRhdGFiYXNlXG4gICAgICAgIGF3YWl0IHRoaXMuY29ubl8/Lmluc2VydEFycm93RnJvbUlQQ1N0cmVhbShkYXRhLCB7XG4gICAgICAgICAgICBuYW1lOiB0YWJsZSxcbiAgICAgICAgICAgIGNyZWF0ZTogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgd2FpdEZvclRhYmxlKHRhYmxlOiBzdHJpbmcpIHtcbiAgICAgICAgYXdhaXQgd2FpdEZvclRhYmxlKHRoaXMuY29ubl8sIHRhYmxlKTtcbiAgICB9XG5cbiAgICByZWNvcmRVbmhhbmRsZWRFcnJvcihlcnJvcjogRXJyb3JJbmZvKSB7XG4gICAgICAgIHRoaXMudW5oYW5kbGVkRXJyb3JzXy5wdXNoKGVycm9yKTtcbiAgICB9XG5cbiAgICBhc3luYyBjb2xsZWN0VW5oYW5kbGVkRXJyb3Iod2FpdDogbnVtYmVyID0gMTAwMCk6IFByb21pc2U8RXJyb3JJbmZvIHwgdW5kZWZpbmVkPiB7XG4gICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lIDwgd2FpdCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudW5oYW5kbGVkRXJyb3JzXy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudW5oYW5kbGVkRXJyb3JzXy5zaGlmdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgc2xlZXAoMTAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNsZWFyVW5oYW5kbGVkRXJyb3JzKCkge1xuICAgICAgICB0aGlzLnVuaGFuZGxlZEVycm9yc18gPSBbXTtcbiAgICB9XG59XG5cbi8vIGdldCB0aGUgZ2xvYmFsIGNvbnRleHQgaW5zdGFuY2UsIGVuc3VyaW5nIHdlIGdldCB0aGUgc2FtZVxuLy8gaW5zdGFuY2UgZXZhbCBhY3Jvc3MgZGlmZmVyZW50IGpzIGJ1bmRsZXMgbG9hZGVkIGludG8gdGhlIHBhZ2VcbmNvbnN0IFZJWl9DT05URVhUX0tFWSA9IFN5bWJvbC5mb3IoJ0BAaW5zcGVjdC12aXotY29udGV4dCcpO1xuYXN5bmMgZnVuY3Rpb24gdml6Q29udGV4dChwbG90RGVmYXVsdHM6IGFueVtdKTogUHJvbWlzZTxWaXpDb250ZXh0PiB7XG4gICAgY29uc3QgZ2xvYmFsU2NvcGU6IGFueSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogZ2xvYmFsVGhpcztcbiAgICBpZiAoIWdsb2JhbFNjb3BlW1ZJWl9DT05URVhUX0tFWV0pIHtcbiAgICAgICAgZ2xvYmFsU2NvcGVbVklaX0NPTlRFWFRfS0VZXSA9IChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IGRiLCB3b3JrZXIgfSA9IGF3YWl0IGluaXREdWNrZGIoKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbm4gPSBhd2FpdCBkYi5jb25uZWN0KCk7XG4gICAgICAgICAgICBjb25zdCBjdHggPSBuZXcgVml6Q29udGV4dChjb25uLCBwbG90RGVmYXVsdHMpO1xuICAgICAgICAgICAgaW5pdGlhbGl6ZUVycm9ySGFuZGxpbmcoY3R4LCB3b3JrZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGN0eDtcbiAgICAgICAgfSkoKTtcbiAgICB9XG4gICAgcmV0dXJuIGdsb2JhbFNjb3BlW1ZJWl9DT05URVhUX0tFWV0gYXMgUHJvbWlzZTxWaXpDb250ZXh0Pjtcbn1cblxuZXhwb3J0IHsgVml6Q29udGV4dCwgdml6Q29udGV4dCB9O1xuIiwgImltcG9ydCB7XG4gICAgaXNQYXJhbSxcbiAgICBpc1NlbGVjdGlvbixcbiAgICBjbGF1c2VQb2ludCxcbiAgICBjbGF1c2VQb2ludHMsXG4gICAgdG9EYXRhQ29sdW1ucyxcbn0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AdXdkYXRhL21vc2FpYy1jb3JlQDAuMTYuMi8rZXNtJztcblxuaW1wb3J0IHtcbiAgICBGaWx0ZXJFeHByLFxuICAgIFF1ZXJ5LFxuICAgIFNlbGVjdFF1ZXJ5LFxufSBmcm9tICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0B1d2RhdGEvbW9zYWljLXNxbEAwLjE2LjIvK2VzbSc7XG5cbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSAnLi4vdXRpbC9vYmplY3QnO1xuXG5pbXBvcnQgeyBJbnB1dCwgSW5wdXRPcHRpb25zIH0gZnJvbSAnLi9pbnB1dCc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHNldHVwQWN0aXZhdGlvbkxpc3RlbmVycyB9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hvaWNlSW5wdXRPcHRpb25zIGV4dGVuZHMgSW5wdXRPcHRpb25zIHtcbiAgICBmcm9tPzogc3RyaW5nO1xuICAgIGNvbHVtbj86IHN0cmluZztcbiAgICBvcHRpb25zPzogQXJyYXk8T3B0aW9uPjtcbiAgICBmaWVsZD86IHN0cmluZztcbiAgICBsYWJlbD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENob2ljZUlucHV0IGV4dGVuZHMgSW5wdXQge1xuICAgIHByb3RlY3RlZCBkYXRhXzogT3B0aW9uW10gPSBbXTtcbiAgICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgb3B0aW9uc186IENob2ljZUlucHV0T3B0aW9ucykge1xuICAgICAgICBzdXBlcihvcHRpb25zXy5maWx0ZXJCeSk7XG4gICAgfVxuXG4gICAgYWJzdHJhY3QgZ2V0IHNlbGVjdGVkVmFsdWUoKTogc3RyaW5nIHwgc3RyaW5nW107XG5cbiAgICBhYnN0cmFjdCBzZXQgc2VsZWN0ZWRWYWx1ZSh2YWx1ZTogc3RyaW5nIHwgc3RyaW5nW10pO1xuXG4gICAgYWJzdHJhY3QgdXBkYXRlKCk6IHRoaXM7XG5cbiAgICBhY3RpdmF0ZSgpIHtcbiAgICAgICAgaWYgKGlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpICYmIHRoaXMub3B0aW9uc18uY29sdW1uKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZCA9IHRoaXMub3B0aW9uc18uZmllbGQgfHwgdGhpcy5vcHRpb25zXy5jb2x1bW47XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLmFjdGl2YXRlKGNsYXVzZVBvaW50KGZpZWxkLCB1bmRlZmluZWQsIHsgc291cmNlOiB0aGlzIH0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1Ymxpc2godmFsdWU/OiBzdHJpbmcgfCBzdHJpbmdbXSkge1xuICAgICAgICBjb25zdCB7IGFzLCBmaWVsZCwgY29sdW1uIH0gPSB0aGlzLm9wdGlvbnNfO1xuICAgICAgICBpZiAoaXNTZWxlY3Rpb24oYXMpICYmIGNvbHVtbikge1xuICAgICAgICAgICAgbGV0IGNsYXVzZSA9IGNsYXVzZVBvaW50KGZpZWxkIHx8IGNvbHVtbiwgdW5kZWZpbmVkLCB7IHNvdXJjZTogdGhpcyB9KTtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY2xhdXNlID0gY2xhdXNlUG9pbnRzKFxuICAgICAgICAgICAgICAgICAgICBbZmllbGQgfHwgY29sdW1uXSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUubWFwKHYgPT4gW3ZdKSxcbiAgICAgICAgICAgICAgICAgICAgeyBzb3VyY2U6IHRoaXMgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlPy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjbGF1c2UgPSBjbGF1c2VQb2ludChmaWVsZCB8fCBjb2x1bW4sIHZhbHVlLCB7IHNvdXJjZTogdGhpcyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFzLnVwZGF0ZShjbGF1c2UpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzUGFyYW0oYXMpKSB7XG4gICAgICAgICAgICBhcy51cGRhdGUodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcXVlcnkoZmlsdGVyOiBGaWx0ZXJFeHByW10gPSBbXSk6IFNlbGVjdFF1ZXJ5IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgY29sdW1uIH0gPSB0aGlzLm9wdGlvbnNfO1xuXG4gICAgICAgIGlmICghZnJvbSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNvbHVtbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBzcGVjaWZ5IGEgY29sdW1uIGFsb25nIHdpdGggYSBkYXRhIHNvdXJjZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFF1ZXJ5LmZyb20oZnJvbSlcbiAgICAgICAgICAgIC5zZWxlY3QoeyB2YWx1ZTogY29sdW1uIH0pXG4gICAgICAgICAgICAuZGlzdGluY3QoKVxuICAgICAgICAgICAgLndoZXJlKC4uLmZpbHRlcilcbiAgICAgICAgICAgIC5vcmRlcmJ5KGNvbHVtbik7XG4gICAgfVxuXG4gICAgcXVlcnlSZXN1bHQoZGF0YTogYW55KTogdGhpcyB7XG4gICAgICAgIHRoaXMuc2V0RGF0YShbeyB2YWx1ZTogJycsIGxhYmVsOiAnQWxsJyB9LCAuLi50aGlzLnF1ZXJ5UmVzdWx0T3B0aW9ucyhkYXRhKV0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBxdWVyeVJlc3VsdE9wdGlvbnMoZGF0YTogYW55KTogT3B0aW9uW10ge1xuICAgICAgICBjb25zdCBjb2x1bW5zID0gdG9EYXRhQ29sdW1ucyhkYXRhKTtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gY29sdW1ucy5jb2x1bW5zLnZhbHVlIGFzIHN0cmluZ1tdO1xuICAgICAgICByZXR1cm4gdmFsdWVzLm1hcCh2ID0+ICh7IHZhbHVlOiB2IH0pKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgc2V0T3B0aW9ucyhvcHRpb25zOiBPcHRpb25bXSkge1xuICAgICAgICB0aGlzLnNldERhdGEob3B0aW9ucy5tYXAob3B0ID0+IChpc09iamVjdChvcHQpID8gb3B0IDogeyB2YWx1ZTogb3B0IH0pKSk7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIHNldHVwUGFyYW1MaXN0ZW5lcigpIHtcbiAgICAgICAgaWYgKCFpc1NlbGVjdGlvbih0aGlzLm9wdGlvbnNfLmFzKSkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zXy5hcy5hZGRFdmVudExpc3RlbmVyKCd2YWx1ZScsIHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIHNldHVwQWN0aXZhdGlvbkxpc3RlbmVycyhlbGVtZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBpZiAoaXNTZWxlY3Rpb24odGhpcy5vcHRpb25zXy5hcykpIHtcbiAgICAgICAgICAgIHNldHVwQWN0aXZhdGlvbkxpc3RlbmVycyh0aGlzLCBlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb3RlY3RlZCB1cGRhdGVTZWxlY3RlZFZhbHVlKCkge1xuICAgICAgICAvLyB1cGRhdGUgdmFsdWUgYmFzZWQgb24gcGFyYW0vc2VsZWN0aW9uXG4gICAgICAgIGNvbnN0IHZhbHVlID0gaXNTZWxlY3Rpb24odGhpcy5vcHRpb25zXy5hcylcbiAgICAgICAgICAgID8gdGhpcy5vcHRpb25zXy5hcy52YWx1ZUZvcih0aGlzKVxuICAgICAgICAgICAgOiB0aGlzLm9wdGlvbnNfLmFzLnZhbHVlO1xuICAgICAgICB0aGlzLnNlbGVjdGVkVmFsdWUgPSB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gJycgOiB2YWx1ZTtcbiAgICB9XG5cbiAgICBzZXREYXRhKG9wdGlvbnM6IE9wdGlvbltdKSB7XG4gICAgICAgIGlmICghaXNTZWxlY3Rpb24odGhpcy5vcHRpb25zXy5hcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtVmFsdWUgPSB0aGlzLm9wdGlvbnNfLmFzLnZhbHVlO1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIHBhcmFtVmFsdWUgJiZcbiAgICAgICAgICAgICAgICAhQXJyYXkuaXNBcnJheShwYXJhbVZhbHVlKSAmJlxuICAgICAgICAgICAgICAgICFvcHRpb25zLnNvbWUob3B0aW9uID0+IG9wdGlvbi52YWx1ZSA9PT0gcGFyYW1WYWx1ZSlcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSBbLi4ub3B0aW9ucywgeyB2YWx1ZTogcGFyYW1WYWx1ZSB9XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhdGFfID0gb3B0aW9ucztcbiAgICB9XG59XG4iLCAiZXhwb3J0IGNvbnN0IGlzT2JqZWN0ID0gKHY6IHVua25vd24pOiB2IGlzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0+IHtcbiAgICByZXR1cm4gdiAhPT0gbnVsbCAmJiB0eXBlb2YgdiA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodik7XG59O1xuIiwgImltcG9ydCB7XG4gICAgY29vcmRpbmF0b3IsXG4gICAgTW9zYWljQ2xpZW50LFxuICAgIFBhcmFtLFxuICAgIFNlbGVjdGlvbixcbn0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AdXdkYXRhL21vc2FpYy1jb3JlQDAuMTYuMi8rZXNtJztcblxuZXhwb3J0IGludGVyZmFjZSBJbnB1dE9wdGlvbnMge1xuICAgIGFzOiBQYXJhbTtcbiAgICBmaWx0ZXJCeT86IFNlbGVjdGlvbjtcbn1cblxuZXhwb3J0IHR5cGUgSW5wdXRGdW5jdGlvbjxUIGV4dGVuZHMgSW5wdXRPcHRpb25zID0gYW55PiA9IChvcHRpb25zOiBUKSA9PiBIVE1MRWxlbWVudDtcblxuZXhwb3J0IGZ1bmN0aW9uIGlucHV0PFQgZXh0ZW5kcyBuZXcgKC4uLmFyZ3M6IGFueVtdKSA9PiBJbnB1dD4oXG4gICAgSW5wdXRDbGFzczogVCxcbiAgICAuLi5wYXJhbXM6IENvbnN0cnVjdG9yUGFyYW1ldGVyczxUPlxuKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGlucHV0ID0gbmV3IElucHV0Q2xhc3MoLi4ucGFyYW1zKTtcbiAgICBjb29yZGluYXRvcigpLmNvbm5lY3QoaW5wdXQpO1xuICAgIHJldHVybiBpbnB1dC5lbGVtZW50O1xufVxuXG5leHBvcnQgY2xhc3MgSW5wdXQgZXh0ZW5kcyBNb3NhaWNDbGllbnQge1xuICAgIHB1YmxpYyByZWFkb25seSBlbGVtZW50OiBIVE1MRWxlbWVudDtcbiAgICBjb25zdHJ1Y3RvcihmaWx0ZXJCeT86IFNlbGVjdGlvbikge1xuICAgICAgICBzdXBlcihmaWx0ZXJCeSk7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5lbGVtZW50LCAndmFsdWUnLCB7IHZhbHVlOiB0aGlzIH0pO1xuICAgIH1cblxuICAgIGFjdGl2YXRlKCkge1xuICAgICAgICAvLyBzdWJjbGFzc2VzIHNob3VsZCBvdmVycmlkZVxuICAgIH1cbn1cbiIsICJleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVJZCgpIHtcbiAgICByZXR1cm4gJ2lkLScgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMikgKyBEYXRlLm5vdygpLnRvU3RyaW5nKDM2KTtcbn1cbiIsICJpbXBvcnQgeyBnZW5lcmF0ZUlkIH0gZnJvbSAnLi4vdXRpbC9pZCc7XG5pbXBvcnQgeyBJbnB1dCB9IGZyb20gJy4vaW5wdXQnO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGaWVsZHNldChsZWdlbmQ/OiBzdHJpbmcpOiBIVE1MRmllbGRTZXRFbGVtZW50IHtcbiAgICBjb25zdCBmaWVsZHNldCA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdmaWVsZHNldCcpO1xuXG4gICAgaWYgKGxlZ2VuZCkge1xuICAgICAgICBjb25zdCBsZWdlbmRFbCA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsZWdlbmQnKTtcbiAgICAgICAgbGVnZW5kRWwuaW5uZXJUZXh0ID0gbGVnZW5kO1xuICAgICAgICBmaWVsZHNldC5hcHBlbmQobGVnZW5kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmllbGRzZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRGaWVsZHNldE9wdGlvbnMoXG4gICAgZmllbGRzZXQ6IEhUTUxGaWVsZFNldEVsZW1lbnQsXG4gICAgb3B0aW9uczogT3B0aW9uW10sXG4gICAgdHlwZTogJ3JhZGlvJyB8ICdjaGVja2JveCdcbikge1xuICAgIC8vIHJlbW92ZSBpbnB1dCBlbGVtZW50c1xuICAgIGZpZWxkc2V0LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0LCBsYWJlbCcpLmZvckVhY2goZWwgPT4ge1xuICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICB9KTtcblxuICAgIC8vIHBvcHVsYXRlIHJhZGlvIGJ1dHRvbnNcbiAgICBjb25zdCBuYW1lID0gZ2VuZXJhdGVJZCgpO1xuICAgIGZvciAoY29uc3QgeyB2YWx1ZSwgbGFiZWwgfSBvZiBvcHRpb25zIHx8IFtdKSB7XG4gICAgICAgIGNvbnN0IHsgaW5wdXRMYWJlbCB9ID0gY3JlYXRlTGFiZWxlZElucHV0KHR5cGUsIGxhYmVsLCBuYW1lLCB2YWx1ZSk7XG4gICAgICAgIGZpZWxkc2V0LmFwcGVuZENoaWxkKGlucHV0TGFiZWwpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhYmVsZWRJbnB1dChcbiAgICB0eXBlOiAncmFkaW8nIHwgJ2NoZWNrYm94JyxcbiAgICBsYWJlbD86IHN0cmluZyxcbiAgICBuYW1lPzogc3RyaW5nLFxuICAgIHZhbHVlPzogc3RyaW5nXG4pIHtcbiAgICBjb25zdCBpbnB1dExhYmVsID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG4gICAgY29uc3QgaW5wdXQgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBpbnB1dC50eXBlID0gdHlwZTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgICBpbnB1dC5uYW1lID0gbmFtZTtcbiAgICB9XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIGlucHV0LnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIGlucHV0TGFiZWwuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuICAgIGlucHV0TGFiZWwuYXBwZW5kQ2hpbGQod2luZG93LmRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGAgJHtsYWJlbCB8fCB2YWx1ZX1gKSk7XG4gICAgcmV0dXJuIHsgaW5wdXRMYWJlbCwgaW5wdXQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQWN0aXZhdGlvbkxpc3RlbmVycyhpbnB1dDogSW5wdXQsIGVsZW1lbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgLy8gdHJpZ2dlciBzZWxlY3Rpb24gYWN0aXZhdGlvblxuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmVudGVyJywgZXZ0ID0+IHtcbiAgICAgICAgaWYgKCFldnQuYnV0dG9ucykgaW5wdXQuYWN0aXZhdGUoKTtcbiAgICB9KTtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgKCkgPT4gaW5wdXQuYWN0aXZhdGUoKSk7XG59XG4iLCAiaW1wb3J0IHsgQ2hvaWNlSW5wdXQsIENob2ljZUlucHV0T3B0aW9ucyB9IGZyb20gJy4vY2hvaWNlJztcbmltcG9ydCB7IGNyZWF0ZUZpZWxkc2V0LCBzZXRGaWVsZHNldE9wdGlvbnMgfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJhZGlvR3JvdXBPcHRpb25zIGV4dGVuZHMgQ2hvaWNlSW5wdXRPcHRpb25zIHt9XG5cbmV4cG9ydCBjbGFzcyBSYWRpb0dyb3VwIGV4dGVuZHMgQ2hvaWNlSW5wdXQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgZmllbGRzZXRfOiBIVE1MRmllbGRTZXRFbGVtZW50O1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJhZGlvR3JvdXBPcHRpb25zKSB7XG4gICAgICAgIC8vIHByb3BhZ2F0ZSBmaWx0ZXJCeVxuICAgICAgICBzdXBlcihvcHRpb25zKTtcblxuICAgICAgICAvLyBvdXRlciBmaWVsZHNldFxuICAgICAgICB0aGlzLmZpZWxkc2V0XyA9IGNyZWF0ZUZpZWxkc2V0KG9wdGlvbnMubGFiZWwgfHwgb3B0aW9ucy5jb2x1bW4pO1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kKHRoaXMuZmllbGRzZXRfKTtcblxuICAgICAgICAvLyBiaW5kIGV4cGxpY2l0IG9wdGlvbnMgdG8gZGF0YSBpZiBzcGVjaWZpZWRcbiAgICAgICAgaWYgKG9wdGlvbnMub3B0aW9ucykge1xuICAgICAgICAgICAgdGhpcy5zZXRPcHRpb25zKG9wdGlvbnMub3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZXQgc2VsZWN0ZWQgdmFsdWUgdG8gXCJhbGxcIlxuICAgICAgICB0aGlzLnNlbGVjdGVkVmFsdWUgPSAnJztcblxuICAgICAgICAvLyBwdWJsaXNoIHNlbGVjdGVkIHZhbHVlIG9uIHJhZGlvIGNoYW5nZVxuICAgICAgICB0aGlzLmZpZWxkc2V0Xy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBlID0+IHtcbiAgICAgICAgICAgIGlmIChlLnRhcmdldCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQudHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2godGhpcy5zZWxlY3RlZFZhbHVlID8/IG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gbGlzdGVuZXJzXG4gICAgICAgIHRoaXMuc2V0dXBQYXJhbUxpc3RlbmVyKCk7XG4gICAgICAgIHRoaXMuc2V0dXBBY3RpdmF0aW9uTGlzdGVuZXJzKHRoaXMuZmllbGRzZXRfKTtcbiAgICB9XG5cbiAgICBnZXQgc2VsZWN0ZWRWYWx1ZSgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBjaGVja2VkID0gdGhpcy5maWVsZHNldF8ucXVlcnlTZWxlY3RvcihcbiAgICAgICAgICAgICdpbnB1dFt0eXBlPVwicmFkaW9cIl06Y2hlY2tlZCdcbiAgICAgICAgKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgICByZXR1cm4gY2hlY2tlZD8udmFsdWUgPyAoY2hlY2tlZC52YWx1ZSA9PT0gJ29uJyA/ICcnIDogY2hlY2tlZC52YWx1ZSkgOiAnJztcbiAgICB9XG5cbiAgICBzZXQgc2VsZWN0ZWRWYWx1ZSh2YWx1ZTogc3RyaW5nKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUgPT09ICcnID8gJ29uJyA6IHZhbHVlO1xuICAgICAgICBjb25zdCByYWRpb3MgPSB0aGlzLmZpZWxkc2V0Xy5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKTtcbiAgICAgICAgZm9yIChjb25zdCByYWRpbyBvZiByYWRpb3MpIHtcbiAgICAgICAgICAgIGlmICgocmFkaW8gYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgKHJhZGlvIGFzIEhUTUxJbnB1dEVsZW1lbnQpLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJhZGlvLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICBzZXRGaWVsZHNldE9wdGlvbnModGhpcy5maWVsZHNldF8sIHRoaXMuZGF0YV8sICdyYWRpbycpO1xuICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdGVkVmFsdWUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwgImV4cG9ydCBjb25zdCBrU2lkZWJhckZ1bGx3aWR0aCA9ICdzaWRlYmFyLWZ1bGx3aWR0aCc7XG5leHBvcnQgY29uc3Qga0lucHV0U2VhcmNoID0gJ2lucHV0LXNlYXJjaCc7XG5cbmV4cG9ydCB0eXBlIE9wdGlvbiA9IHsgdmFsdWU6IHN0cmluZzsgbGFiZWw/OiBzdHJpbmcgfTtcbiIsICJpbXBvcnQgeyBUb21TZXR0aW5ncyB9IGZyb20gJ3RvbS1zZWxlY3QvZGlzdC9lc20vdHlwZXMvc2V0dGluZ3MuanMnO1xuaW1wb3J0IHsgZ2VuZXJhdGVJZCB9IGZyb20gJy4uL3V0aWwvaWQnO1xuaW1wb3J0IHsgQ2hvaWNlSW5wdXQsIENob2ljZUlucHV0T3B0aW9ucyB9IGZyb20gJy4vY2hvaWNlJztcbmltcG9ydCB7IGtTaWRlYmFyRnVsbHdpZHRoIH0gZnJvbSAnLi90eXBlcyc7XG5cbmltcG9ydCBUb21TZWxlY3QgZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS90b20tc2VsZWN0QDIuNC4zLytlc20nO1xuaW1wb3J0IHsgaXNTZWxlY3Rpb24gfSBmcm9tICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0B1d2RhdGEvbW9zYWljLWNvcmVAMC4xNi4yLytlc20nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlbGVjdE9wdGlvbnMgZXh0ZW5kcyBDaG9pY2VJbnB1dE9wdGlvbnMge1xuICAgIHZhbHVlPzogJ2FsbCcgfCAnYXV0bycgfCBzdHJpbmcgfCBzdHJpbmdbXTtcbiAgICBtdWx0aXBsZT86IGJvb2xlYW47XG4gICAgd2lkdGg/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBTZWxlY3QgZXh0ZW5kcyBDaG9pY2VJbnB1dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBzZWxlY3RfOiBIVE1MU2VsZWN0RWxlbWVudDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IG11bHRpcGxlXzogYm9vbGVhbjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFsbG93RW1wdHlfOiBib29sZWFuO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgaW5pdGlhbFZhbHVlXz86IHN0cmluZyB8IHN0cmluZ1tdO1xuICAgIHByaXZhdGUgdG9tU2VsZWN0Xz86IFRvbVNlbGVjdCA9IHVuZGVmaW5lZDtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBTZWxlY3RPcHRpb25zKSB7XG4gICAgICAgIC8vIHByb3BhZ2F0ZSBmaWx0ZXJcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgLy8gbm90ZSBtdWx0aXBsZSBhbmQgaW5pdGlhbCB2YWx1ZVxuICAgICAgICB0aGlzLm11bHRpcGxlXyA9IG9wdGlvbnMubXVsdGlwbGUgPz8gZmFsc2U7XG4gICAgICAgIHRoaXMuYWxsb3dFbXB0eV8gPSBvcHRpb25zLnZhbHVlID09PSAnYWxsJztcbiAgICAgICAgdGhpcy5pbml0aWFsVmFsdWVfID1cbiAgICAgICAgICAgIG9wdGlvbnMudmFsdWUgPT09ICdhbGwnIHx8IG9wdGlvbnMudmFsdWUgPT09ICdhdXRvJyA/IHVuZGVmaW5lZCA6IG9wdGlvbnMudmFsdWU7XG5cbiAgICAgICAgLy8gYWRkIGZ1bGx3aWR0aCBjbGFzcyAoZm9yIHNpZGViYXJzKVxuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZChrU2lkZWJhckZ1bGx3aWR0aCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGxhYmVsIGlmIHNwZWNpZmllZFxuICAgICAgICBjb25zdCBsYWJlbCA9IG9wdGlvbnMubGFiZWwgfHwgb3B0aW9ucy5jb2x1bW47XG4gICAgICAgIGxldCBsYWJlbEVsOiBIVE1MTGFiZWxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGlmIChsYWJlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsYWJlbEVsID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG4gICAgICAgICAgICBsYWJlbEVsLmlubmVyVGV4dCA9IGxhYmVsO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKGxhYmVsRWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3JlYXRlIHNlbGVjdFxuICAgICAgICB0aGlzLnNlbGVjdF8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcbiAgICAgICAgaWYgKG9wdGlvbnMud2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0Xy5zdHlsZS53aWR0aCA9IGAke29wdGlvbnMud2lkdGh9cHhgO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2VsZWN0Xy5pZCA9IGdlbmVyYXRlSWQoKTtcbiAgICAgICAgaWYgKGxhYmVsRWwpIHtcbiAgICAgICAgICAgIGxhYmVsRWwuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RfKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdF8pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYmluZCBleHBsaWNpdCBvcHRpb25zIHRvIGRhdGEgaWYgc3BlY2lmaWVkXG4gICAgICAgIGlmIChvcHRpb25zLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zLm9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2V0IHZhbHVlIGlmIHNwZWNpZmllZFxuICAgICAgICBpZiAodGhpcy5pbml0aWFsVmFsdWVfICE9PSB1bmRlZmluZWQgJiYgaXNTZWxlY3Rpb24odGhpcy5vcHRpb25zXy5hcykpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaChvcHRpb25zLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHB1Ymxpc2ggc2VsZWN0ZWQgdmFsdWUgdXBvbiBtZW51IGNoYW5nZVxuICAgICAgICB0aGlzLnNlbGVjdF8uYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2godGhpcy5zZWxlY3RlZFZhbHVlID8/IG51bGwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBsaXN0ZW5lcnNcbiAgICAgICAgdGhpcy5zZXR1cFBhcmFtTGlzdGVuZXIoKTtcbiAgICAgICAgdGhpcy5zZXR1cEFjdGl2YXRpb25MaXN0ZW5lcnModGhpcy5zZWxlY3RfKTtcbiAgICB9XG5cbiAgICBxdWVyeVJlc3VsdChkYXRhOiBhbnkpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXMubXVsdGlwbGVfIHx8ICF0aGlzLmFsbG93RW1wdHlfKSB7XG4gICAgICAgICAgICB0aGlzLnNldERhdGEodGhpcy5xdWVyeVJlc3VsdE9wdGlvbnMoZGF0YSkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc3VwZXIucXVlcnlSZXN1bHQoZGF0YSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgc2VsZWN0ZWRWYWx1ZSgpOiBzdHJpbmcgfCBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvbVNlbGVjdF8/LmdldFZhbHVlKCkgPz8gJyc7XG4gICAgfVxuXG4gICAgc2V0IHNlbGVjdGVkVmFsdWUodmFsdWU6IHN0cmluZyB8IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMudG9tU2VsZWN0Xz8uc2V0VmFsdWUodmFsdWUpO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpOiB0aGlzIHtcbiAgICAgICAgLy8gY3JlYXRlIHRvbVNlbGVjdCBpZiBuZWNlc3NhcnlcbiAgICAgICAgaWYgKCF0aGlzLnRvbVNlbGVjdF8pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm11bHRpcGxlXykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0Xy5tdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjb25maWc6IFBhcnRpYWw8VG9tU2V0dGluZ3M+ID0ge1xuICAgICAgICAgICAgICAgIGNyZWF0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZHJvcGRvd25QYXJlbnQ6ICdib2R5JyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoIXRoaXMuc2VsZWN0Xy5tdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5hbGxvd0VtcHR5T3B0aW9uID0gdGhpcy5hbGxvd0VtcHR5XztcbiAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgY29uZmlnLmNvbnRyb2xJbnB1dCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5wbHVnaW5zID0ge1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVfYnV0dG9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1JlbW92ZSB0aGlzIGl0ZW0nLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMudG9tU2VsZWN0XyA9IG5ldyBUb21TZWxlY3QodGhpcy5zZWxlY3RfLCBjb25maWcpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5tdWx0aXBsZV8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvbVNlbGVjdF8ub24oJ2l0ZW1fYWRkJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbVNlbGVjdF8hLmNvbnRyb2xfaW5wdXQudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b21TZWxlY3RfPy5yZWZyZXNoT3B0aW9ucyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZSA9XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsVmFsdWVfID8/ICh0aGlzLmFsbG93RW1wdHlfID8gJycgOiB0aGlzLmRhdGFfPy5bMF0udmFsdWUpO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBpc1NlbGVjdGlvbih0aGlzLm9wdGlvbnNfLmFzKVxuICAgICAgICAgICAgICAgID8gZGVmYXVsdFZhbHVlXG4gICAgICAgICAgICAgICAgOiB0aGlzLm9wdGlvbnNfLmFzLnZhbHVlIHx8IGRlZmF1bHRWYWx1ZTtcblxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2godmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVzZXQgb3B0aW9uc1xuICAgICAgICB0aGlzLnRvbVNlbGVjdF8uY2xlYXJPcHRpb25zKCk7XG4gICAgICAgIHRoaXMudG9tU2VsZWN0Xy5hZGRPcHRpb25zKFxuICAgICAgICAgICAgdGhpcy5kYXRhXy5tYXAobyA9PiAoeyB2YWx1ZTogby52YWx1ZSwgdGV4dDogby5sYWJlbCB8fCBvLnZhbHVlIH0pKVxuICAgICAgICApO1xuICAgICAgICB0aGlzLnRvbVNlbGVjdF8ucmVmcmVzaE9wdGlvbnMoZmFsc2UpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSB2YWx1ZSBiYXNlZCBvbiBwYXJhbS9zZWxlY3Rpb25cbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3RlZFZhbHVlKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwgImltcG9ydCB7IENob2ljZUlucHV0LCBDaG9pY2VJbnB1dE9wdGlvbnMgfSBmcm9tICcuL2Nob2ljZSc7XG5pbXBvcnQgeyBjcmVhdGVGaWVsZHNldCwgc2V0RmllbGRzZXRPcHRpb25zIH0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBDaGVja2JveEdyb3VwT3B0aW9ucyBleHRlbmRzIENob2ljZUlucHV0T3B0aW9ucyB7fVxuXG5leHBvcnQgY2xhc3MgQ2hlY2tib3hHcm91cCBleHRlbmRzIENob2ljZUlucHV0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpZWxkc2V0XzogSFRNTEZpZWxkU2V0RWxlbWVudDtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBDaGVja2JveEdyb3VwT3B0aW9ucykge1xuICAgICAgICAvLyBwcm9wYWdhdGUgZmlsdGVyQnlcbiAgICAgICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICAgICAgLy8gb3V0ZXIgZmllbGRzZXRcbiAgICAgICAgdGhpcy5maWVsZHNldF8gPSBjcmVhdGVGaWVsZHNldChvcHRpb25zLmxhYmVsIHx8IG9wdGlvbnMuY29sdW1uKTtcbiAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZCh0aGlzLmZpZWxkc2V0Xyk7XG5cbiAgICAgICAgLy8gYmluZCBleHBsaWNpdCBvcHRpb25zIHRvIGRhdGEgaWYgc3BlY2lmaWVkXG4gICAgICAgIGlmIChvcHRpb25zLm9wdGlvbnMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zLm9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcHVibGlzaCBzZWxlY3RlZCB2YWx1ZSBvbiBjaGVja2JveCBjaGFuZ2VcbiAgICAgICAgdGhpcy5maWVsZHNldF8uYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZSA9PiB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LnR5cGUgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKHRoaXMuc2VsZWN0ZWRWYWx1ZSA/PyBbXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBsaXN0ZW5lcnNcbiAgICAgICAgdGhpcy5zZXR1cFBhcmFtTGlzdGVuZXIoKTtcbiAgICAgICAgdGhpcy5zZXR1cEFjdGl2YXRpb25MaXN0ZW5lcnModGhpcy5maWVsZHNldF8pO1xuICAgIH1cblxuICAgIGdldCBzZWxlY3RlZFZhbHVlKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgY2hlY2tlZCA9IHRoaXMuZmllbGRzZXRfLnF1ZXJ5U2VsZWN0b3JBbGwoXG4gICAgICAgICAgICAnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnXG4gICAgICAgICkgYXMgTm9kZUxpc3RPZjxIVE1MSW5wdXRFbGVtZW50PjtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20oY2hlY2tlZCkubWFwKGNoZWNrYm94ID0+IGNoZWNrYm94LnZhbHVlKTtcbiAgICB9XG5cbiAgICBzZXQgc2VsZWN0ZWRWYWx1ZSh2YWx1ZXM6IHN0cmluZ1tdKSB7XG4gICAgICAgIGNvbnN0IGNoZWNrYm94ZXMgPSB0aGlzLmZpZWxkc2V0Xy5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgZm9yIChjb25zdCBjaGVja2JveCBvZiBjaGVja2JveGVzKSB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dCA9IGNoZWNrYm94IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICAgICAgICBjb25zdCBzaG91bGRCZUNoZWNrZWQgPSB2YWx1ZXMuaW5jbHVkZXMoaW5wdXQudmFsdWUpO1xuXG4gICAgICAgICAgICBpZiAoaW5wdXQuY2hlY2tlZCAhPT0gc2hvdWxkQmVDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQuY2hlY2tlZCA9IHNob3VsZEJlQ2hlY2tlZDtcbiAgICAgICAgICAgICAgICBpbnB1dC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHF1ZXJ5UmVzdWx0KGRhdGE6IGFueSk6IHRoaXMge1xuICAgICAgICB0aGlzLnNldERhdGEodGhpcy5xdWVyeVJlc3VsdE9wdGlvbnMoZGF0YSkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICB1cGRhdGUoKTogdGhpcyB7XG4gICAgICAgIHNldEZpZWxkc2V0T3B0aW9ucyh0aGlzLmZpZWxkc2V0XywgdGhpcy5kYXRhXywgJ2NoZWNrYm94Jyk7XG4gICAgICAgIHRoaXMudXBkYXRlU2VsZWN0ZWRWYWx1ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCAiaW1wb3J0IHtcbiAgICBjbGF1c2VQb2ludCxcbiAgICBpc1BhcmFtLFxuICAgIGlzU2VsZWN0aW9uLFxuICAgIFNlbGVjdGlvbkNsYXVzZSxcbn0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AdXdkYXRhL21vc2FpYy1jb3JlQDAuMTYuMi8rZXNtJztcbmltcG9ydCB7IElucHV0LCBJbnB1dE9wdGlvbnMgfSBmcm9tICcuL2lucHV0JztcbmltcG9ydCB7IGNyZWF0ZUxhYmVsZWRJbnB1dCwgc2V0dXBBY3RpdmF0aW9uTGlzdGVuZXJzIH0gZnJvbSAnLi91dGlsJztcbmltcG9ydCB7IGdlbmVyYXRlSWQgfSBmcm9tICcuLi91dGlsL2lkJztcblxuZXhwb3J0IGludGVyZmFjZSBDaGVja2JveE9wdGlvbnMgZXh0ZW5kcyBJbnB1dE9wdGlvbnMge1xuICAgIGxhYmVsOiBzdHJpbmc7XG4gICAgY2hlY2tlZDogYm9vbGVhbjtcbiAgICB2YWx1ZXM6IFtzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCwgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGxdO1xuICAgIGZpZWxkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQ2hlY2tib3ggZXh0ZW5kcyBJbnB1dCB7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IG9wdGlvbnNfOiBDaGVja2JveE9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIob3B0aW9uc18uZmlsdGVyQnkpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBlbGVtZW50XG4gICAgICAgIGNvbnN0IHsgaW5wdXRMYWJlbCwgaW5wdXQgfSA9IGNyZWF0ZUxhYmVsZWRJbnB1dCgnY2hlY2tib3gnLCBvcHRpb25zXy5sYWJlbCk7XG4gICAgICAgIGlucHV0LmlkID0gZ2VuZXJhdGVJZCgpO1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoaW5wdXRMYWJlbCk7XG5cbiAgICAgICAgLy8gaGFuZGxlIGluaXRpYWwgY2hlY2tlZCBzdGF0ZVxuICAgICAgICBpbnB1dC5jaGVja2VkID0gIWlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpXG4gICAgICAgICAgICA/ICh0aGlzLm9wdGlvbnNfLmFzPy52YWx1ZSA/PyBvcHRpb25zXy5jaGVja2VkKVxuICAgICAgICAgICAgOiBvcHRpb25zXy5jaGVja2VkO1xuXG4gICAgICAgIC8vIHB1Ymxpc2ggaW5wdXQgKGFuZCBzeW5jIHRvIGNoZWNrYm94IGNoYW5nZXMpXG4gICAgICAgIGNvbnN0IHB1Ymxpc2ggPSAoKSA9PlxuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKFxuICAgICAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPyBvcHRpb25zXy52YWx1ZXNbMF0gfHwgdW5kZWZpbmVkIDogb3B0aW9uc18udmFsdWVzWzFdIHx8IHVuZGVmaW5lZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgcHVibGlzaCk7XG4gICAgICAgIHB1Ymxpc2goKTtcblxuICAgICAgICAvLyBzZXR1cCBwYXJhbSBsaXN0ZW5lclxuICAgICAgICBpZiAoIWlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3ZhbHVlJywgdmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSB2YWx1ZSA9PT0gdGhpcy5vcHRpb25zXy52YWx1ZXNbMF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNldHVwIGFjdGl2YXRpb24gbGlzdGVuZXIgZm9yIHNlbGVjdGlvblxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNldHVwQWN0aXZhdGlvbkxpc3RlbmVycyh0aGlzLCBpbnB1dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKGlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLmFjdGl2YXRlKHRoaXMuY2xhdXNlKCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2xhdXNlKHZhbHVlPzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IFNlbGVjdGlvbkNsYXVzZSB7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zXy5maWVsZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2hlY2tib3ggJ2ZpZWxkJyBvcHRpb24gbXVzdCBiZSBzcGVjaWZpZWQgd2l0aCBzZWxlY3Rpb25cIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2xhdXNlUG9pbnQodGhpcy5vcHRpb25zXy5maWVsZCwgdmFsdWUsIHsgc291cmNlOiB0aGlzIH0pO1xuICAgIH1cblxuICAgIHB1Ymxpc2godmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKSB7XG4gICAgICAgIGlmIChpc1NlbGVjdGlvbih0aGlzLm9wdGlvbnNfLmFzKSkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zXy5hcy51cGRhdGUodGhpcy5jbGF1c2UodmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1BhcmFtKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLnVwZGF0ZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCAiaW1wb3J0IHtcbiAgICBjbGF1c2VJbnRlcnZhbCxcbiAgICBjbGF1c2VQb2ludCxcbiAgICBpc1BhcmFtLFxuICAgIGlzU2VsZWN0aW9uLFxuICAgIFNlbGVjdGlvbkNsYXVzZSxcbn0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9AdXdkYXRhL21vc2FpYy1jb3JlQDAuMTYuMi8rZXNtJztcbmltcG9ydCB7IGdlbmVyYXRlSWQgfSBmcm9tICcuLi91dGlsL2lkJztcbmltcG9ydCB7IElucHV0LCBJbnB1dE9wdGlvbnMgfSBmcm9tICcuL2lucHV0JztcbmltcG9ydCB7XG4gICAgRmlsdGVyRXhwcixcbiAgICBtYXgsXG4gICAgbWluLFxuICAgIFF1ZXJ5LFxufSBmcm9tICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0B1d2RhdGEvbW9zYWljLXNxbEAwLjE2LjIvK2VzbSc7XG5pbXBvcnQgeyBzZXR1cEFjdGl2YXRpb25MaXN0ZW5lcnMgfSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHsga1NpZGViYXJGdWxsd2lkdGggfSBmcm9tICcuL3R5cGVzJztcblxuaW1wb3J0IHtcbiAgICBjcmVhdGUgYXMgY3JlYXRlU2xpZGVyLFxuICAgIEFQSSBhcyBTbGlkZXJBUEksXG59IGZyb20gJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vbm91aXNsaWRlckAxNS44LjEvK2VzbSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2xpZGVyT3B0aW9ucyBleHRlbmRzIElucHV0T3B0aW9ucyB7XG4gICAgc2VsZWN0OiAncG9pbnQnIHwgJ2ludGVydmFsJztcbiAgICB2YWx1ZT86IG51bWJlciB8IFtudW1iZXIsIG51bWJlcl07XG4gICAgZnJvbT86IHN0cmluZztcbiAgICBjb2x1bW4/OiBzdHJpbmc7XG4gICAgZmllbGQ/OiBzdHJpbmc7XG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgbWluPzogbnVtYmVyO1xuICAgIG1heD86IG51bWJlcjtcbiAgICBzdGVwPzogbnVtYmVyO1xuICAgIHdpZHRoPzogbnVtYmVyO1xufVxuXG5jb25zdCBrU2xpZGVySW5wdXQgPSAnc2xpZGVyLWlucHV0JztcblxuZXhwb3J0IGNsYXNzIFNsaWRlciBleHRlbmRzIElucHV0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNsaWRlcl86IEhUTUxEaXZFbGVtZW50O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgc2xpZGVyQXBpXzogU2xpZGVyQVBJO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgY3VydmFsXzogSFRNTExhYmVsRWxlbWVudDtcbiAgICBwcml2YXRlIGZpcnN0UXVlcnlfOiBib29sZWFuID0gZmFsc2U7XG4gICAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IG9wdGlvbnNfOiBTbGlkZXJPcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnNfLmZpbHRlckJ5KTtcblxuICAgICAgICAvLyByZWdpc3RlciBhcyBmdWxsd2lkdGhcbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoa1NsaWRlcklucHV0LCBrU2lkZWJhckZ1bGx3aWR0aCk7XG5cbiAgICAgICAgLy8gYWRkIGxhYmVsIGlmIHNwZWNpZmllZFxuICAgICAgICBjb25zdCBpZCA9IGdlbmVyYXRlSWQoKTtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBvcHRpb25zXy5sYWJlbCB8fCBvcHRpb25zXy5jb2x1bW47XG4gICAgICAgIGxldCBjb250YWluZXI6IEhUTUxFbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgICBpZiAobGFiZWwpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuICAgICAgICAgICAgY29udGFpbmVyLmlubmVyVGV4dCA9IGxhYmVsO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgc2xpZGVyXG4gICAgICAgIGxldCB7IHZhbHVlLCB3aWR0aCwgbWluLCBtYXggfSA9IG9wdGlvbnNfO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBzbGlkZXIgd2lkZ2V0XG4gICAgICAgIHRoaXMuc2xpZGVyXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLnNsaWRlcl8uY2xhc3NMaXN0LmFkZCgnbm9VaS1yb3VuZCcpO1xuICAgICAgICB0aGlzLnNsaWRlcl8uc2V0QXR0cmlidXRlKCdpZCcsIGlkKTtcbiAgICAgICAgaWYgKHdpZHRoICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5zbGlkZXJfLnN0eWxlLndpZHRoID0gYCR7K3dpZHRofXB4YDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5zbGlkZXJfKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnNsaWRlcl8pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2xpZGVyQXBpXyA9IGNyZWF0ZVNsaWRlcih0aGlzLnNsaWRlcl8sIHtcbiAgICAgICAgICAgIHJhbmdlOiB7IG1pbjogMCwgbWF4OiAwIH0sXG4gICAgICAgICAgICBjb25uZWN0OiBvcHRpb25zXy5zZWxlY3QgPT09ICdpbnRlcnZhbCcsXG4gICAgICAgICAgICBzdGFydDogb3B0aW9uc18uc2VsZWN0ID09PSAnaW50ZXJ2YWwnID8gWzAsIDBdIDogMCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYWRkIGN1cnJlbnQgdmFsdWUgbGFiZWxcbiAgICAgICAgdGhpcy5jdXJ2YWxfID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcbiAgICAgICAgdGhpcy5jdXJ2YWxfLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2xpZGVyLXZhbHVlJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmN1cnZhbF8pO1xuXG4gICAgICAgIC8vIGhhbmRsZSBpbml0aWFsIHZhbHVlXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnNfLmFzPy52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2godmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5vcHRpb25zXy5hcz8udmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZXQgdmFsdWUgZGlzcGxheVxuICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRWYWx1ZSgpO1xuXG4gICAgICAgIC8vIHRyYWNrIHBhcmFtIHVwZGF0ZXNcbiAgICAgICAgaWYgKCFpc1NlbGVjdGlvbih0aGlzLm9wdGlvbnNfLmFzKSkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zXy5hcy5hZGRFdmVudExpc3RlbmVyKCd2YWx1ZScsIHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWFyZUVxdWFsKHZhbHVlLCB0aGlzLnNsaWRlclZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNsaWRlckFwaV8uc2V0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVDdXJyZW50VmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNldHVwIGFjdGl2YXRpb24gbGlzdGVuZXJzXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2V0dXBBY3RpdmF0aW9uTGlzdGVuZXJzKHRoaXMsIHRoaXMuc2xpZGVyXyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25maWd1cmUgc2xpZGVyIGlmIHdlIGFyZW4ndCB1c2luZyB0aGUgZGJcbiAgICAgICAgaWYgKCFvcHRpb25zXy5mcm9tKSB7XG4gICAgICAgICAgICBtaW4gPSBtaW4gPz8gKEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWVbMF0gOiAodmFsdWUgPz8gMCkpO1xuICAgICAgICAgICAgbWF4ID0gbWF4ID8/IChBcnJheS5pc0FycmF5KHZhbHVlKSA/IHZhbHVlWzFdIDogKHZhbHVlID8/IDApKTtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gdmFsdWUgPz8gKG9wdGlvbnNfLnNlbGVjdCA9PT0gJ2ludGVydmFsJyA/IFswLCAwXSA6IDApO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTbGlkZXIobWluLCBtYXgsIHN0YXJ0KTtcbiAgICAgICAgICAgIHRoaXMuc2xpZGVyQXBpXy5vbigndXBkYXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQ3VycmVudFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKHRoaXMuc2xpZGVyVmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVDdXJyZW50VmFsdWUoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5zbGlkZXJWYWx1ZTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnZhbF8uaW5uZXJUZXh0ID0gYCR7dmFsdWVbMF0udG9Mb2NhbGVTdHJpbmcoKX0tJHt2YWx1ZVsxXS50b0xvY2FsZVN0cmluZygpfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmN1cnZhbF8uaW5uZXJIVE1MID0gdmFsdWUudG9Mb2NhbGVTdHJpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBzbGlkZXJWYWx1ZSgpOiBudW1iZXIgfCBbbnVtYmVyLCBudW1iZXJdIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLnNsaWRlckFwaV8uZ2V0KCk7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLm1hcChjbGVhbk51bWJlcikuc2xpY2UoMCwgMikgYXMgW251bWJlciwgbnVtYmVyXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhbk51bWJlcih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXQgc2xpZGVyVmFsdWUodmFsdWU6IG51bWJlciB8IFtudW1iZXIsIG51bWJlcl0pIHtcbiAgICAgICAgdGhpcy5zbGlkZXJBcGlfLnNldCh2YWx1ZSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMub3B0aW9uc18uYXM7XG4gICAgICAgIGlmIChpc1NlbGVjdGlvbih0YXJnZXQpKSB7XG4gICAgICAgICAgICB0YXJnZXQuYWN0aXZhdGUodGhpcy5jbGF1c2UoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBxdWVyeShmaWx0ZXI6IEZpbHRlckV4cHJbXSA9IFtdKSB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgY29sdW1uIH0gPSB0aGlzLm9wdGlvbnNfO1xuICAgICAgICBpZiAoIWZyb20gfHwgIWNvbHVtbikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFF1ZXJ5LnNlbGVjdCh7IG1pbjogbWluKGNvbHVtbiksIG1heDogbWF4KGNvbHVtbikgfSlcbiAgICAgICAgICAgIC5mcm9tKGZyb20pXG4gICAgICAgICAgICAud2hlcmUoLi4uZmlsdGVyKTtcbiAgICB9XG5cbiAgICBxdWVyeVJlc3VsdChkYXRhOiBhbnkpIHtcbiAgICAgICAgLy8gZ2V0IG1pbiBhbmQgbWF4XG4gICAgICAgIGNvbnN0IHsgbWluOiBkYXRhTWluLCBtYXg6IGRhdGFNYXggfSA9IEFycmF5LmZyb20oZGF0YSlbMF0gYXMgeyBtaW46IG51bWJlcjsgbWF4OiBudW1iZXIgfTtcbiAgICAgICAgY29uc3QgbWluID0gdGhpcy5vcHRpb25zXy5taW4gPz8gZGF0YU1pbjtcbiAgICAgICAgY29uc3QgbWF4ID0gdGhpcy5vcHRpb25zXy5tYXggPz8gZGF0YU1heDtcblxuICAgICAgICAvLyBzbmFwIHRvIG1pbiBhbmQgbWF4IGlmIGZpcnN0IHF1ZXJ5IGFuZCBubyB2YWx1ZSBzcGVjaWZpZWRcbiAgICAgICAgbGV0IHN0YXJ0ID0gdGhpcy5zbGlkZXJWYWx1ZTtcbiAgICAgICAgaWYgKCF0aGlzLmZpcnN0UXVlcnlfKSB7XG4gICAgICAgICAgICB0aGlzLmZpcnN0UXVlcnlfID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnNfLnZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBzdGFydCA9IHRoaXMub3B0aW9uc18uc2VsZWN0ID09PSAnaW50ZXJ2YWwnID8gW21pbiwgbWF4XSA6IG1heDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgPSB0aGlzLm9wdGlvbnNfLnZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVNsaWRlcihtaW4sIG1heCwgc3RhcnQpO1xuXG4gICAgICAgICAgICB0aGlzLnNsaWRlckFwaV8ub24oJ3VwZGF0ZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCh0aGlzLnNsaWRlclZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTbGlkZXIobWluLCBtYXgsIHN0YXJ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHVwZGF0ZVNsaWRlcihtaW46IG51bWJlciwgbWF4OiBudW1iZXIsIHN0YXJ0OiBudW1iZXIgfCBbbnVtYmVyLCBudW1iZXJdKSB7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLm9wdGlvbnNfLnN0ZXAgPz8gKG1pbiA+PSA1IHx8IG1heCA+PSA1ID8gMSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMuc2xpZGVyQXBpXy51cGRhdGVPcHRpb25zKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgICAgIG1pbixcbiAgICAgICAgICAgICAgICAgICAgbWF4LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3RlcCxcbiAgICAgICAgICAgICAgICBzdGFydCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0cnVlXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGNsYXVzZSh2YWx1ZT86IG51bWJlciB8IFtudW1iZXIsIG51bWJlcl0pOiBTZWxlY3Rpb25DbGF1c2Uge1xuICAgICAgICBsZXQgeyBmaWVsZCwgY29sdW1uLCBtaW4sIHNlbGVjdCA9ICdwb2ludCcgfSA9IHRoaXMub3B0aW9uc187XG4gICAgICAgIGZpZWxkID0gZmllbGQgfHwgY29sdW1uO1xuICAgICAgICBpZiAoIWZpZWxkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgXCJZb3UgbXVzdCBzcGVjaWZ5IGEgJ2NvbHVtbicgb3IgJ2ZpZWxkJyBmb3IgYSBzbGlkZXIgdGFyZ2V0aW5nIGEgc2VsZWN0aW9uLlwiXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxlY3QgPT09ICdpbnRlcnZhbCcgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgZG9tYWluOiBbbnVtYmVyLCBudW1iZXJdID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IFttaW4gPz8gMCwgdmFsdWVdO1xuICAgICAgICAgICAgcmV0dXJuIGNsYXVzZUludGVydmFsKGZpZWxkLCBkb21haW4sIHtcbiAgICAgICAgICAgICAgICBzb3VyY2U6IHRoaXMsXG4gICAgICAgICAgICAgICAgYmluOiAnY2VpbCcsXG4gICAgICAgICAgICAgICAgc2NhbGU6IHsgdHlwZTogJ2lkZW50aXR5JywgZG9tYWluIH0sXG4gICAgICAgICAgICAgICAgcGl4ZWxTaXplOiB0aGlzLm9wdGlvbnNfLnN0ZXAgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY2xhdXNlUG9pbnQoZmllbGQsIEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWVbMF0gOiB2YWx1ZSwge1xuICAgICAgICAgICAgICAgIHNvdXJjZTogdGhpcyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGlzaCh2YWx1ZT86IG51bWJlciB8IFtudW1iZXIsIG51bWJlcl0pIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5vcHRpb25zXy5hcztcbiAgICAgICAgaWYgKGlzU2VsZWN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgIHRhcmdldC51cGRhdGUodGhpcy5jbGF1c2UodmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1BhcmFtKHRhcmdldCkpIHtcbiAgICAgICAgICAgIHRhcmdldC51cGRhdGUodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhcmVFcXVhbChhOiBudW1iZXIgfCBbbnVtYmVyLCBudW1iZXJdLCBiOiBudW1iZXIgfCBbbnVtYmVyLCBudW1iZXJdKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYSkgJiYgQXJyYXkuaXNBcnJheShiKSkge1xuICAgICAgICByZXR1cm4gYS5tYXAoY2xlYW5OdW1iZXIpID09PSBiLm1hcChjbGVhbk51bWJlcik7XG4gICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShhKSAmJiAhQXJyYXkuaXNBcnJheShiKSkge1xuICAgICAgICByZXR1cm4gY2xlYW5OdW1iZXIoYSkgPT09IGNsZWFuTnVtYmVyKGIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFuTnVtYmVyKG51bTogbnVtYmVyIHwgc3RyaW5nKSB7XG4gICAgaWYgKHR5cGVvZiBudW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG51bSA9IHBhcnNlRmxvYXQobnVtKTtcbiAgICB9XG5cbiAgICAvLyBTcGVjaWFsIGNhc2VzXG4gICAgaWYgKCFpc0Zpbml0ZShudW0pKSByZXR1cm4gbnVtO1xuICAgIGlmIChudW0gPT09IDApIHJldHVybiAwO1xuXG4gICAgLy8gRGV0ZXJtaW5lIGEgcmVhc29uYWJsZSBlcHNpbG9uIGJhc2VkIG9uIHRoZSBtYWduaXR1ZGUgb2YgdGhlIG51bWJlclxuICAgIGNvbnN0IG1hZ25pdHVkZSA9IE1hdGguYWJzKG51bSk7XG4gICAgY29uc3QgZXBzaWxvbiA9IG1hZ25pdHVkZSAqIE51bWJlci5FUFNJTE9OICogMTAwO1xuXG4gICAgLy8gUm91bmQgdG8gdGhlIG5lYXJlc3QgXCJjbGVhblwiIHZhbHVlXG4gICAgY29uc3Qgcm91bmRlZCA9IE1hdGgucm91bmQobnVtKTtcblxuICAgIC8vIElmIHZlcnkgY2xvc2UgdG8gYW4gaW50ZWdlciwgcmV0dXJuIHRoZSBpbnRlZ2VyXG4gICAgaWYgKE1hdGguYWJzKG51bSAtIHJvdW5kZWQpIDwgZXBzaWxvbikge1xuICAgICAgICByZXR1cm4gcm91bmRlZDtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHVzZSB0b1ByZWNpc2lvbiB0byBjbGVhbiB1cFxuICAgIHJldHVybiBwYXJzZUZsb2F0KG51bS50b1ByZWNpc2lvbigxNSkpO1xufVxuIiwgImltcG9ydCB7XG4gICAgY2xhdXNlUG9pbnRzLFxuICAgIGlzU2VsZWN0aW9uLFxuICAgIHF1ZXJ5RmllbGRJbmZvLFxuICAgIHRocm90dGxlLFxuICAgIHRvRGF0YUNvbHVtbnMsXG59IGZyb20gJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQHV3ZGF0YS9tb3NhaWMtY29yZUAwLjE2LjIvK2VzbSc7XG5cbmltcG9ydCB7XG4gICAgYW5kLFxuICAgIGFzYyxcbiAgICBjb250YWlucyxcbiAgICBkZXNjLFxuICAgIGVxLFxuICAgIEV4cHJOb2RlLFxuICAgIEZpbHRlckV4cHIsXG4gICAgZ3QsXG4gICAgZ3RlLFxuICAgIGlzTnVsbCxcbiAgICBsaXRlcmFsLFxuICAgIGx0LFxuICAgIGx0ZSxcbiAgICBuZXEsXG4gICAgbm90LFxuICAgIG9yLFxuICAgIHByZWZpeCxcbiAgICBzdWZmaXgsXG4gICAgUXVlcnksXG4gICAgU2VsZWN0UXVlcnksXG4gICAgc3FsLFxuICAgIGNvbHVtbixcbiAgICBhdmcsXG4gICAgY291bnQsXG4gICAgc3VtLFxuICAgIGFyZ21heCxcbiAgICBtYWQsXG4gICAgbWF4LFxuICAgIG1pbixcbiAgICBwcm9kdWN0LFxuICAgIGdlb21lYW4sXG4gICAgbWVkaWFuLFxuICAgIG1vZGUsXG4gICAgdmFyaWFuY2UsXG4gICAgc3RkZGV2LFxuICAgIHNrZXduZXNzLFxuICAgIGt1cnRvc2lzLFxuICAgIGVudHJvcHksXG4gICAgdmFyUG9wLFxuICAgIHN0ZGRldlBvcCxcbiAgICBmaXJzdCxcbiAgICBsYXN0LFxuICAgIHN0cmluZ0FnZyxcbiAgICBhcnJheUFnZyxcbiAgICBhcmdtaW4sXG4gICAgcXVhbnRpbGUsXG4gICAgY29ycixcbiAgICBjb3ZhclBvcCxcbiAgICByZWdySW50ZXJjZXB0LFxuICAgIHJlZ3JTbG9wZSxcbiAgICByZWdyQ291bnQsXG4gICAgcmVnclIyLFxuICAgIHJlZ3JTWFgsXG4gICAgcmVnclNZWSxcbiAgICByZWdyU1hZLFxuICAgIHJlZ3JBdmdYLFxuICAgIHJlZ3JBdmdZLFxufSBmcm9tICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0B1d2RhdGEvbW9zYWljLXNxbEAwLjE2LjIvK2VzbSc7XG5cbmltcG9ydCB7XG4gICAgY3JlYXRlR3JpZCxcbiAgICBHcmlkT3B0aW9ucyxcbiAgICBDb2xEZWYsXG4gICAgTW9kdWxlUmVnaXN0cnksXG4gICAgQWxsQ29tbXVuaXR5TW9kdWxlLFxuICAgIEdyaWRBcGksXG4gICAgdGhlbWVCYWxoYW0sXG4gICAgRmlsdGVyTW9kZWwsXG4gICAgVGV4dEZpbHRlck1vZGVsLFxuICAgIE51bWJlckZpbHRlck1vZGVsLFxuICAgIERhdGVGaWx0ZXJNb2RlbCxcbiAgICBJTXVsdGlGaWx0ZXJNb2RlbCxcbiAgICBTZXRGaWx0ZXJNb2RlbCxcbiAgICBJQ29tYmluZWRTaW1wbGVNb2RlbCxcbiAgICBSb3dTZWxlY3Rpb25PcHRpb25zLFxufSBmcm9tICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2FnLWdyaWQtY29tbXVuaXR5QDMzLjMuMi8rZXNtJztcblxuaW1wb3J0ICogYXMgZDNGb3JtYXQgZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9kMy1mb3JtYXRAMy4xLjAvK2VzbSc7XG5pbXBvcnQgKiBhcyBkM1RpbWVGb3JtYXQgZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9kMy10aW1lLWZvcm1hdEA0LjEuMC8rZXNtJztcbmltcG9ydCB7IElucHV0LCBJbnB1dE9wdGlvbnMgfSBmcm9tICcuL2lucHV0JztcbmltcG9ydCB7IGdlbmVyYXRlSWQgfSBmcm9tICcuLi91dGlsL2lkJztcbmltcG9ydCB7IEpTVHlwZSB9IGZyb20gJ0B1d2RhdGEvbW9zYWljLWNvcmUnO1xuaW1wb3J0IHsgQWdncmVnYXRlTm9kZSwgRXhwclZhbHVlIH0gZnJvbSAnQHV3ZGF0YS9tb3NhaWMtc3FsJztcblxuLy8gVGhlc2UgdHdvIHZhbHVlcyBzaG91bGQgZ2VuZXJhbGx5IGJlIGNvb3JkaW5hdGVkIHNvIHRoYXQgdGhlIG1heCBoZWlnaHQgaXNcbi8vIHRoZSBzaXplIHRoYXQgd2lsbCBkaXNwbGF5IHRoZSByb3cgY291bnQuXG5jb25zdCBrQXV0b1Jvd0NvdW50ID0gMTI7XG5jb25zdCBrQXV0b1Jvd01heEhlaWdodCA9IDM4MDtcblxudHlwZSBUcmFuc2Zvcm0gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuXG50eXBlIENoYW5uZWwgPSBzdHJpbmcgfCBUcmFuc2Zvcm0gfCBib29sZWFuIHwgbnVtYmVyIHwgdW5kZWZpbmVkIHwgQXJyYXk8Ym9vbGVhbiB8IG51bWJlcj47XG5cbi8vIEEgY29sdW1uIHdoaWNoIGhhcyBiZWVuIHJlc29sdmVkIHdpdGggdXNlciBwcm92aWRlZCBpbmZvcm1hdGlvblxudHlwZSBSZXNvbHZlZENvbHVtbiA9IFJlc29sdmVkU2ltcGxlQ29sdW1uIHwgUmVzb2x2ZWRMaXRlcmFsQ29sdW1uIHwgUmVzb2x2ZWRBZ2dyZWdhdGVDb2x1bW47XG5cbi8vIFJlc29sdmVkIENvbHVtbiBhZGRzIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gdG8gdGhlIENvbHVtbiB0eXBlXG4vLyBiYXNlZCB1cG9uIHRoZSByYXcgY29sdW1uIHNwZWNpZmljdGlvbiBwcm92aWRlZCBieSB0aGUgdXNlciwgaW5jbHVkaW5nXG4vLyBhbnkgYWdncmVnYXRpbm9uIGJlaGF2aW9yLlxuZXhwb3J0IGludGVyZmFjZSBCYXNlUmVzb2x2ZWRDb2x1bW4gZXh0ZW5kcyBDb2x1bW4ge1xuICAgIC8vIFRoZSBjb2x1bW4gbmFtZSBhcyBpdCB3aWxsIGJlIHVzZWQgaW4gdGhlIHF1ZXJ5IChlLmcuIHRoZSBhbGlhcyBmb3IgdGhlIGNvbHVtbilcbiAgICAvLyBUaGlzIGNvdWxkIGJlIHN5bnRoZXNpemVkIGlmIHRoaXMgaXMgYW4gYWdncmVnYXRpb24gb3IgbGl0ZXJhbC5cbiAgICBjb2x1bW5fbmFtZTogc3RyaW5nO1xufVxuXG4vLyBBIGNvbHVtbiB3aGljaCBjb250YWlucyBvbmUgb3IgbW9yZSBsaXRlcmFsIHZhbHVlc1xuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZExpdGVyYWxDb2x1bW4gZXh0ZW5kcyBCYXNlUmVzb2x2ZWRDb2x1bW4ge1xuICAgIHR5cGU6ICdsaXRlcmFsJztcbn1cblxuLy8gQSBjb2x1bW4gd2hpY2ggY29udGFpbnMgYW4gYWdncmVnYXRlIGV4cHJlc3Npb25cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRBZ2dyZWdhdGVDb2x1bW4gZXh0ZW5kcyBCYXNlUmVzb2x2ZWRDb2x1bW4ge1xuICAgIC8vIFRoZSBhY3R1YWwgY29sdW1uIG5hbWUgaW4gdGhlIGRhdGFiYXNlXG4gICAgY29sdW1uX2lkOiBzdHJpbmc7XG5cbiAgICAvLyBUaGUgYWdncmVnYXRlIGV4cHJlc3Npb24gYW5kIGl0cyBhcmd1bWVudHMsIGlmIHRoaXMgY29sdW1uIGlzIGFuIGFnZ3JlZ2F0aW9uLlxuICAgIGFnZ19leHByOiBzdHJpbmc7XG4gICAgYWdnX2V4cHJfYXJnczogRXhwclZhbHVlW107XG5cbiAgICB0eXBlOiAnYWdncmVnYXRlJztcbn1cbi8vIEEgY29sdW1uIHdoaWNoIGlzIGEgc2ltcGxlIGNvbHVtbiByZWZlcmVuY2UgaW4gdGhlIGRhdGFiYXNlLlxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFNpbXBsZUNvbHVtbiBleHRlbmRzIEJhc2VSZXNvbHZlZENvbHVtbiB7XG4gICAgLy8gVGhlIGFjdHVhbCBjb2x1bW4gbmFtZSBpbiB0aGUgZGF0YWJhc2VcbiAgICBjb2x1bW5faWQ6IHN0cmluZztcbiAgICB0eXBlOiAnY29sdW1uJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2x1bW4ge1xuICAgIGNvbHVtbjogQ2hhbm5lbDtcbiAgICBsYWJlbD86IHN0cmluZztcbiAgICBhbGlnbj86ICdsZWZ0JyB8ICdyaWdodCcgfCAnY2VudGVyJyB8ICdqdXN0aWZ5JztcbiAgICBmb3JtYXQ/OiBzdHJpbmc7XG4gICAgc29ydGFibGU/OiBib29sZWFuO1xuICAgIGZpbHRlcmFibGU/OiBib29sZWFuO1xuICAgIHdpZHRoPzogbnVtYmVyO1xuICAgIGZsZXg/OiBudW1iZXI7XG4gICAgcmVzaXphYmxlPzogYm9vbGVhbjtcbiAgICBtaW5fd2lkdGg/OiBudW1iZXI7XG4gICAgbWF4X3dpZHRoPzogbnVtYmVyO1xuICAgIGF1dG9faGVpZ2h0PzogYm9vbGVhbjtcbiAgICB3cmFwX3RleHQ/OiBib29sZWFuO1xuICAgIGhlYWRlcl9hdXRvX2hlaWdodD86IGJvb2xlYW47XG4gICAgaGVhZGVyX2FsaWduPzogJ2xlZnQnIHwgJ3JpZ2h0JyB8ICdjZW50ZXInIHwgJ2p1c3RpZnknO1xuICAgIGhlYWRlcl93cmFwX3RleHQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhYmxlU3R5bGUge1xuICAgIGJhY2tncm91bmRfY29sb3I/OiBzdHJpbmc7XG4gICAgZm9yZWdyb3VuZF9jb2xvcj86IHN0cmluZztcbiAgICBhY2NlbnRfY29sb3I/OiBzdHJpbmc7XG4gICAgdGV4dF9jb2xvcj86IHN0cmluZztcbiAgICBoZWFkZXJfdGV4dF9jb2xvcj86IHN0cmluZztcbiAgICBjZWxsX3RleHRfY29sb3I/OiBzdHJpbmc7XG5cbiAgICBmb250X2ZhbWlseT86IHN0cmluZztcbiAgICBoZWFkZXJfZm9udF9mYW1pbHk/OiBzdHJpbmc7XG4gICAgY2VsbF9mb250X2ZhbWlseT86IHN0cmluZztcblxuICAgIHNwYWNpbmc/OiBudW1iZXIgfCBzdHJpbmc7XG5cbiAgICBib3JkZXJfY29sb3I/OiBzdHJpbmc7XG4gICAgYm9yZGVyX3dpZHRoPzogbnVtYmVyIHwgc3RyaW5nO1xuICAgIGJvcmRlcl9yYWRpdXM/OiBudW1iZXIgfCBzdHJpbmc7XG5cbiAgICBzZWxlY3RlZF9yb3dfYmFja2dyb3VuZF9jb2xvcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYWJsZU9wdGlvbnMgZXh0ZW5kcyBJbnB1dE9wdGlvbnMge1xuICAgIGZpbHRlcl9ieTogYW55O1xuICAgIGZyb206IHN0cmluZztcbiAgICBjb2x1bW5zPzogQXJyYXk8c3RyaW5nIHwgQ29sdW1uPjtcbiAgICB3aWR0aD86IG51bWJlcjtcbiAgICBoZWlnaHQ/OiBudW1iZXIgfCAnYXV0byc7XG4gICAgbWF4X3dpZHRoPzogbnVtYmVyO1xuICAgIHBhZ2luYXRpb24/OiB7XG4gICAgICAgIHBhZ2Vfc2l6ZT86IG51bWJlciB8ICdhdXRvJztcbiAgICAgICAgcGFnZV9zaXplX3NlbGVjdG9yPzogbnVtYmVyW10gfCBib29sZWFuO1xuICAgIH07XG4gICAgc29ydGluZz86IGJvb2xlYW47XG4gICAgZmlsdGVyaW5nPzogYm9vbGVhbiB8ICdoZWFkZXInIHwgJ3Jvdyc7XG4gICAgcm93X2hlaWdodD86IG51bWJlcjtcbiAgICBoZWFkZXJfaGVpZ2h0PzogbnVtYmVyIHwgJ2F1dG8nO1xuICAgIHNlbGVjdD86XG4gICAgICAgIHwgJ2hvdmVyJ1xuICAgICAgICB8ICdzaW5nbGVfcm93J1xuICAgICAgICB8ICdtdWx0aXBsZV9yb3cnXG4gICAgICAgIHwgJ3NpbmdsZV9jaGVja2JveCdcbiAgICAgICAgfCAnbXVsdGlwbGVfY2hlY2tib3gnXG4gICAgICAgIHwgJ25vbmUnO1xuICAgIHN0eWxlPzogVGFibGVTdHlsZTtcbiAgICBhdXRvX2ZpbGxpbmc/OiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgQ29sU29ydE1vZGVsIHtcbiAgICBjb2xJZDogc3RyaW5nO1xuICAgIHNvcnQ6ICdhc2MnIHwgJ2Rlc2MnIHwgbnVsbCB8IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGNsYXNzIFRhYmxlIGV4dGVuZHMgSW5wdXQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgaWRfOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBjb2x1bW5zXzogUmVzb2x2ZWRDb2x1bW5bXSA9IFtdO1xuICAgIHByaXZhdGUgY29sdW1uc0J5TmFtZV86IFJlY29yZDxzdHJpbmcsIFJlc29sdmVkQ29sdW1uPiA9IHt9O1xuICAgIHByaXZhdGUgY29sdW1uVHlwZXNfOiBSZWNvcmQ8c3RyaW5nLCBKU1R5cGU+ID0ge307XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IGdyaWRDb250YWluZXJfOiBIVE1MRGl2RWxlbWVudDtcbiAgICBwcml2YXRlIGdyaWRfOiBHcmlkQXBpIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBncmlkT3B0aW9uc186IEdyaWRPcHRpb25zO1xuXG4gICAgcHJpdmF0ZSBjdXJyZW50Um93XzogbnVtYmVyO1xuICAgIHByaXZhdGUgc29ydE1vZGVsXzogQ29sU29ydE1vZGVsW10gPSBbXTtcbiAgICBwcml2YXRlIGZpbHRlck1vZGVsXzogRmlsdGVyTW9kZWwgPSB7fTtcblxuICAgIHByaXZhdGUgZGF0YV86IHsgbnVtUm93czogbnVtYmVyOyBjb2x1bW5zOiBSZWNvcmQ8c3RyaW5nLCBBcnJheTx1bmtub3duPj4gfSA9IHtcbiAgICAgICAgbnVtUm93czogMCxcbiAgICAgICAgY29sdW1uczoge30sXG4gICAgfTtcblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkb25seSBvcHRpb25zXzogVGFibGVPcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnNfLmZpbHRlcl9ieSk7XG5cbiAgICAgICAgLy8gcmVnaXN0ZXIgYWctZ3JpZCBtb2R1bGVzXG4gICAgICAgIE1vZHVsZVJlZ2lzdHJ5LnJlZ2lzdGVyTW9kdWxlcyhbQWxsQ29tbXVuaXR5TW9kdWxlXSk7XG5cbiAgICAgICAgLy8gaWRcbiAgICAgICAgdGhpcy5pZF8gPSBnZW5lcmF0ZUlkKCk7XG5cbiAgICAgICAgLy8gc3RhdGVcbiAgICAgICAgdGhpcy5jdXJyZW50Um93XyA9IC0xO1xuXG4gICAgICAgIC8vIGNsYXNzIGRlY29yYXRpb25cbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2luc3BlY3Qtdml6LXRhYmxlJyk7XG5cbiAgICAgICAgLy8gaGVpZ2h0IGFuZCB3aWR0aFxuICAgICAgICBpZiAodHlwZW9mIHRoaXMub3B0aW9uc18ud2lkdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUud2lkdGggPSBgJHt0aGlzLm9wdGlvbnNfLndpZHRofXB4YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnNfLm1heF93aWR0aCkge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLm1heFdpZHRoID0gYCR7dGhpcy5vcHRpb25zXy5tYXhfd2lkdGh9cHhgO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9uc18uYXV0b19maWxsaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gYDEwMCVgO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9uc18uaGVpZ2h0ICYmIHRoaXMub3B0aW9uc18uaGVpZ2h0ICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBgJHt0aGlzLm9wdGlvbnNfLmhlaWdodH1weGA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zXy5zdHlsZSkge1xuICAgICAgICAgICAgLy8gbm90ZSB0aGF0IHNpbmNlIHRoZXNlIGFyZSBDU1MgdmFyaWFibGVzIHRoYXQgd2UgZGVmaW5lXG4gICAgICAgICAgICAvLyBmb3IgYWRhcHRpbmcgdG8gUXVhcnRvIHRoZW1lcywgd2UgbmVlZCB0byB1c2UgQ1NTXG4gICAgICAgICAgICAvLyB2YXJzIHRvIG92ZXJyaWRlIHRoZSB2YXJpYWJsZXNcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnNfLnN0eWxlPy5iYWNrZ3JvdW5kX2NvbG9yKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgICAgICAgICAgICAgICAnLS1hZy1iYWNrZ3JvdW5kLWNvbG9yJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zXy5zdHlsZS5iYWNrZ3JvdW5kX2NvbG9yXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9uc18uc3R5bGU/LmZvcmVncm91bmRfY29sb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoXG4gICAgICAgICAgICAgICAgICAgICctLWFnLWZvcmVncm91bmQtY29sb3InLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnNfLnN0eWxlLmZvcmVncm91bmRfY29sb3JcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zXy5zdHlsZT8uYWNjZW50X2NvbG9yKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgICAgICAgICAgICAgICAnLS1hZy1hY2NlbnQtY29sb3InLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnNfLnN0eWxlLmFjY2VudF9jb2xvclxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjcmVhdGUgZ3JpZCBjb250YWluZXJcbiAgICAgICAgdGhpcy5ncmlkQ29udGFpbmVyXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLmdyaWRDb250YWluZXJfLmlkID0gdGhpcy5pZF87XG4gICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lcl8uc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgIHRoaXMuZ3JpZENvbnRhaW5lcl8uc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5ncmlkQ29udGFpbmVyXyk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGdyaWQgb3B0aW9uc1xuICAgICAgICB0aGlzLmdyaWRPcHRpb25zXyA9IHRoaXMuY3JlYXRlR3JpZE9wdGlvbnModGhpcy5vcHRpb25zXyk7XG4gICAgfVxuXG4gICAgLy8gY29udHJpYnV0ZSBhIHNlbGVjdGlvbiBjbGF1c2UgYmFjayB0byB0aGUgdGFyZ2V0IHNlbGVjdGlvblxuICAgIGNsYXVzZShyb3dzOiBudW1iZXJbXSA9IFtdKSB7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHRoaXMuZ2V0RGF0YWJhc2VDb2x1bW5zKCkubWFwKGNvbHVtbiA9PiBjb2x1bW4uY29sdW1uX2lkKTtcblxuICAgICAgICBjb25zdCB2YWx1ZXMgPSByb3dzLm1hcChyb3cgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkcy5tYXAoZiA9PiB0aGlzLmRhdGFfLmNvbHVtbnNbZl1bcm93XSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY2xhdXNlUG9pbnRzKGZpZWxkcywgdmFsdWVzLCB7IHNvdXJjZTogdGhpcyB9KTtcbiAgICB9XG5cbiAgICAvLyBtb3NhaWMgY2FsbHMgdGhpcyBhbmQgaW5pdGlhbGl6YXRpb24gdG8gbGV0IHVzIGZldGNoIHRoZSBzY2hlbWFcbiAgICAvLyBhbmQgZG8gcmVsYXRlZCBzZXR1cFxuICAgIGFzeW5jIHByZXBhcmUoKSB7XG4gICAgICAgIC8vIHF1ZXJ5IGF2YWlsYWJsZSBjb2x1bW5zIGZyb20gdGhlIGRhdGFiYXNlXG4gICAgICAgIGNvbnN0IHRhYmxlID0gdGhpcy5vcHRpb25zXy5mcm9tO1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBhd2FpdCBxdWVyeUZpZWxkSW5mbyh0aGlzLmNvb3JkaW5hdG9yISwgW3sgY29sdW1uOiAnKicsIHRhYmxlIH1dKTtcblxuICAgICAgICAvLyBSZXNvbHZlIHRoZSBjb2x1bW5zIHVzaW5nIGVpdGhlciB0aGUgdXNlciBwcm92aWRlZCBjb2x1bW5zIG9yIGFsbFxuICAgICAgICAvLyB0aGUgZmllbGRzIGluIHRoZSBzY2hlbWFcbiAgICAgICAgY29uc3QgdXNlckNvbHVtbnMgPSB0aGlzLm9wdGlvbnNfLmNvbHVtbnNcbiAgICAgICAgICAgID8gdGhpcy5vcHRpb25zXy5jb2x1bW5zXG4gICAgICAgICAgICA6IHNjaGVtYS5tYXAoZiA9PiBmLmNvbHVtbik7XG4gICAgICAgIHRoaXMuY29sdW1uc18gPSByZXNvbHZlQ29sdW1ucyh1c2VyQ29sdW1ucyk7XG4gICAgICAgIHRoaXMuY29sdW1uc0J5TmFtZV8gPSB0aGlzLmNvbHVtbnNfLnJlZHVjZShcbiAgICAgICAgICAgIChhY2MsIGNvbCkgPT4ge1xuICAgICAgICAgICAgICAgIGFjY1tjb2wuY29sdW1uX25hbWVdID0gY29sO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgUmVzb2x2ZWRDb2x1bW4+XG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gRm9yIGVhY2ggbm9uLWxpdGVyYWwgY29sdW1uLCB3ZSBuZWVkIHRvIHJlc29sdmUgdGhlIHR5cGVcbiAgICAgICAgLy8gRG8gdGhpcyBieSB1c2luZyB0aGUgc2NoZW1hIHF1ZXJ5IHRvIGdldCBjb2x1bW4gdHlwZXMgYW5kIHVzZSB0aGVcbiAgICAgICAgLy8gY29sdW1uIHR5cGUgYXMgdGhlIHR5cGUgKGV2ZW4gZm9yIGFnZ3JlZ2F0ZSBjb2x1bW5zICApXG4gICAgICAgIHRoaXMuY29sdW1uc19cbiAgICAgICAgICAgIC5maWx0ZXIoYyA9PiBjLnR5cGUgIT09ICdsaXRlcmFsJylcbiAgICAgICAgICAgIC5mb3JFYWNoKGNvbHVtbiA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHNjaGVtYS5maW5kKHMgPT4gcy5jb2x1bW4gPT09IGNvbHVtbi5jb2x1bW5faWQpO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sdW1uVHlwZXNfW2NvbHVtbi5jb2x1bW5fbmFtZV0gPSBpdGVtLnR5cGUgYXMgSlNUeXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEZvciBsaXRlcmFscywgd2UgbmVlZCB0byBkZXRlcm1pbmUgdGhlaXIgdHlwZXMgYmFzZWQgb24gdGhlIHZhbHVlcyBwcm92aWRlZC5cbiAgICAgICAgdGhpcy5nZXRMaXRlcmFsQ29sdW1ucygpLmZvckVhY2goYyA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2xWYWwgPSBjLmNvbHVtbjtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNvbFZhbCkpIHtcbiAgICAgICAgICAgICAgICAvLyBQZWVrIGF0IHRoZSBmaXJzdCBlbGVtZW50IHRvIGRldGVybWluZSB0aGUgdHlwZVxuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0VmFsID0gY29sVmFsWzBdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVTdHIgPVxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgZmlyc3RWYWwgPT09ICdib29sZWFuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyAnYm9vbGVhbidcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdHlwZW9mIGZpcnN0VmFsID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdudW1iZXInXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlU3RyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sdW1uVHlwZXNfW2MuY29sdW1uX25hbWVdID0gdHlwZVN0ciBhcyBKU1R5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY29sVmFsID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbHVtblR5cGVzX1tjLmNvbHVtbl9uYW1lXSA9ICdib29sZWFuJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbFZhbCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbHVtblR5cGVzX1tjLmNvbHVtbl9uYW1lXSA9ICdudW1iZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBjcmVhdGUgY29sdW1uIGRlZmluaXRpb25zIGZvciBhZy1ncmlkXG4gICAgICAgIGNvbnN0IGNvbHVtbkRlZnM6IENvbERlZltdID0gdGhpcy5jb2x1bW5zXy5tYXAoY29sdW1uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHQgPSB0aGlzLmNvbHVtblR5cGVzX1tjb2x1bW4uY29sdW1uX25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ29sdW1uRGVmKGNvbHVtbi5jb2x1bW5fbmFtZSwgdCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmdyaWRPcHRpb25zXy5jb2x1bW5EZWZzID0gY29sdW1uRGVmcztcblxuICAgICAgICAvLyBjcmVhdGUgdGhlIGdyaWRcbiAgICAgICAgdGhpcy5ncmlkXyA9IGNyZWF0ZUdyaWQodGhpcy5ncmlkQ29udGFpbmVyXywgdGhpcy5ncmlkT3B0aW9uc18pO1xuICAgIH1cblxuICAgIC8vIG1vc2FpYyBjYWxscyB0aGlzIGV2ZXJ5IHRpbWUgaXQgbmVlZHMgdG8gc2hvdyBkYXRhIHRvIGZpbmRcbiAgICAvLyBvdXQgd2hhdCBxdWVyeSB3ZSB3YW50IHRvIHJ1blxuICAgIHF1ZXJ5KGZpbHRlcjogRmlsdGVyRXhwcltdID0gW10pIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0SXRlbXM6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlIHwgc3RyaW5nPiA9IHt9O1xuICAgICAgICBjb25zdCBncm91cEJ5OiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgaGFzX2FnZ3JlZ2F0ZSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEdvIHRocm91Z2ggZWFjaCBjb2x1bW4gYW5kIGRldGVybWluZSB0aGUgc2VsZWN0IGl0ZW1cbiAgICAgICAgLy8gZm9yIHRoZSBjb2x1bW4uIFNvbWUgY29sdW1ucyBtYXkgbm90IGhhdmUgaXRlbXMgYmVjYXVzZVxuICAgICAgICAvLyB0aGV5IGFyZSBwcm92aWRpbmcgYSBsaXRlcmFsIG9yIGxpc3Qgb2YgbGl0ZXJhbHMuXG4gICAgICAgIGZvciAoY29uc3QgY29sdW1uIG9mIHRoaXMuZ2V0RGF0YWJhc2VDb2x1bW5zKCkpIHtcbiAgICAgICAgICAgIGlmIChjb2x1bW4udHlwZSA9PT0gJ2FnZ3JlZ2F0ZScpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gYWdncmVnYXRlRXhwcmVzc2lvbihjb2x1bW4pO1xuICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW1zW2l0ZW1bMF1dID0gaXRlbVsxXTtcbiAgICAgICAgICAgICAgICBoYXNfYWdncmVnYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29sdW1uLnR5cGUgPT09ICdjb2x1bW4nKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0SXRlbXNbY29sdW1uLmNvbHVtbl9pZF0gPSBjb2x1bW4uY29sdW1uX2lkO1xuICAgICAgICAgICAgICAgIGdyb3VwQnkucHVzaChjb2x1bW4uY29sdW1uX2lkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgY29sdW1uc1xuICAgICAgICBsZXQgcXVlcnkgPSBRdWVyeS5mcm9tKHRoaXMub3B0aW9uc18uZnJvbSkuc2VsZWN0KFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoc2VsZWN0SXRlbXMpLmxlbmd0aCA/IHNlbGVjdEl0ZW1zIDogJyonXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gR3JvdXAgYnkgbm9uIGFnZ3JlZ2F0ZWQgY29sdW1uc1xuICAgICAgICBpZiAoaGFzX2FnZ3JlZ2F0ZSAmJiBncm91cEJ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHF1ZXJ5Lmdyb3VwYnkoZ3JvdXBCeSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhcHBseSB0aGUgZXh0ZXJuYWwgZmlsdGVyXG4gICAgICAgIHF1ZXJ5ID0gcXVlcnkud2hlcmUoLi4uZmlsdGVyKTtcblxuICAgICAgICAvLyBhcHBseSB0aGUgZmlsdGVyIG1vZGVsXG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuZmlsdGVyTW9kZWxfKS5mb3JFYWNoKGNvbHVtbk5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29sID0gdGhpcy5jb2x1bW5zQnlOYW1lX1tjb2x1bW5OYW1lXSB8fCB7fTtcbiAgICAgICAgICAgIGlmIChjb2wudHlwZSAhPT0gJ2xpdGVyYWwnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXNlSGF2aW5nID0gY29sLnR5cGUgPT09ICdhZ2dyZWdhdGUnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuZmlsdGVyTW9kZWxfW2NvbHVtbk5hbWVdIGFzIFN1cHBvcnRlZEZpbHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBleHByZXNzaW9uID0gZmlsdGVyRXhwcmVzc2lvbihjb2x1bW5OYW1lLCBmaWx0ZXIsIHF1ZXJ5KTtcbiAgICAgICAgICAgICAgICBpZiAoZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodXNlSGF2aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeS5oYXZpbmcoZXhwcmVzc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeSA9IHF1ZXJ5LndoZXJlKGV4cHJlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBcHBseSBzb3J0aW5nXG4gICAgICAgIGlmICh0aGlzLnNvcnRNb2RlbF8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5zb3J0TW9kZWxfLmZvckVhY2goc29ydCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29sID0gdGhpcy5jb2x1bW5zQnlOYW1lX1tzb3J0LmNvbElkXSB8fCB7fTtcbiAgICAgICAgICAgICAgICBpZiAoY29sLnR5cGUgIT09ICdsaXRlcmFsJykge1xuICAgICAgICAgICAgICAgICAgICBxdWVyeSA9IHF1ZXJ5Lm9yZGVyYnkoc29ydC5zb3J0ID09PSAnYXNjJyA/IGFzYyhzb3J0LmNvbElkKSA6IGRlc2Moc29ydC5jb2xJZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgIH1cblxuICAgIC8vIG1vc2FpYyByZXR1cm5zIHRoZSByZXN1bHRzIG9mIHRoZSBxdWVyeSgpIGluIHRoaXMgZnVuY3Rpb24uXG4gICAgcXVlcnlSZXN1bHQoZGF0YTogYW55KSB7XG4gICAgICAgIHRoaXMuZGF0YV8gPSB0b0RhdGFDb2x1bW5zKGRhdGEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyByZXF1ZXN0cyBhIGNsaWVudCBVSSB1cGRhdGUgKGUuZy4gdG8gcmVmbGVjdCByZXN1bHRzIGZyb20gYSBxdWVyeSlcbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIHRoaXMudXBkYXRlR3JpZChudWxsKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cGRhdGVHcmlkID0gdGhyb3R0bGUoYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZ3JpZF8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbnZlcnQgY29sdW1uLWJhc2VkIGRhdGEgdG8gcm93LWJhc2VkIGRhdGEgZm9yIGFnLWdyaWRcbiAgICAgICAgY29uc3Qgcm93RGF0YTogYW55W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmRhdGFfLm51bVJvd3M7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgcm93OiBhbnkgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuY29sdW1uc18uZm9yRWFjaCgoeyBjb2x1bW5fbmFtZSwgY29sdW1uIH0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb2x1bW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gaSAlIGNvbHVtbi5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHJvd1tjb2x1bW5fbmFtZV0gPSBjb2x1bW5baW5kZXhdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbHVtbiA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGVvZiBjb2x1bW4gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvd1tjb2x1bW5fbmFtZV0gPSBjb2x1bW47XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcm93W2NvbHVtbl9uYW1lXSA9IHRoaXMuZGF0YV8uY29sdW1uc1tjb2x1bW5fbmFtZV1baV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJvd0RhdGEucHVzaChyb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5ncmlkXy5zZXRHcmlkT3B0aW9uKCdyb3dEYXRhJywgcm93RGF0YSk7XG4gICAgICAgIGlmICh0aGlzLmRhdGFfLm51bVJvd3MgPCBrQXV0b1Jvd0NvdW50ICYmIHRoaXMub3B0aW9uc18uaGVpZ2h0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZF8uc2V0R3JpZE9wdGlvbignZG9tTGF5b3V0JywgJ2F1dG9IZWlnaHQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICF0aGlzLm9wdGlvbnNfLmF1dG9fZmlsbGluZyAmJlxuICAgICAgICAgICAgKHRoaXMub3B0aW9uc18uaGVpZ2h0ID09PSAnYXV0bycgfHwgdGhpcy5vcHRpb25zXy5oZWlnaHQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gYCR7a0F1dG9Sb3dNYXhIZWlnaHR9cHhgO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBwcml2YXRlIGNyZWF0ZUdyaWRPcHRpb25zKG9wdGlvbnM6IFRhYmxlT3B0aW9ucyk6IEdyaWRPcHRpb25zIHtcbiAgICAgICAgY29uc3QgaGVhZGVySGVpZ2h0UGl4ZWxzID1cbiAgICAgICAgICAgIHR5cGVvZiBvcHRpb25zLmhlYWRlcl9oZWlnaHQgPT09ICdzdHJpbmcnID8gdW5kZWZpbmVkIDogb3B0aW9ucy5oZWFkZXJfaGVpZ2h0O1xuICAgICAgICBjb25zdCBob3ZlclNlbGVjdCA9IG9wdGlvbnMuc2VsZWN0ID09PSAnaG92ZXInO1xuICAgICAgICBjb25zdCBleHBsaWNpdFNlbGVjdGlvbiA9IHJlc29sdmVSb3dTZWxlY3Rpb24ob3B0aW9ucyk7XG5cbiAgICAgICAgLy8gVGhlbWVcbiAgICAgICAgY29uc3QgZ3JpZFRoZW1lID0gdGhlbWVCYWxoYW0ud2l0aFBhcmFtcyh7XG4gICAgICAgICAgICB0ZXh0Q29sb3I6IHRoaXMub3B0aW9uc18uc3R5bGU/LnRleHRfY29sb3IsXG4gICAgICAgICAgICBoZWFkZXJUZXh0Q29sb3I6XG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zXy5zdHlsZT8uaGVhZGVyX3RleHRfY29sb3IgfHwgdGhpcy5vcHRpb25zXy5zdHlsZT8udGV4dF9jb2xvcixcbiAgICAgICAgICAgIGNlbGxUZXh0Q29sb3I6IHRoaXMub3B0aW9uc18uc3R5bGU/LmNlbGxfdGV4dF9jb2xvcixcblxuICAgICAgICAgICAgZm9udEZhbWlseTogdGhpcy5vcHRpb25zXy5zdHlsZT8uZm9udF9mYW1pbHksXG4gICAgICAgICAgICBoZWFkZXJGb250RmFtaWx5OlxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9uc18uc3R5bGU/LmhlYWRlcl9mb250X2ZhbWlseSB8fCB0aGlzLm9wdGlvbnNfLnN0eWxlPy5mb250X2ZhbWlseSxcbiAgICAgICAgICAgIGNlbGxGb250RmFtaWx5OlxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9uc18uc3R5bGU/LmNlbGxfZm9udF9mYW1pbHkgfHwgdGhpcy5vcHRpb25zXy5zdHlsZT8uZm9udF9mYW1pbHksXG5cbiAgICAgICAgICAgIHNwYWNpbmc6IHRoaXMub3B0aW9uc18uc3R5bGU/LnNwYWNpbmcgfHwgNCxcblxuICAgICAgICAgICAgYm9yZGVyQ29sb3I6IHRoaXMub3B0aW9uc18uc3R5bGU/LmJvcmRlcl9jb2xvcixcbiAgICAgICAgICAgIGJvcmRlclJhZGl1czogdGhpcy5vcHRpb25zXy5zdHlsZT8uYm9yZGVyX3JhZGl1cyxcblxuICAgICAgICAgICAgc2VsZWN0ZWRSb3dCYWNrZ3JvdW5kQ29sb3I6IHRoaXMub3B0aW9uc18uc3R5bGU/LnNlbGVjdGVkX3Jvd19iYWNrZ3JvdW5kX2NvbG9yLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgZG9tTGF5b3V0ID0gdGhpcy5vcHRpb25zXy5oZWlnaHQgPT09ICdhdXRvJyA/ICdhdXRvSGVpZ2h0JyA6IHVuZGVmaW5lZDtcblxuICAgICAgICAvLyBpbml0aWFsaXplIGdyaWQgb3B0aW9uc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gYWx3YXlzIHBhc3MgZmlsdGVyIHRvIGFsbG93IHNlcnZlci1zaWRlIGZpbHRlcmluZ1xuICAgICAgICAgICAgcGFnaW5hdGlvbjogISFvcHRpb25zLnBhZ2luYXRpb24sXG4gICAgICAgICAgICBwYWdpbmF0aW9uQXV0b1BhZ2VTaXplOlxuICAgICAgICAgICAgICAgIG9wdGlvbnMucGFnaW5hdGlvbj8ucGFnZV9zaXplID09PSAnYXV0bycgfHxcbiAgICAgICAgICAgICAgICBvcHRpb25zLnBhZ2luYXRpb24/LnBhZ2Vfc2l6ZSA9PT0gdW5kZWZpbmVkLFxuICAgICAgICAgICAgcGFnaW5hdGlvblBhZ2VTaXplU2VsZWN0b3I6IG9wdGlvbnMucGFnaW5hdGlvbj8ucGFnZV9zaXplX3NlbGVjdG9yLFxuICAgICAgICAgICAgcGFnaW5hdGlvblBhZ2VTaXplOlxuICAgICAgICAgICAgICAgIHR5cGVvZiBvcHRpb25zLnBhZ2luYXRpb24/LnBhZ2Vfc2l6ZSA9PT0gJ251bWJlcidcbiAgICAgICAgICAgICAgICAgICAgPyBvcHRpb25zLnBhZ2luYXRpb24ucGFnZV9zaXplXG4gICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgYW5pbWF0ZVJvd3M6IGZhbHNlLFxuICAgICAgICAgICAgaGVhZGVySGVpZ2h0OiBoZWFkZXJIZWlnaHRQaXhlbHMsXG4gICAgICAgICAgICByb3dIZWlnaHQ6IG9wdGlvbnMucm93X2hlaWdodCxcbiAgICAgICAgICAgIGRvbUxheW91dCxcbiAgICAgICAgICAgIGNvbHVtbkRlZnM6IFtdLFxuICAgICAgICAgICAgcm93RGF0YTogW10sXG4gICAgICAgICAgICByb3dTZWxlY3Rpb246IGV4cGxpY2l0U2VsZWN0aW9uLFxuICAgICAgICAgICAgc3VwcHJlc3NDZWxsRm9jdXM6IHRydWUsXG4gICAgICAgICAgICBlbmFibGVDZWxsVGV4dFNlbGVjdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgIHRoZW1lOiBncmlkVGhlbWUsXG4gICAgICAgICAgICBvbkZpbHRlckNoYW5nZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDYXB0dXJlIHRoZSBmaWx0ZXIgbW9kZWwgZm9yIHNlcnZlci1zaWRlIHVzZVxuICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyTW9kZWxfID0gdGhpcy5ncmlkXz8uZ2V0RmlsdGVyTW9kZWwoKSB8fCB7fTtcblxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgc2VydmVyLXNpZGUgcXVlcnlcbiAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RRdWVyeSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU29ydENoYW5nZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ncmlkXykge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIGEgc29ydCBtb2RlbFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzb3J0TW9kZWwgPSB0aGlzLmdyaWRfXG4gICAgICAgICAgICAgICAgICAgICAgICAuZ2V0Q29sdW1uU3RhdGUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihjb2wgPT4gY29sLnNvcnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKGNvbCA9PiAoeyBjb2xJZDogY29sLmNvbElkLCBzb3J0OiBjb2wuc29ydCB9KSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc29ydE1vZGVsXyA9IHNvcnRNb2RlbDtcblxuICAgICAgICAgICAgICAgICAgICAvLyByZXF1ZXJ5IHVzaW5nIHRoZSBuZXcgc29ydCBtb2RlbFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RRdWVyeSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblNlbGVjdGlvbkNoYW5nZWQ6IGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXhwbGljaXRTZWxlY3Rpb24gIT09IHVuZGVmaW5lZCAmJiBpc1NlbGVjdGlvbih0aGlzLm9wdGlvbnNfLmFzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc2VsZWN0ZWROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBzZWxlY3RlZCByb3dzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3dJbmRpY2VzID0gZXZlbnQuc2VsZWN0ZWROb2Rlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAobiA9PiBuLnJvd0luZGV4KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIobiA9PiBuICE9PSBudWxsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBzZWxlY3Rpb24gY2xhdXNlIGluIHRoZSB0YXJnZXQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLnVwZGF0ZSh0aGlzLmNsYXVzZShyb3dJbmRpY2VzKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DZWxsTW91c2VPdmVyOiBldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGhvdmVyU2VsZWN0ICYmIGlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvd0luZGV4ID0gZXZlbnQucm93SW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd0luZGV4ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd0luZGV4ICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgICAgICAgICByb3dJbmRleCAhPT0gdGhpcy5jdXJyZW50Um93X1xuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFJvd18gPSByb3dJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9uc18uYXMudXBkYXRlKHRoaXMuY2xhdXNlKFtyb3dJbmRleF0pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNlbGxNb3VzZU91dDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChob3ZlclNlbGVjdCAmJiBpc1NlbGVjdGlvbih0aGlzLm9wdGlvbnNfLmFzKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRSb3dfID0gLTE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9uc18uYXMudXBkYXRlKHRoaXMuY2xhdXNlKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkdyaWRSZWFkeTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFdoZW4gdGhlIGdyaWQgaXMgcmVhZHksIHdlIGNhbiB1cGRhdGUgaXQgd2l0aCB0aGUgaW5pdGlhbCBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5wYXRjaEdyaWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRMaXRlcmFsQ29sdW1ucygpOiBSZXNvbHZlZExpdGVyYWxDb2x1bW5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbHVtbnNfLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ2xpdGVyYWwnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldERhdGFiYXNlQ29sdW1ucygpOiBBcnJheTxSZXNvbHZlZFNpbXBsZUNvbHVtbiB8IFJlc29sdmVkQWdncmVnYXRlQ29sdW1uPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbHVtbnNfLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ2NvbHVtbicgfHwgYy50eXBlID09PSAnYWdncmVnYXRlJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjcmVhdGVDb2x1bW5EZWYoY29sdW1uX25hbWU6IHN0cmluZywgdHlwZTogSlNUeXBlKTogQ29sRGVmIHtcbiAgICAgICAgY29uc3QgY29sdW1uID0gdGhpcy5jb2x1bW5zQnlOYW1lX1tjb2x1bW5fbmFtZV0gfHwge307XG5cbiAgICAgICAgLy8gQWxpZ24sIG51bWJlcnMgcmlnaHQgYWxpZ25lZCBieSBkZWZhdWx0XG4gICAgICAgIGNvbnN0IGFsaWduID0gY29sdW1uLmFsaWduIHx8ICh0eXBlID09PSAnbnVtYmVyJyA/ICdyaWdodCcgOiAnbGVmdCcpO1xuICAgICAgICBjb25zdCBoZWFkZXJBbGlnbm1lbnQgPSBjb2x1bW4uaGVhZGVyX2FsaWduO1xuXG4gICAgICAgIC8vIEZvcm1hdCBzdHJpbmdcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gZm9ybWF0dGVyRm9yVHlwZSh0eXBlLCBjb2x1bW4uZm9ybWF0KTtcblxuICAgICAgICAvLyBTb3J0aW5nIC8gZmlsdGVyaW5nXG4gICAgICAgIGNvbnN0IHNvcnRhYmxlID0gdGhpcy5vcHRpb25zXy5zb3J0aW5nICE9PSBmYWxzZSAmJiBjb2x1bW4uc29ydGFibGUgIT09IGZhbHNlO1xuICAgICAgICBjb25zdCBmaWx0ZXJhYmxlID0gdGhpcy5vcHRpb25zXy5maWx0ZXJpbmcgIT09IGZhbHNlICYmIGNvbHVtbi5maWx0ZXJhYmxlICE9PSBmYWxzZTtcblxuICAgICAgICAvLyBTaXppbmdcbiAgICAgICAgY29uc3QgcmVzaXphYmxlID0gY29sdW1uLnJlc2l6YWJsZSAhPT0gZmFsc2U7XG5cbiAgICAgICAgLy8gTWluIGFuZCBtYXggd2lkdGhcbiAgICAgICAgY29uc3QgbWluV2lkdGggPSBjb2x1bW4ubWluX3dpZHRoO1xuICAgICAgICBjb25zdCBtYXhXaWR0aCA9IGNvbHVtbi5tYXhfd2lkdGg7XG5cbiAgICAgICAgLy8gYXV0byBoZWlnaHRcbiAgICAgICAgY29uc3QgYXV0b0hlaWdodCA9IGNvbHVtbi5hdXRvX2hlaWdodDtcbiAgICAgICAgY29uc3QgYXV0b0hlYWRlckhlaWdodCA9XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmhlYWRlcl9oZWlnaHQgPT09ICdhdXRvJyAmJiBjb2x1bW4uaGVhZGVyX2F1dG9faGVpZ2h0ICE9PSBmYWxzZTtcblxuICAgICAgICAvLyB3cmFwIHRleHRcbiAgICAgICAgY29uc3Qgd3JhcFRleHQgPSBjb2x1bW4ud3JhcF90ZXh0O1xuICAgICAgICBjb25zdCB3cmFwSGVhZGVyVGV4dCA9IGNvbHVtbi5oZWFkZXJfd3JhcF90ZXh0O1xuXG4gICAgICAgIC8vIGZsZXhcbiAgICAgICAgY29uc3QgZmxleCA9IGNvbHVtbi5mbGV4O1xuXG4gICAgICAgIC8vIERpc2FibGVzIGNsaWVudCBzaWRlIHNvcnRpbmcgKHVzZWQgZm9yIG5vbi1saXRlcmFsIGNvbHVtbnNcbiAgICAgICAgLy8gd2hlcmUgdGhlIGRhdGFiYXNlIGNhbiBoYW5kbGUgdGhlIHNvcnRpbmcpXG4gICAgICAgIGNvbnN0IGRpc2FibGVDbGllbnRTb3J0ID0gKF92YWx1ZUE6IHVua25vd24sIF92YWx1ZUI6IHVua25vd24pID0+IHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFBvc2l0aW9uIHRoZSBmaWx0ZXIgYmVsb3cgdGhlIGhlYWRlclxuICAgICAgICBjb25zdCBjb2xEZWY6IENvbERlZiA9IHtcbiAgICAgICAgICAgIGZpZWxkOiBjb2x1bW5fbmFtZSxcbiAgICAgICAgICAgIGhlYWRlck5hbWU6IGNvbHVtbi5sYWJlbCB8fCBjb2x1bW5fbmFtZSxcbiAgICAgICAgICAgIGhlYWRlckNsYXNzOiBoZWFkZXJDbGFzc2VzKGhlYWRlckFsaWdubWVudCksXG4gICAgICAgICAgICBjZWxsU3R5bGU6IHsgdGV4dEFsaWduOiBhbGlnbiB9LFxuICAgICAgICAgICAgY29tcGFyYXRvcjogY29sdW1uLnR5cGUgIT09ICdsaXRlcmFsJyA/IGRpc2FibGVDbGllbnRTb3J0IDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZmlsdGVyOiAhZmlsdGVyYWJsZSA/IGZhbHNlIDogZmlsdGVyRm9yQ29sdW1uVHlwZSh0eXBlKSxcbiAgICAgICAgICAgIGZsZXgsXG4gICAgICAgICAgICBzb3J0YWJsZSxcbiAgICAgICAgICAgIHJlc2l6YWJsZSxcbiAgICAgICAgICAgIG1pbldpZHRoLFxuICAgICAgICAgICAgbWF4V2lkdGgsXG4gICAgICAgICAgICBhdXRvSGVpZ2h0LFxuICAgICAgICAgICAgYXV0b0hlYWRlckhlaWdodCxcbiAgICAgICAgICAgIHdyYXBUZXh0LFxuICAgICAgICAgICAgd3JhcEhlYWRlclRleHQsXG4gICAgICAgICAgICBmbG9hdGluZ0ZpbHRlcjogdGhpcy5vcHRpb25zXy5maWx0ZXJpbmcgPT09ICdyb3cnLFxuICAgICAgICAgICAgLy8gRGlzYWJsZSBjb2x1bW4gbW92aW5nXG4gICAgICAgICAgICBzdXBwcmVzc01vdmFibGU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZUZvcm1hdHRlcjogcGFyYW1zID0+IHtcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgdGhlIHZhbHVlIGlmIGEgZm9ybWF0IGlzIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJhbXMudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGZvcm1hdHRlciAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZXIodmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNldCBjb2x1bW5zIHdpZHRocywgaWYgZXhwbGljaXRseSBwcm92aWRlZFxuICAgICAgICAvLyBvdGhlcndpc2UgdXNlIGZsZXggdG8gbWFrZSBhbGwgY29sdW1ucyBlcXVhbFxuICAgICAgICBjb25zdCB3aWR0aCA9IGNvbHVtbi53aWR0aDtcbiAgICAgICAgaWYgKHdpZHRoKSB7XG4gICAgICAgICAgICBjb2xEZWYud2lkdGggPSB3aWR0aDtcbiAgICAgICAgfSBlbHNlIGlmIChmbGV4ID09PSB1bmRlZmluZWQgfHwgZmxleCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29sRGVmLmZsZXggPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbERlZjtcbiAgICB9XG5cbiAgICBwcml2YXRlIHBhdGNoR3JpZCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmdyaWRfKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb2x1bW5zID0gdGhpcy5ncmlkXy5nZXRDb2x1bW5zKCk7XG4gICAgICAgIGlmIChjb2x1bW5zKSB7XG4gICAgICAgICAgICBjb2x1bW5zLmZvckVhY2goYXN5bmMgY29sdW1uID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xJZCA9IGNvbHVtbi5nZXRDb2xJZCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlckluc3RhbmNlID0gYXdhaXQgdGhpcy5ncmlkXyEuZ2V0Q29sdW1uRmlsdGVySW5zdGFuY2UoY29sSWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbCA9IHRoaXMuY29sdW1uc0J5TmFtZV9bY29sSWRdIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIHdvcmthcm91bmQgdG8gZGlzYWJsZSBjbGllbnQgc2lkZSBmaWx0ZXJpbmcgc28gd2UgY2FuIGltcGxlbWVudFxuICAgICAgICAgICAgICAgIC8vIGZpbHRlcmluZyB1c2luZyB0aGUgcXVlcnkgbWV0aG9kIGluc3RlYWQuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyBTaW5jZSBsaXRlcmFsIGNvbHVtbnMgYXJlbid0IGZpbHRlcmVkIGluIHRoZSBkYXRhYmFzZSwgd2UgaW5zdGVhZFxuICAgICAgICAgICAgICAgIC8vIHVzZSBjbGllbnQgc2lkZSBmaWx0ZXJpbmcgZm9yIHRoZXNlXG4gICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJJbnN0YW5jZSAmJlxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgZmlsdGVySW5zdGFuY2UuZG9lc0ZpbHRlclBhc3MgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgICAgICAgICAgY29sLnR5cGUgIT09ICdsaXRlcmFsJ1xuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJJbnN0YW5jZS5kb2VzRmlsdGVyUGFzcyA9ICgpID0+IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBhbGwgbW9zYWljIGlucHV0cyBpbXBsZW1lbnQgdGhpcywgbm90IGV4YWN0bHkgc3VyZSB3aGF0IGl0IGRvZXNcbiAgICBhY3RpdmF0ZSgpIHtcbiAgICAgICAgaWYgKGlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLmFjdGl2YXRlKHRoaXMuY2xhdXNlKFtdKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNvbnN0IHJlc29sdmVDb2x1bW5zID0gKGNvbHVtbnM6IEFycmF5PHN0cmluZyB8IENvbHVtbj4pOiBSZXNvbHZlZENvbHVtbltdID0+IHtcbiAgICBsZXQgY29sdW1uQ291bnQgPSAxO1xuICAgIGNvbnN0IGluY3JlbWVudGVkQ29sdW1uTmFtZSA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIGBjb2xfJHtjb2x1bW5Db3VudCsrfWA7XG4gICAgfTtcblxuICAgIHJldHVybiBjb2x1bW5zLm1hcChjb2wgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGNvbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIENvbHVtbiBpcyBqdXN0IGEgY29sdW1uIGlkXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGNvbHVtbl9uYW1lOiBjb2wsXG4gICAgICAgICAgICAgICAgY29sdW1uX2lkOiBjb2wsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBjb2wsXG4gICAgICAgICAgICAgICAgdHlwZTogJ2NvbHVtbicsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2wgPT09ICdvYmplY3QnICYmIGNvbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gQ29sdW1uIGlzIGFuIG9iamVjdCAoYSBDb2x1bW4pLCB3ZSBuZWVkIHRvIHBhcnNlIHRoZSBjb2x1bW5cbiAgICAgICAgICAgIC8vIHByb3BlcnR5IHRvIHByb3Blcmx5IHJlc29sdmUgaXRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29sLmNvbHVtbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAuLi5jb2wsXG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbl9uYW1lOiBjb2wuY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICBjb2x1bW5faWQ6IGNvbC5jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjb2x1bW4nLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2wuY29sdW1uID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjb2x1bW4gaXMgYSBudW1iZXIsIHRyZWF0IGl0IGFzIGFuIGluZGV4XG4gICAgICAgICAgICAgICAgLy8gSXQgaGFzIG5vIGNvbHVtbl9pZCBzaW5jZSBpdCBpc24ndCBpbiB0aGUgZGF0YWJhc2UgLSB3ZSBnZW5lcmF0ZVxuICAgICAgICAgICAgICAgIC8vIGEgZGlzcGxheSBhbGlhcyBmb3IgaXRcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAuLi5jb2wsXG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbl9uYW1lOiBpbmNyZW1lbnRlZENvbHVtbk5hbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBjb2wuY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbGl0ZXJhbCcsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbC5jb2x1bW4gPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjb2x1bW4gaXMgYSBib29sZWFuLCB0cmVhdCBpdCBhcyBhIGZsYWdcbiAgICAgICAgICAgICAgICAvLyBJdCBoYXMgbm8gY29sdW1uX2lkIHNpbmNlIGl0IGlzbid0IGluIHRoZSBkYXRhYmFzZSAtIHdlIGdlbmVyYXRlXG4gICAgICAgICAgICAgICAgLy8gYSBkaXNwbGF5IGFsaWFzIGZvciBpdFxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmNvbCxcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uX25hbWU6IGluY3JlbWVudGVkQ29sdW1uTmFtZSgpLFxuICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGNvbC5jb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdsaXRlcmFsJyxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGNvbC5jb2x1bW4pKSB7XG4gICAgICAgICAgICAgICAgLy8gcGVlayBhdCB0aGUgZmlyc3QgZWxlbWVudCB0byBkZXRlcm1pbmUgdGhlIHR5cGVcbiAgICAgICAgICAgICAgICBpZiAoY29sLmNvbHVtbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSBhcnJheSBjb2x1bW4gaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAuLi5jb2wsXG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbl9uYW1lOiBpbmNyZW1lbnRlZENvbHVtbk5hbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBjb2wuY29sdW1uLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbGl0ZXJhbCcsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbC5jb2x1bW4gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWdnID0gT2JqZWN0LmtleXMoY29sLmNvbHVtbilbMF07XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Q29sdW1uID0gY29sLmNvbHVtblthZ2ddO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmNvbCxcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uX25hbWU6IGAke2FnZ31fJHt0YXJnZXRDb2x1bW59YCxcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uX2lkOiB0YXJnZXRDb2x1bW4sXG4gICAgICAgICAgICAgICAgICAgIGFnZ19leHByOiBhZ2csXG4gICAgICAgICAgICAgICAgICAgIGFnZ19leHByX2FyZ3M6IFt0YXJnZXRDb2x1bW5dLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWdncmVnYXRlJyxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIGNvbHVtbiB0eXBlOiAnICsgdHlwZW9mIGNvbC5jb2x1bW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbHVtbiBkZWZpbml0aW9uOiAke2NvbH1gKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuY29uc3QgaGVhZGVyQ2xhc3NlcyA9IChhbGlnbj86ICdsZWZ0JyB8ICdyaWdodCcgfCAnY2VudGVyJyB8ICdqdXN0aWZ5Jyk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkID0+IHtcbiAgICBpZiAoIWFsaWduKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBbYGhlYWRlci0ke2FsaWdufWBdO1xufTtcblxuY29uc3QgcmVzb2x2ZVJvd1NlbGVjdGlvbiA9IChvcHRpb25zOiBUYWJsZU9wdGlvbnMpOiBSb3dTZWxlY3Rpb25PcHRpb25zPGFueSwgYW55PiB8IHVuZGVmaW5lZCA9PiB7XG4gICAgaWYgKG9wdGlvbnMuc2VsZWN0ID09PSAnaG92ZXInKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0VHlwZSA9IG9wdGlvbnMuc2VsZWN0IHx8ICdzaW5nbGVfcm93JztcbiAgICBpZiAoc2VsZWN0VHlwZS5zdGFydHNXaXRoKCdzaW5nbGVfJykpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1vZGU6ICdzaW5nbGVSb3cnLFxuICAgICAgICAgICAgY2hlY2tib3hlczogb3B0aW9ucy5zZWxlY3QgPT09ICdzaW5nbGVfY2hlY2tib3gnLFxuICAgICAgICAgICAgZW5hYmxlQ2xpY2tTZWxlY3Rpb246IG9wdGlvbnMuc2VsZWN0ID09PSAnc2luZ2xlX3JvdycsXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChzZWxlY3RUeXBlLnN0YXJ0c1dpdGgoJ211bHRpcGxlXycpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBtb2RlOiAnbXVsdGlSb3cnLFxuICAgICAgICAgICAgc2VsZWN0QWxsOiAnZmlsdGVyZWQnLFxuICAgICAgICAgICAgY2hlY2tib3hlczogb3B0aW9ucy5zZWxlY3QgPT09ICdtdWx0aXBsZV9jaGVja2JveCcsXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNlbGVjdCBvcHRpb246ICcgKyBvcHRpb25zLnNlbGVjdCk7XG4gICAgfVxufTtcblxuY29uc3QgZmlsdGVyRm9yQ29sdW1uVHlwZSA9ICh0eXBlOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIC8vIFNlbGVjdCB0aGUgcHJvcGVyIGZpbHRlciB0eXBlIGJhc2VkIG9uIHRoZSBjb2x1bW4gdHlwZVxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgY2FzZSAnZmxvYXQnOlxuICAgICAgICBjYXNlICdkZWNpbWFsJzpcbiAgICAgICAgICAgIHJldHVybiAnYWdOdW1iZXJDb2x1bW5GaWx0ZXInO1xuICAgICAgICBjYXNlICdkYXRlJzpcbiAgICAgICAgY2FzZSAnZGF0ZXRpbWUnOlxuICAgICAgICBjYXNlICd0aW1lc3RhbXAnOlxuICAgICAgICAgICAgcmV0dXJuICdhZ0RhdGVDb2x1bW5GaWx0ZXInO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiAnYWdUZXh0Q29sdW1uRmlsdGVyJztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiAnYWdUZXh0Q29sdW1uRmlsdGVyJztcbiAgICB9XG59O1xuXG5jb25zdCBmb3JtYXR0ZXJGb3JUeXBlID0gKHR5cGU6IHN0cmluZywgZm9ybWF0U3RyPzogc3RyaW5nKSA9PiB7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgcmV0dXJuIGQzRm9ybWF0LmZvcm1hdChmb3JtYXRTdHIgfHwgJywnKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgY2FzZSAnZmxvYXQnOlxuICAgICAgICAgICAgcmV0dXJuIGQzRm9ybWF0LmZvcm1hdChmb3JtYXRTdHIgfHwgJywuMn5mJyk7XG4gICAgICAgIGNhc2UgJ2RlY2ltYWwnOlxuICAgICAgICAgICAgcmV0dXJuIGQzRm9ybWF0LmZvcm1hdChmb3JtYXRTdHIgfHwgJywuNH5mJyk7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgLy8gSVNPIGRhdGUgZm9ybWF0ICgyMDI0LTAzLTE1KVxuICAgICAgICAgICAgcmV0dXJuIGQzVGltZUZvcm1hdC50aW1lRm9ybWF0KGZvcm1hdFN0ciB8fCAnJVktJW0tJWQnKTtcbiAgICAgICAgY2FzZSAnZGF0ZXRpbWUnOlxuICAgICAgICBjYXNlICd0aW1lc3RhbXAnOlxuICAgICAgICAgICAgLy8gSVNPIGRhdGV0aW1lIGZvcm1hdFxuICAgICAgICAgICAgcmV0dXJuIGQzVGltZUZvcm1hdC50aW1lRm9ybWF0KGZvcm1hdFN0ciB8fCAnJVktJW0tJWQgJUg6JU06JVMnKTtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn07XG5cbnR5cGUgQmFzZUZpbHRlciA9XG4gICAgfCBUZXh0RmlsdGVyTW9kZWxcbiAgICB8IE51bWJlckZpbHRlck1vZGVsXG4gICAgfCBEYXRlRmlsdGVyTW9kZWxcbiAgICB8IElNdWx0aUZpbHRlck1vZGVsXG4gICAgfCBTZXRGaWx0ZXJNb2RlbDtcblxudHlwZSBTdXBwb3J0ZWRGaWx0ZXIgPSBCYXNlRmlsdGVyIHwgSUNvbWJpbmVkU2ltcGxlTW9kZWw8QmFzZUZpbHRlcj47XG5cbmNvbnN0IGZpbHRlckV4cHJlc3Npb24gPSAoXG4gICAgY29sSWQ6IHN0cmluZyxcbiAgICBmaWx0ZXI6IFN1cHBvcnRlZEZpbHRlcixcbiAgICBxdWVyeTogU2VsZWN0UXVlcnlcbik6IEV4cHJOb2RlIHwgdW5kZWZpbmVkID0+IHtcbiAgICBpZiAoaXNDb21iaW5lZFNpbXBsZU1vZGVsKGZpbHRlcikpIHtcbiAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBmaWx0ZXIub3BlcmF0b3IgPT09ICdBTkQnID8gYW5kIDogb3I7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb25zID0gZmlsdGVyLmNvbmRpdGlvbnNcbiAgICAgICAgICAgID8ubWFwKChmOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyRXhwcmVzc2lvbihjb2xJZCwgZiBhcyBTdXBwb3J0ZWRGaWx0ZXIsIHF1ZXJ5KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKGUgPT4gZSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgICAgaWYgKGV4cHJlc3Npb25zICYmIGV4cHJlc3Npb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBvcGVyYXRvciguLi5leHByZXNzaW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVGV4dEZpbHRlcihmaWx0ZXIpKSB7XG4gICAgICAgIHJldHVybiBzaW1wbGVFeHByZXNzaW9uKGNvbElkLCBmaWx0ZXIudHlwZSwgZmlsdGVyLmZpbHRlciwgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGlzTnVtYmVyRmlsdGVyKGZpbHRlcikpIHtcbiAgICAgICAgcmV0dXJuIHNpbXBsZUV4cHJlc3Npb24oY29sSWQsIGZpbHRlci50eXBlLCBmaWx0ZXIuZmlsdGVyKTtcbiAgICB9IGVsc2UgaWYgKGlzTXVsdGlGaWx0ZXIoZmlsdGVyKSkge1xuICAgICAgICBjb25zdCBleHByID0gZmlsdGVyLmZpbHRlck1vZGVsc1xuICAgICAgICAgICAgPy5tYXAoKGY6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXJFeHByZXNzaW9uKGNvbElkLCBmLCBxdWVyeSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcihlID0+IGUgIT09IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChleHByICYmIGV4cHIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGFuZCguLi5leHByKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNEYXRlRmlsdGVyKGZpbHRlcikpIHtcbiAgICAgICAgcmV0dXJuIHNpbXBsZUV4cHJlc3Npb24oY29sSWQsIGZpbHRlci50eXBlLCBmaWx0ZXIuZGF0ZUZyb20sIGZpbHRlci5kYXRlVG8gfHwgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2UgaWYgKGlzU2V0RmlsdGVyKGZpbHRlcikpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdTZXQgZmlsdGVyIG5vdCBpbXBsZW1lbnRlZCcpO1xuICAgIH1cbn07XG5cbmV4cG9ydCBjb25zdCBzaW1wbGVFeHByZXNzaW9uID0gKFxuICAgIGNvbElkOiBzdHJpbmcsXG4gICAgdHlwZTpcbiAgICAgICAgfCAnZW1wdHknXG4gICAgICAgIHwgJ2VxdWFscydcbiAgICAgICAgfCAnbm90RXF1YWwnXG4gICAgICAgIHwgJ2xlc3NUaGFuJ1xuICAgICAgICB8ICdsZXNzVGhhbk9yRXF1YWwnXG4gICAgICAgIHwgJ2dyZWF0ZXJUaGFuJ1xuICAgICAgICB8ICdncmVhdGVyVGhhbk9yRXF1YWwnXG4gICAgICAgIHwgJ2luUmFuZ2UnXG4gICAgICAgIHwgJ2NvbnRhaW5zJ1xuICAgICAgICB8ICdub3RDb250YWlucydcbiAgICAgICAgfCAnc3RhcnRzV2l0aCdcbiAgICAgICAgfCAnZW5kc1dpdGgnXG4gICAgICAgIHwgJ2JsYW5rJ1xuICAgICAgICB8ICdub3RCbGFuaydcbiAgICAgICAgfCBudWxsXG4gICAgICAgIHwgdW5kZWZpbmVkLFxuICAgIGZpbHRlcjogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgICBmaWx0ZXJUbzogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbiAgICB0ZXh0Q29sdW1uOiBib29sZWFuID0gZmFsc2Vcbik6IEV4cHJOb2RlIHwgdW5kZWZpbmVkID0+IHtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnZXF1YWxzJzpcbiAgICAgICAgICAgIHJldHVybiBlcShjb2xJZCwgbGl0ZXJhbChmaWx0ZXIpKTtcbiAgICAgICAgY2FzZSAnbm90RXF1YWwnOlxuICAgICAgICAgICAgcmV0dXJuIG5lcShjb2xJZCwgbGl0ZXJhbChmaWx0ZXIpKTtcbiAgICAgICAgY2FzZSAnY29udGFpbnMnOlxuICAgICAgICAgICAgaWYgKHRleHRDb2x1bW4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3FsYCR7Y29sdW1uKGNvbElkKX0gSUxJS0UgJHtsaXRlcmFsKCclJyArIGZpbHRlciArICclJyl9YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRhaW5zKGNvbElkLCBTdHJpbmcoZmlsdGVyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIGNhc2UgJ25vdENvbnRhaW5zJzpcbiAgICAgICAgICAgIHJldHVybiBub3QoY29udGFpbnMoY29sSWQsIFN0cmluZyhmaWx0ZXIpKSk7XG4gICAgICAgIGNhc2UgJ2JsYW5rJzpcbiAgICAgICAgICAgIHJldHVybiBpc051bGwoY29sSWQpO1xuICAgICAgICBjYXNlICdub3RCbGFuayc6XG4gICAgICAgICAgICByZXR1cm4gbm90KGlzTnVsbChjb2xJZCkpO1xuICAgICAgICBjYXNlICdzdGFydHNXaXRoJzpcbiAgICAgICAgICAgIHJldHVybiBwcmVmaXgoY29sSWQsIFN0cmluZyhmaWx0ZXIpKTtcbiAgICAgICAgY2FzZSAnZW5kc1dpdGgnOlxuICAgICAgICAgICAgcmV0dXJuIHN1ZmZpeChjb2xJZCwgU3RyaW5nKGZpbHRlcikpO1xuICAgICAgICBjYXNlICdncmVhdGVyVGhhbic6XG4gICAgICAgICAgICByZXR1cm4gZ3QoY29sSWQsIGxpdGVyYWwoZmlsdGVyKSk7XG4gICAgICAgIGNhc2UgJ2xlc3NUaGFuJzpcbiAgICAgICAgICAgIHJldHVybiBsdChjb2xJZCwgbGl0ZXJhbChmaWx0ZXIpKTtcbiAgICAgICAgY2FzZSAnZ3JlYXRlclRoYW5PckVxdWFsJzpcbiAgICAgICAgICAgIHJldHVybiBndGUoY29sSWQsIGxpdGVyYWwoZmlsdGVyKSk7XG4gICAgICAgIGNhc2UgJ2xlc3NUaGFuT3JFcXVhbCc6XG4gICAgICAgICAgICByZXR1cm4gbHRlKGNvbElkLCBsaXRlcmFsKGZpbHRlcikpO1xuICAgICAgICBjYXNlICdpblJhbmdlJzpcbiAgICAgICAgICAgIGlmIChmaWx0ZXJUbyAhPT0gdW5kZWZpbmVkICYmIGZpbHRlclRvICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChndGUoY29sSWQsIGxpdGVyYWwoZmlsdGVyKSksIGx0ZShjb2xJZCwgbGl0ZXJhbChmaWx0ZXJUbykpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29uc29sZS53YXJuKGBVbnN1cHBvcnRlZCBmaWx0ZXIgdHlwZTogJHt0eXBlfWApO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuY29uc3QgYWdncmVnYXRlRXhwcmVzc2lvbiA9IChcbiAgICBjOiBSZXNvbHZlZEFnZ3JlZ2F0ZUNvbHVtblxuKTogW2FsaWFzOiBzdHJpbmcsIGFnZ3JlZ2F0ZTogQWdncmVnYXRlTm9kZV0gPT4ge1xuICAgIGNvbnN0IGFnZ0V4cHIgPSBjLmFnZ19leHByO1xuXG4gICAgY29uc3QgZmlyc3RBcmcgPSAoKSA9PiB7XG4gICAgICAgIGlmIChjLmFnZ19leHByX2FyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGMuYWdnX2V4cHJfYXJnc1swXTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFnZ3JlZ2F0ZSBleHByZXNzaW9uICR7YWdnRXhwcn0gcmVxdWlyZXMgYXQgbGVhc3Qgb25lIGFyZ3VtZW50YCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNlY29uZEFyZyA9ICgpID0+IHtcbiAgICAgICAgaWYgKGMuYWdnX2V4cHJfYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gYy5hZ2dfZXhwcl9hcmdzWzFdO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQWdncmVnYXRlIGV4cHJlc3Npb24gJHthZ2dFeHByfSByZXF1aXJlcyBhdCBsZWFzdCB0d28gYXJndW1lbnRzYCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHIgPSAodmFsOiBBZ2dyZWdhdGVOb2RlKTogW2FsaWFzOiBzdHJpbmcsIGFnZ3JlZ2F0ZTogQWdncmVnYXRlTm9kZV0gPT4ge1xuICAgICAgICByZXR1cm4gW2MuY29sdW1uX25hbWUsIHZhbF07XG4gICAgfTtcblxuICAgIHN3aXRjaCAoYWdnRXhwcikge1xuICAgICAgICBjYXNlICdjb3VudCc6XG4gICAgICAgICAgICByZXR1cm4gcihjb3VudChmaXJzdEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ3N1bSc6XG4gICAgICAgICAgICByZXR1cm4gcihzdW0oZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdhdmcnOlxuICAgICAgICAgICAgcmV0dXJuIHIoYXZnKGZpcnN0QXJnKCkpKTtcbiAgICAgICAgY2FzZSAnYXJnbWF4JzpcbiAgICAgICAgICAgIHJldHVybiByKGFyZ21heChmaXJzdEFyZygpLCBzZWNvbmRBcmcoKSkpO1xuICAgICAgICBjYXNlICdtYWQnOlxuICAgICAgICAgICAgcmV0dXJuIHIobWFkKGZpcnN0QXJnKCkpKTtcbiAgICAgICAgY2FzZSAnbWF4JzpcbiAgICAgICAgICAgIHJldHVybiByKG1heChmaXJzdEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ21pbic6XG4gICAgICAgICAgICByZXR1cm4gcihtaW4oZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdwcm9kdWN0JzpcbiAgICAgICAgICAgIHJldHVybiByKHByb2R1Y3QoZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdnZW9tZWFuJzpcbiAgICAgICAgICAgIHJldHVybiByKGdlb21lYW4oZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdtZWRpYW4nOlxuICAgICAgICAgICAgcmV0dXJuIHIobWVkaWFuKGZpcnN0QXJnKCkpKTtcbiAgICAgICAgY2FzZSAnbW9kZSc6XG4gICAgICAgICAgICByZXR1cm4gcihtb2RlKGZpcnN0QXJnKCkpKTtcbiAgICAgICAgY2FzZSAndmFyaWFuY2UnOlxuICAgICAgICAgICAgcmV0dXJuIHIodmFyaWFuY2UoZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdzdGRkZXYnOlxuICAgICAgICAgICAgcmV0dXJuIHIoc3RkZGV2KGZpcnN0QXJnKCkpKTtcbiAgICAgICAgY2FzZSAnc2tld25lc3MnOlxuICAgICAgICAgICAgcmV0dXJuIHIoc2tld25lc3MoZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdrdXJ0b3Npcyc6XG4gICAgICAgICAgICByZXR1cm4gcihrdXJ0b3NpcyhmaXJzdEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ2VudHJvcHknOlxuICAgICAgICAgICAgcmV0dXJuIHIoZW50cm9weShmaXJzdEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ3ZhclBvcCc6XG4gICAgICAgICAgICByZXR1cm4gcih2YXJQb3AoZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdzdGRkZXZQb3AnOlxuICAgICAgICAgICAgcmV0dXJuIHIoc3RkZGV2UG9wKGZpcnN0QXJnKCkpKTtcbiAgICAgICAgY2FzZSAnZmlyc3QnOlxuICAgICAgICAgICAgcmV0dXJuIHIoZmlyc3QoZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdsYXN0JzpcbiAgICAgICAgICAgIHJldHVybiByKGxhc3QoZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdzdHJpbmdBZ2cnOlxuICAgICAgICAgICAgcmV0dXJuIHIoc3RyaW5nQWdnKGZpcnN0QXJnKCkpKTtcbiAgICAgICAgY2FzZSAnYXJyYXlBZ2cnOlxuICAgICAgICAgICAgcmV0dXJuIHIoYXJyYXlBZ2coZmlyc3RBcmcoKSkpO1xuICAgICAgICBjYXNlICdhcmdtaW4nOlxuICAgICAgICAgICAgcmV0dXJuIHIoYXJnbWluKGZpcnN0QXJnKCksIHNlY29uZEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ3F1YW50aWxlJzpcbiAgICAgICAgICAgIHJldHVybiByKHF1YW50aWxlKGZpcnN0QXJnKCksIHNlY29uZEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ2NvcnInOlxuICAgICAgICAgICAgcmV0dXJuIHIoY29ycihmaXJzdEFyZygpLCBzZWNvbmRBcmcoKSkpO1xuICAgICAgICBjYXNlICdjb3ZhclBvcCc6XG4gICAgICAgICAgICByZXR1cm4gcihjb3ZhclBvcChmaXJzdEFyZygpLCBzZWNvbmRBcmcoKSkpO1xuICAgICAgICBjYXNlICdyZWdySW50ZXJjZXB0JzpcbiAgICAgICAgICAgIHJldHVybiByKHJlZ3JJbnRlcmNlcHQoZmlyc3RBcmcoKSwgc2Vjb25kQXJnKCkpKTtcbiAgICAgICAgY2FzZSAncmVnclNsb3BlJzpcbiAgICAgICAgICAgIHJldHVybiByKHJlZ3JTbG9wZShmaXJzdEFyZygpLCBzZWNvbmRBcmcoKSkpO1xuICAgICAgICBjYXNlICdyZWdyQ291bnQnOlxuICAgICAgICAgICAgcmV0dXJuIHIocmVnckNvdW50KGZpcnN0QXJnKCksIHNlY29uZEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ3JlZ3JSMic6XG4gICAgICAgICAgICByZXR1cm4gcihyZWdyUjIoZmlyc3RBcmcoKSwgc2Vjb25kQXJnKCkpKTtcbiAgICAgICAgY2FzZSAncmVnclNYWCc6XG4gICAgICAgICAgICByZXR1cm4gcihyZWdyU1hYKGZpcnN0QXJnKCksIHNlY29uZEFyZygpKSk7XG4gICAgICAgIGNhc2UgJ3JlZ3JTWVknOlxuICAgICAgICAgICAgcmV0dXJuIHIocmVnclNZWShmaXJzdEFyZygpLCBzZWNvbmRBcmcoKSkpO1xuICAgICAgICBjYXNlICdyZWdyU1hZJzpcbiAgICAgICAgICAgIHJldHVybiByKHJlZ3JTWFkoZmlyc3RBcmcoKSwgc2Vjb25kQXJnKCkpKTtcbiAgICAgICAgY2FzZSAncmVnckF2Z1gnOlxuICAgICAgICAgICAgcmV0dXJuIHIocmVnckF2Z1goZmlyc3RBcmcoKSwgc2Vjb25kQXJnKCkpKTtcbiAgICAgICAgY2FzZSAncmVnckF2Z1knOlxuICAgICAgICAgICAgcmV0dXJuIHIocmVnckF2Z1koZmlyc3RBcmcoKSwgc2Vjb25kQXJnKCkpKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgYWdncmVnYXRlIGV4cHJlc3Npb246ICR7YWdnRXhwcn0uYCk7XG4gICAgfVxufTtcblxuY29uc3QgaXNDb21iaW5lZFNpbXBsZU1vZGVsID0gKFxuICAgIGZpbHRlcjogYW55XG4pOiBmaWx0ZXIgaXMgSUNvbWJpbmVkU2ltcGxlTW9kZWw8VGV4dEZpbHRlck1vZGVsIHwgTnVtYmVyRmlsdGVyTW9kZWw+ID0+IHtcbiAgICByZXR1cm4gKFxuICAgICAgICB0eXBlb2YgZmlsdGVyID09PSAnb2JqZWN0JyAmJlxuICAgICAgICBmaWx0ZXIgIT09IG51bGwgJiZcbiAgICAgICAgJ29wZXJhdG9yJyBpbiBmaWx0ZXIgJiZcbiAgICAgICAgJ2NvbmRpdGlvbnMnIGluIGZpbHRlciAmJlxuICAgICAgICAoZmlsdGVyLm9wZXJhdG9yID09PSAnQU5EJyB8fCBmaWx0ZXIub3BlcmF0b3IgPT09ICdPUicpICYmXG4gICAgICAgIHR5cGVvZiBmaWx0ZXIuY29uZGl0aW9ucyA9PT0gJ29iamVjdCdcbiAgICApO1xufTtcblxuY29uc3QgaXNUZXh0RmlsdGVyID0gKGZpbHRlcjogYW55KTogZmlsdGVyIGlzIFRleHRGaWx0ZXJNb2RlbCA9PiB7XG4gICAgcmV0dXJuIGZpbHRlcj8uZmlsdGVyVHlwZSA9PT0gJ3RleHQnO1xufTtcblxuY29uc3QgaXNOdW1iZXJGaWx0ZXIgPSAoZmlsdGVyOiBhbnkpOiBmaWx0ZXIgaXMgTnVtYmVyRmlsdGVyTW9kZWwgPT4ge1xuICAgIHJldHVybiBmaWx0ZXI/LmZpbHRlclR5cGUgPT09ICdudW1iZXInO1xufTtcblxuY29uc3QgaXNEYXRlRmlsdGVyID0gKGZpbHRlcjogYW55KTogZmlsdGVyIGlzIERhdGVGaWx0ZXJNb2RlbCA9PiB7XG4gICAgcmV0dXJuIGZpbHRlcj8uZmlsdGVyVHlwZSA9PT0gJ2RhdGUnIHx8IGZpbHRlcj8uZmlsdGVyVHlwZSA9PT0gJ2RhdGVTdHJpbmcnO1xufTtcblxuY29uc3QgaXNNdWx0aUZpbHRlciA9IChmaWx0ZXI6IGFueSk6IGZpbHRlciBpcyBJTXVsdGlGaWx0ZXJNb2RlbCA9PiB7XG4gICAgcmV0dXJuIGZpbHRlcj8uZmlsdGVyVHlwZSA9PT0gJ211bHRpJyAmJiAnZmlsdGVyTW9kZWxzJyBpbiBmaWx0ZXI7XG59O1xuXG5jb25zdCBpc1NldEZpbHRlciA9IChmaWx0ZXI6IGFueSk6IGZpbHRlciBpcyBTZXRGaWx0ZXJNb2RlbCA9PiB7XG4gICAgcmV0dXJuIGZpbHRlcj8uZmlsdGVyVHlwZSA9PT0gJ3NldCc7XG59O1xuIiwgImltcG9ydCB7XG4gICAgY2xhdXNlTWF0Y2gsXG4gICAgaXNQYXJhbSxcbiAgICBpc1NlbGVjdGlvbixcbiAgICBTZWxlY3Rpb25DbGF1c2UsXG59IGZyb20gJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQHV3ZGF0YS9tb3NhaWMtY29yZUAwLjE2LjIvK2VzbSc7XG5pbXBvcnQgeyBGaWx0ZXJFeHByLCBRdWVyeSB9IGZyb20gJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQHV3ZGF0YS9tb3NhaWMtc3FsQDAuMTYuMi8rZXNtJztcbmltcG9ydCB7IElucHV0LCBJbnB1dE9wdGlvbnMgfSBmcm9tICcuL2lucHV0JztcbmltcG9ydCB7IHNldHVwQWN0aXZhdGlvbkxpc3RlbmVycyB9IGZyb20gJy4vdXRpbCc7XG5pbXBvcnQgeyBnZW5lcmF0ZUlkIH0gZnJvbSAnLi4vdXRpbC9pZCc7XG5pbXBvcnQgeyBrSW5wdXRTZWFyY2gsIGtTaWRlYmFyRnVsbHdpZHRoIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VhcmNoT3B0aW9ucyBleHRlbmRzIElucHV0T3B0aW9ucyB7XG4gICAgZnJvbTogc3RyaW5nO1xuICAgIHR5cGU6ICdjb250YWlucycgfCAncHJlZml4JyB8ICdzdWZmaXgnIHwgJ3JlZ2V4cCc7XG4gICAgY29sdW1uOiBzdHJpbmc7XG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgcGxhY2Vob2xkZXI/OiBzdHJpbmc7XG4gICAgZmllbGQ/OiBzdHJpbmc7XG4gICAgd2lkdGg/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBTZWFyY2ggZXh0ZW5kcyBJbnB1dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBpbnB1dF86IEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBpZF86IHN0cmluZyA9IGdlbmVyYXRlSWQoKTtcbiAgICBwcml2YXRlIGRhdGFfOiBBcnJheTx7IGxpc3Q6IHN0cmluZyB9PiA9IFtdO1xuICAgIHByaXZhdGUgZGF0YWxpc3RfPzogSFRNTERhdGFMaXN0RWxlbWVudDtcblxuICAgIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkb25seSBvcHRpb25zXzogU2VhcmNoT3B0aW9ucykge1xuICAgICAgICBzdXBlcihvcHRpb25zXy5maWx0ZXJCeSk7XG5cbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoa1NpZGViYXJGdWxsd2lkdGgpO1xuXG4gICAgICAgIGlmIChvcHRpb25zXy5sYWJlbCkge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRMYWJlbCA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuICAgICAgICAgICAgaW5wdXRMYWJlbC5zZXRBdHRyaWJ1dGUoJ2ZvcicsIHRoaXMuaWRfKTtcbiAgICAgICAgICAgIGlucHV0TGFiZWwuaW5uZXJUZXh0ID0gb3B0aW9uc18ubGFiZWw7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoaW5wdXRMYWJlbCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZWFyY2ggYm94XG4gICAgICAgIHRoaXMuaW5wdXRfID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgIHRoaXMuaW5wdXRfLmF1dG9jb21wbGV0ZSA9ICdvZmYnO1xuICAgICAgICB0aGlzLmlucHV0Xy5jbGFzc0xpc3QuYWRkKGtJbnB1dFNlYXJjaCk7XG4gICAgICAgIHRoaXMuaW5wdXRfLmlkID0gdGhpcy5pZF87XG4gICAgICAgIHRoaXMuaW5wdXRfLnR5cGUgPSAndGV4dCc7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnNfLnBsYWNlaG9sZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmlucHV0Xy5zZXRBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJywgdGhpcy5vcHRpb25zXy5wbGFjZWhvbGRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMub3B0aW9uc18ud2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRfLnN0eWxlLndpZHRoID0gYCR7b3B0aW9uc18ud2lkdGh9cHhgO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmlucHV0Xyk7XG5cbiAgICAgICAgLy8gdHJhY2sgY2hhbmdlcyB0byBzZWFyY2ggYm94XG4gICAgICAgIHRoaXMuaW5wdXRfLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKHRoaXMuaW5wdXRfLnZhbHVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gdHJhY2sgY2hhbmdlcyB0byBwYXJhbVxuICAgICAgICBpZiAoIWlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3ZhbHVlJywgdmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdGhpcy5pbnB1dF8udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dF8udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldHVwQWN0aXZhdGlvbkxpc3RlbmVycyh0aGlzLCB0aGlzLmlucHV0Xyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy5pbnB1dF8udmFsdWUgPSAnJztcbiAgICB9XG5cbiAgICBjbGF1c2UodmFsdWU/OiBzdHJpbmcpOiBTZWxlY3Rpb25DbGF1c2Uge1xuICAgICAgICBjb25zdCBmaWVsZCA9IHRoaXMub3B0aW9uc18uZmllbGQgfHwgdGhpcy5vcHRpb25zXy5jb2x1bW47XG4gICAgICAgIHJldHVybiBjbGF1c2VNYXRjaChmaWVsZCwgdmFsdWUsIHsgc291cmNlOiB0aGlzLCBtZXRob2Q6IHRoaXMub3B0aW9uc18udHlwZSB9KTtcbiAgICB9XG5cbiAgICBhY3RpdmF0ZSgpIHtcbiAgICAgICAgaWYgKGlzU2VsZWN0aW9uKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLmFjdGl2YXRlKHRoaXMuY2xhdXNlKCcnKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaXNoKHZhbHVlPzogc3RyaW5nKSB7XG4gICAgICAgIGlmIChpc1NlbGVjdGlvbih0aGlzLm9wdGlvbnNfLmFzKSkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zXy5hcy51cGRhdGUodGhpcy5jbGF1c2UodmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1BhcmFtKHRoaXMub3B0aW9uc18uYXMpKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNfLmFzLnVwZGF0ZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBxdWVyeShmaWx0ZXI6IEZpbHRlckV4cHJbXSA9IFtdKSB7XG4gICAgICAgIHJldHVybiBRdWVyeS5mcm9tKHRoaXMub3B0aW9uc18uZnJvbSlcbiAgICAgICAgICAgIC5zZWxlY3QoeyBsaXN0OiB0aGlzLm9wdGlvbnNfLmNvbHVtbiB9KVxuICAgICAgICAgICAgLmRpc3RpbmN0KClcbiAgICAgICAgICAgIC53aGVyZSguLi5maWx0ZXIpO1xuICAgIH1cblxuICAgIHF1ZXJ5UmVzdWx0KGRhdGE6IGFueSk6IHRoaXMge1xuICAgICAgICB0aGlzLmRhdGFfID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHRoaXMge1xuICAgICAgICBjb25zdCBsaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGF0YWxpc3QnKTtcbiAgICAgICAgY29uc3QgaWQgPSBgJHt0aGlzLmlkX31fbGlzdGA7XG4gICAgICAgIGxpc3Quc2V0QXR0cmlidXRlKCdpZCcsIGlkKTtcbiAgICAgICAgZm9yIChjb25zdCBkIG9mIHRoaXMuZGF0YV8pIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuICAgICAgICAgICAgb3B0LnNldEF0dHJpYnV0ZSgndmFsdWUnLCBkLmxpc3QpO1xuICAgICAgICAgICAgbGlzdC5hcHBlbmQob3B0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5kYXRhbGlzdF8pIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YWxpc3RfLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCgodGhpcy5kYXRhbGlzdF8gPSBsaXN0KSk7XG4gICAgICAgIHRoaXMuaW5wdXRfLnNldEF0dHJpYnV0ZSgnbGlzdCcsIGlkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuIiwgImltcG9ydCB7IFJhZGlvR3JvdXAgfSBmcm9tICcuL3JhZGlvX2dyb3VwJztcbmltcG9ydCB7IFNlbGVjdCB9IGZyb20gJy4vc2VsZWN0JztcbmltcG9ydCB7IGlucHV0LCBJbnB1dEZ1bmN0aW9uIH0gZnJvbSAnLi9pbnB1dCc7XG5pbXBvcnQgeyBDaGVja2JveEdyb3VwIH0gZnJvbSAnLi9jaGVja2JveF9ncm91cCc7XG5pbXBvcnQgeyBDaGVja2JveCB9IGZyb20gJy4vY2hlY2tib3gnO1xuaW1wb3J0IHsgU2xpZGVyIH0gZnJvbSAnLi9zbGlkZXInO1xuaW1wb3J0IHsgVGFibGUgfSBmcm9tICcuL3RhYmxlJztcbmltcG9ydCB7IFNlYXJjaCB9IGZyb20gJy4vc2VhcmNoJztcblxuZXhwb3J0IGNvbnN0IElOUFVUUzogUmVjb3JkPHN0cmluZywgSW5wdXRGdW5jdGlvbj4gPSB7XG4gICAgc2VsZWN0OiBvcHRpb25zID0+IGlucHV0KFNlbGVjdCwgb3B0aW9ucyksXG4gICAgc2xpZGVyOiBvcHRpb25zID0+IGlucHV0KFNsaWRlciwgb3B0aW9ucyksXG4gICAgc2VhcmNoOiBvcHRpb25zID0+IGlucHV0KFNlYXJjaCwgb3B0aW9ucyksXG4gICAgY2hlY2tib3g6IG9wdGlvbnMgPT4gaW5wdXQoQ2hlY2tib3gsIG9wdGlvbnMpLFxuICAgIHJhZGlvX2dyb3VwOiBvcHRpb25zID0+IGlucHV0KFJhZGlvR3JvdXAsIG9wdGlvbnMpLFxuICAgIGNoZWNrYm94X2dyb3VwOiBvcHRpb25zID0+IGlucHV0KENoZWNrYm94R3JvdXAsIG9wdGlvbnMpLFxuICAgIHRhYmxlOiBvcHRpb25zID0+IGlucHV0KFRhYmxlLCBvcHRpb25zKSxcbn07XG4iLCAiaW1wb3J0IHtcbiAgICBnZXRKc0RlbGl2ckJ1bmRsZXMsXG4gICAgc2VsZWN0QnVuZGxlLFxuICAgIEFzeW5jRHVja0RCLFxuICAgIENvbnNvbGVMb2dnZXIsXG4gICAgQXN5bmNEdWNrREJDb25uZWN0aW9uLFxuICAgIExvZ0xldmVsLFxufSBmcm9tICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0BkdWNrZGIvZHVja2RiLXdhc21AMS4yOS4wLytlc20nO1xuaW1wb3J0IHsgc2xlZXAgfSBmcm9tICcuLi91dGlsL2FzeW5jJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXREdWNrZGIoKSB7XG4gICAgY29uc3QgSlNERUxJVlJfQlVORExFUyA9IGdldEpzRGVsaXZyQnVuZGxlcygpO1xuXG4gICAgLy8gU2VsZWN0IGEgYnVuZGxlIGJhc2VkIG9uIGJyb3dzZXIgY2hlY2tzXG4gICAgY29uc3QgYnVuZGxlID0gYXdhaXQgc2VsZWN0QnVuZGxlKEpTREVMSVZSX0JVTkRMRVMpO1xuXG4gICAgY29uc3Qgd29ya2VyX3VybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoXG4gICAgICAgIG5ldyBCbG9iKFtgaW1wb3J0U2NyaXB0cyhcIiR7YnVuZGxlLm1haW5Xb3JrZXIhfVwiKTtgXSwge1xuICAgICAgICAgICAgdHlwZTogJ3RleHQvamF2YXNjcmlwdCcsXG4gICAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEluc3RhbnRpYXRlIHRoZSBhc3luY2hyb25vdXMgdmVyc2lvbiBvZiBEdWNrREItd2FzbVxuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIod29ya2VyX3VybCk7XG4gICAgY29uc3QgbG9nZ2VyID0gbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWwuV0FSTklORyk7XG4gICAgY29uc3QgZGIgPSBuZXcgQXN5bmNEdWNrREIobG9nZ2VyLCB3b3JrZXIpO1xuICAgIGF3YWl0IGRiLmluc3RhbnRpYXRlKGJ1bmRsZS5tYWluTW9kdWxlLCBidW5kbGUucHRocmVhZFdvcmtlcik7XG4gICAgVVJMLnJldm9rZU9iamVjdFVSTCh3b3JrZXJfdXJsKTtcblxuICAgIHJldHVybiB7IGRiLCB3b3JrZXIgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JUYWJsZShcbiAgICBjb25uOiBBc3luY0R1Y2tEQkNvbm5lY3Rpb24sXG4gICAgdGFibGU6IHN0cmluZyxcbiAgICB7IGludGVydmFsID0gMjUwIH0gPSB7fVxuKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGNvbm4ucXVlcnkoXG4gICAgICAgICAgICAgICAgYFNFTEVDVCAxXG4gICAgICAgICAgIEZST00gaW5mb3JtYXRpb25fc2NoZW1hLnRhYmxlc1xuICAgICAgICAgV0hFUkUgdGFibGVfc2NoZW1hID0gJ21haW4nXG4gICAgICAgICAgIEFORCB0YWJsZV9uYW1lICAgPSAnJHt0YWJsZX0nXG4gICAgICAgICBMSU1JVCAxYFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHJlcy5udW1Sb3dzKSByZXR1cm47IC8vIHN1Y2Nlc3MgXHUyNzI4XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgYFRhYmxlICR7dGFibGV9IG5vdCB5ZXQgYXZhaWxhYmxlLCB0cnlpbmcgYWdhaW4gaW4gJHtpbnRlcnZhbH1tcyAoZXJyb3I6ICR7ZXJyfSlgXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgc2xlZXAoaW50ZXJ2YWwpO1xuICAgIH1cbn1cbiIsICJleHBvcnQgZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcbn1cbiIsICJpbXBvcnQgeyBWaXpDb250ZXh0IH0gZnJvbSAnLi4vY29udGV4dCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0aWFsaXplRXJyb3JIYW5kbGluZyhjdHg6IFZpekNvbnRleHQsIHdvcmtlcjogV29ya2VyKTogdm9pZCB7XG4gICAgLy8gdW5oYW5kbGVkIGV4Y2VwdGlvbnNcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBldmVudCA9PiB7XG4gICAgICAgIGN0eC5yZWNvcmRVbmhhbmRsZWRFcnJvcihlcnJvckluZm8oZXZlbnQuZXJyb3IpKTtcbiAgICB9KTtcblxuICAgIC8vIHVuaGFuZGxlZCBwcm9taXNlIHJlamVjdGlvbnNcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndW5oYW5kbGVkcmVqZWN0aW9uJywgZXZlbnQgPT4ge1xuICAgICAgICBjdHgucmVjb3JkVW5oYW5kbGVkRXJyb3IoZXJyb3JJbmZvKGV2ZW50LnJlYXNvbikpO1xuICAgIH0pO1xuXG4gICAgLy8gd2ViIHdvcmtlciBlcnJvcnNcbiAgICB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGV2ZW50ID0+IHtcbiAgICAgICAgaWYgKGV2ZW50LmRhdGEudHlwZSA9PT0gJ0VSUk9SJykge1xuICAgICAgICAgICAgY3R4LnJlY29yZFVuaGFuZGxlZEVycm9yKGVycm9ySW5mbyhldmVudC5kYXRhLmRhdGEubWVzc2FnZSkpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JJbmZvIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICAgIHN0YWNrOiBzdHJpbmc7XG4gICAgY29kZTogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbDtcbiAgICBvcmlnaW5hbFZhbHVlPzogdW5rbm93bjtcbiAgICBba2V5OiBzdHJpbmddOiB1bmtub3duOyAvLyBBbGxvdyBhZGRpdGlvbmFsIHByb3BlcnRpZXNcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVycm9ySW5mbyhlcnJvcjogdW5rbm93bik6IEVycm9ySW5mbyB7XG4gICAgaWYgKGlzRXJyb3IoZXJyb3IpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBlcnJvci5uYW1lIHx8ICdFcnJvcicsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdBbiB1bmtub3duIGVycm9yIG9jY3VycmVkJyxcbiAgICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayB8fCAnJyxcbiAgICAgICAgICAgIGNvZGU6IChlcnJvciBhcyBhbnkpLmNvZGUgfHwgbnVsbCxcbiAgICAgICAgICAgIC4uLihlcnJvciBhcyBhbnkpLCAvLyBJbmNsdWRlIGFueSBjdXN0b20gcHJvcGVydGllc1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9yID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogJ0Vycm9yJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLFxuICAgICAgICAgICAgc3RhY2s6IG5ldyBFcnJvcigpLnN0YWNrIHx8ICcnLFxuICAgICAgICAgICAgY29kZTogbnVsbCxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGb3Igbm9uLWVycm9yIG9iamVjdHNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6ICdVbmtub3duIEVycm9yJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KGVycm9yLCBudWxsLCAyKSxcbiAgICAgICAgICAgIHN0YWNrOiBuZXcgRXJyb3IoKS5zdGFjayB8fCAnJyxcbiAgICAgICAgICAgIGNvZGU6IG51bGwsXG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiBlcnJvcixcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvckFzSFRNTChlcnJvcjogRXJyb3JJbmZvKTogc3RyaW5nIHtcbiAgICBjb25zdCBjb2xvcnMgPSB7XG4gICAgICAgIGJnOiAnI2ZmZmZmZicsXG4gICAgICAgIGJvcmRlcjogJyNkYzM1NDUnLFxuICAgICAgICB0aXRsZTogJyNkYzM1NDUnLFxuICAgICAgICB0ZXh0OiAnIzIxMjUyOScsXG4gICAgICAgIHN1YnRleHQ6ICcjNmM3NTdkJyxcbiAgICAgICAgY29kZUJnOiAnI2Y4ZjlmYScsXG4gICAgICAgIGxpbms6ICcjMDA3YmZmJyxcbiAgICB9O1xuXG4gICAgLy8gUGFyc2Ugc3RhY2sgdHJhY2VcbiAgICBjb25zdCBzdGFja0xpbmVzID0gcGFyc2VTdGFja1RyYWNlKGVycm9yLnN0YWNrKTtcblxuICAgIC8vIEJ1aWxkIEhUTUxcbiAgICBsZXQgaHRtbCA9IGBcbiAgICA8ZGl2IHN0eWxlPVwiXG4gICAgICBiYWNrZ3JvdW5kOiAke2NvbG9ycy5iZ307XG4gICAgICBib3JkZXI6IDJweCBzb2xpZCAke2NvbG9ycy5ib3JkZXJ9O1xuICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgICAgcGFkZGluZzogMjBweDtcbiAgICAgIGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgbW9ub3NwYWNlO1xuICAgICAgY29sb3I6ICR7Y29sb3JzLnRleHR9O1xuICAgICAgbWFyZ2luOiAxMHB4IDA7XG4gICAgICBib3gtc2hhZG93OiAwIDRweCA2cHggcmdiYSgwLDAsMCwwLjEpO1xuICAgICAgd2lkdGg6IDEwMCU7XG4gICAgXCI+XG4gICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgbWFyZ2luLWJvdHRvbTogMTVweDtcIj5cbiAgICAgICAgPHN2ZyB3aWR0aD1cIjI0XCIgaGVpZ2h0PVwiMjRcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHlsZT1cIm1hcmdpbi1yaWdodDogMTBweDtcIj5cbiAgICAgICAgICA8Y2lyY2xlIGN4PVwiMTJcIiBjeT1cIjEyXCIgcj1cIjEwXCIgc3Ryb2tlPVwiJHtjb2xvcnMudGl0bGV9XCIgc3Ryb2tlLXdpZHRoPVwiMlwiIGZpbGw9XCJub25lXCIvPlxuICAgICAgICAgIDxwYXRoIGQ9XCJNMTIgOHY1bTAgNGguMDFcIiBzdHJva2U9XCIke2NvbG9ycy50aXRsZX1cIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgICAgPGgzIHN0eWxlPVwibWFyZ2luOiAwOyBjb2xvcjogJHtjb2xvcnMudGl0bGV9OyBmb250LXNpemU6IDIwcHg7IGZvbnQtd2VpZ2h0OiA2MDA7XCI+XG4gICAgICAgICAgJHtlc2NhcGVIdG1sKGVycm9yLm5hbWUpfVxuICAgICAgICA8L2gzPlxuICAgICAgPC9kaXY+XG4gICAgICBcbiAgICAgIDxkaXYgc3R5bGU9XCJcbiAgICAgICAgYmFja2dyb3VuZDogJHtjb2xvcnMuY29kZUJnfTtcbiAgICAgICAgcGFkZGluZzogMTVweDtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogNnB4O1xuICAgICAgICBtYXJnaW4tYm90dG9tOiAxNXB4O1xuICAgICAgICBib3JkZXItbGVmdDogNHB4IHNvbGlkICR7Y29sb3JzLmJvcmRlcn07XG4gICAgICBcIj5cbiAgICAgICAgPHAgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMTNweDsgbGluZS1oZWlnaHQ6IDEuNTsgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTsgd2hpdGUtc3BhY2U6IHByZS13cmFwO1wiPiR7ZXNjYXBlSHRtbChlcnJvci5tZXNzYWdlKX08L3A+XG4gICAgICA8L2Rpdj5gO1xuXG4gICAgaWYgKGVycm9yLmNvZGUgIT09IG51bGwpIHtcbiAgICAgICAgaHRtbCArPSBgXG4gICAgICA8ZGl2IHN0eWxlPVwibWFyZ2luLWJvdHRvbTogMTBweDtcIj5cbiAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtjb2xvcnMuc3VidGV4dH07IGZvbnQtc2l6ZTogMTQzeDtcIj5FcnJvciBDb2RlOjwvc3Bhbj5cbiAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtjb2xvcnMudGV4dH07IGZvbnQtd2VpZ2h0OiA1MDA7IG1hcmdpbi1sZWZ0OiA4cHg7XCI+XG4gICAgICAgICAgJHtlc2NhcGVIdG1sKFN0cmluZyhlcnJvci5jb2RlKSl9XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvZGl2PmA7XG4gICAgfVxuXG4gICAgaWYgKHN0YWNrTGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBodG1sICs9IGBcbiAgICAgIDxkZXRhaWxzIHN0eWxlPVwibWFyZ2luLXRvcDogMTVweDtcIj5cbiAgICAgICAgPHN1bW1hcnkgc3R5bGU9XCJcbiAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICAgICAgY29sb3I6ICR7Y29sb3JzLnN1YnRleHR9O1xuICAgICAgICAgIGZvbnQtc2l6ZTogMTNweDtcbiAgICAgICAgICBmb250LXdlaWdodDogNTAwO1xuICAgICAgICAgIG91dGxpbmU6IG5vbmU7XG4gICAgICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XG4gICAgICAgIFwiPlxuICAgICAgICAgIFN0YWNrIFRyYWNlICgke3N0YWNrTGluZXMubGVuZ3RofSBmcmFtZXMpXG4gICAgICAgIDwvc3VtbWFyeT5cbiAgICAgICAgPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7IGZvbnQtc2l6ZTogMTNweDsgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTtcIj5gO1xuXG4gICAgICAgIHN0YWNrTGluZXMuZm9yRWFjaCgobGluZSwgaSkgPT4ge1xuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgIDxkaXYgc3R5bGU9XCJcbiAgICAgICAgICBiYWNrZ3JvdW5kOiAke2kgJSAyID09PSAwID8gY29sb3JzLmNvZGVCZyA6ICd0cmFuc3BhcmVudCd9O1xuICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcbiAgICAgICAgICBtYXJnaW46IDJweCAwO1xuICAgICAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgICAgXCI+XG4gICAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtjb2xvcnMuc3VidGV4dH07IG1pbi13aWR0aDogMjRweDtcIj4ke2kgKyAxfS48L3NwYW4+XG4gICAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtjb2xvcnMubGlua307IG1hcmdpbi1sZWZ0OiA4cHg7XCI+XG4gICAgICAgICAgICAke2VzY2FwZUh0bWwobGluZSl9XG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICA8L2Rpdj5gO1xuICAgICAgICB9KTtcblxuICAgICAgICBodG1sICs9IGBcbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2RldGFpbHM+YDtcbiAgICB9XG5cbiAgICBodG1sICs9IGA8L2Rpdj5gO1xuXG4gICAgcmV0dXJuIGh0bWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwbGF5UmVuZGVyRXJyb3IoZXJyb3I6IEVycm9ySW5mbywgcmVuZGVyRWw6IEhUTUxFbGVtZW50KSB7XG4gICAgcmVuZGVyRWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICcnKTtcbiAgICByZW5kZXJFbC5pbm5lckhUTUwgPSBlcnJvckFzSFRNTChlcnJvcik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU3RhY2tUcmFjZShzdGFjazogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGlmICghc3RhY2spIHJldHVybiBbXTtcblxuICAgIGNvbnN0IGxpbmVzID0gc3RhY2suc3BsaXQoJ1xcbicpO1xuICAgIGNvbnN0IGZ1bmN0aW9uczogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIFBhdHRlcm5zIHRvIGV4dHJhY3QgZnVuY3Rpb24gbmFtZXNcbiAgICBjb25zdCBwYXR0ZXJuczogUmVnRXhwW10gPSBbXG4gICAgICAgIC8vIENocm9tZS9FZGdlOiBcIiAgICBhdCBmdW5jdGlvbk5hbWUgKGZpbGU6bGluZTpjb2x1bW4pXCJcbiAgICAgICAgL15cXHMqYXRcXHMrKC4rPylcXHMrXFwoLyxcbiAgICAgICAgLy8gQ2hyb21lL0VkZ2U6IFwiICAgIGF0IGZpbGU6bGluZTpjb2x1bW5cIiAoYW5vbnltb3VzKVxuICAgICAgICAvXlxccyphdFxccytbXihdKyQvLFxuICAgICAgICAvLyBGaXJlZm94L1NhZmFyaTogXCJmdW5jdGlvbk5hbWVAZmlsZTpsaW5lOmNvbHVtblwiXG4gICAgICAgIC9eKC4rPylALyxcbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQgPT09ICdFcnJvcicpIGNvbnRpbnVlO1xuXG4gICAgICAgIGxldCBmdW5jdGlvbk5hbWUgPSAnYW5vbnltb3VzJztcblxuICAgICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gdHJpbW1lZC5tYXRjaChwYXR0ZXJuKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaFsxXSkge1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbk5hbWUgPSBtYXRjaFsxXS50cmltKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbm8gcGF0dGVybiBtYXRjaGVkLCB1c2UgdGhlIHdob2xlIGxpbmUgYXMgdGhlIGZ1bmN0aW9uIG5hbWVcbiAgICAgICAgaWYgKGZ1bmN0aW9uTmFtZSA9PT0gJ2Fub255bW91cycgJiYgIXBhdHRlcm5zLnNvbWUocCA9PiBwLnRlc3QodHJpbW1lZCkpKSB7XG4gICAgICAgICAgICBmdW5jdGlvbk5hbWUgPSB0cmltbWVkO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb25zLnB1c2goZnVuY3Rpb25OYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb25zO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbn1cblxuZnVuY3Rpb24gaXNFcnJvcih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEVycm9yIHtcbiAgICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBFcnJvcjtcbn1cbiIsICJleHBvcnQgZnVuY3Rpb24gaXNOb3RlYm9vaygpOiBib29sZWFuIHtcbiAgICBjb25zdCB3aW4gPSB3aW5kb3cgYXMgV2luZG93ICYge1xuICAgICAgICBKdXB5dGVyPzogYW55O1xuICAgICAgICBfSlVQWVRFUkxBQj86IGFueTtcbiAgICAgICAgZ29vZ2xlPzogeyBjb2xhYj86IGFueSB9O1xuICAgICAgICBJUHl0aG9uPzogYW55O1xuICAgICAgICBtbz86IGFueTtcbiAgICAgICAgYWNxdWlyZVZzQ29kZUFwaT86IGFueTtcbiAgICB9O1xuXG4gICAgY29uc3QgaGFzTm90ZWJvb2tHbG9iYWwgPVxuICAgICAgICB0eXBlb2Ygd2luLkp1cHl0ZXIgIT09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgIHR5cGVvZiB3aW4uX0pVUFlURVJMQUIgIT09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgICh0eXBlb2Ygd2luLmdvb2dsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luLmdvb2dsZS5jb2xhYikgfHxcbiAgICAgICAgdHlwZW9mIHdpbi5JUHl0aG9uICE9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICB0eXBlb2Ygd2luLm1vICE9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICB0eXBlb2Ygd2luLmFjcXVpcmVWc0NvZGVBcGkgIT09ICd1bmRlZmluZWQnO1xuXG4gICAgcmV0dXJuIGhhc05vdGVib29rR2xvYmFsIHx8IGlzVlNDb2RlTm90ZWJvb2soKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVlNDb2RlTm90ZWJvb2soKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAndnNjb2RlLXdlYnZpZXc6JyAmJlxuICAgICAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLmluY2x1ZGVzKCdwdXJwb3NlPW5vdGVib29rUmVuZGVyZXInKVxuICAgICk7XG59XG4iLCAiaW1wb3J0IHN2Z1BhdGhQYXJzZXIgZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9zdmctcGF0aC1wYXJzZXJAMS4xLjAvK2VzbSc7XG5pbXBvcnQgdGlwcHksIHsgUGxhY2VtZW50IH0gZnJvbSAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS90aXBweS5qc0A2LjMuNy8rZXNtJztcblxuZXhwb3J0IGNvbnN0IHJlcGxhY2VUb29sdGlwSW1wbCA9IChzcGVjRWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgLy8gQ2hlY2sgaWYgU1ZHIGFscmVhZHkgZXhpc3RzXG4gICAgY29uZmlndXJlU3BlY1N2Z1Rvb2x0aXBzKHNwZWNFbCk7XG5cbiAgICAvLyBXYXRjaCB0aGUgc3BlYyBlbGVtZW50IGZvciBzdmdzIHRvIGJlIGFkZGVkXG4gICAgLy8gV2hlbiB0aGV5IGFyZSBhZGRlZCwgYXR0ZW1wdCB0byBjb25uZWN0IG91ciB0b29sdGlwXG4gICAgLy8gaGFuZGxlclxuICAgIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKCkgPT4ge1xuICAgICAgICBjb25maWd1cmVTcGVjU3ZnVG9vbHRpcHMoc3BlY0VsKTtcbiAgICB9KTtcbiAgICBvYnNlcnZlci5vYnNlcnZlKHNwZWNFbCwgeyBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfSk7XG59O1xuXG4vLyBUcmFjayB3aGljaCBTVkdzIGhhdmUgYmVlbiBzZXR1cFxuLy8gdG8gYXZvaWQgc2V0dGluZyB1cCBtdWx0aXBsZSBvYnNlcnZlcnMgb24gdGhlIHNhbWUgU1ZHLlxuY29uc3QgY29uZmlndXJlZFN2Z3MgPSBuZXcgV2Vha1NldDxTVkdTVkdFbGVtZW50PigpO1xuXG5jb25zdCBjb25maWd1cmVTcGVjU3ZnVG9vbHRpcHMgPSAoc3BlY0VsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgIGNvbnN0IGNoaWxkU3ZnRWxzID0gc3BlY0VsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3N2ZycpO1xuICAgIGNoaWxkU3ZnRWxzLmZvckVhY2goc3ZnRWwgPT4ge1xuICAgICAgICBpZiAoc3ZnRWwgJiYgIWNvbmZpZ3VyZWRTdmdzLmhhcyhzdmdFbCkpIHtcbiAgICAgICAgICAgIHNldHVwVG9vbHRpcE9ic2VydmVyKHN2Z0VsLCBzcGVjRWwpO1xuICAgICAgICAgICAgY29uZmlndXJlZFN2Z3MuYWRkKHN2Z0VsKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubGV0IHRvb2x0aXBJbnN0YW5jZTogYW55IHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBoaWRlVG9vbHRpcCgpIHtcbiAgICB0b29sdGlwSW5zdGFuY2UuaGlkZSgpO1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBoaWRlVG9vbHRpcCk7XG59XG5cbmZ1bmN0aW9uIHNob3dUb29sdGlwKCkge1xuICAgIHRvb2x0aXBJbnN0YW5jZS5zaG93KCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGhpZGVUb29sdGlwLCB7IG9uY2U6IHRydWUgfSk7XG59XG5cbmNvbnN0IHNldHVwVG9vbHRpcE9ic2VydmVyID0gKHN2Z0VsOiBTVkdTVkdFbGVtZW50LCBzcGVjRWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgLy8gSW5pdGlhbGl6ZSB0aXBweSBmb3IgdGhpcyBzcGVjIGVsZW1lbnQgaWYgbm90IGFscmVhZHkgZG9uZS5cbiAgICBpZiAoIXRvb2x0aXBJbnN0YW5jZSkge1xuICAgICAgICB0b29sdGlwSW5zdGFuY2UgPSB0aXBweShzcGVjRWwsIHtcbiAgICAgICAgICAgIHRyaWdnZXI6ICdtYW51YWwnLFxuICAgICAgICAgICAgdGhlbWU6ICdpbnNwZWN0JyxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gV2F0Y2ggdGhlIFNWRyBmb3IgY2hpbGRMaXN0IG11dGF0aW9ucyBhbmQgaW5zcGVjdCB0aGUgdGlwIGVsZW1lbnRcbiAgICAvLyB3aGVuZXZlciBpdCBjaGFuZ2VzLlxuICAgIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIobXV0YXRpb25zID0+IHtcbiAgICAgICAgbXV0YXRpb25zLmZvckVhY2gobXV0YXRpb24gPT4ge1xuICAgICAgICAgICAgaWYgKG11dGF0aW9uLnR5cGUgPT09ICdjaGlsZExpc3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGlwRWxlbWVudHMgPSBzdmdFbC5xdWVyeVNlbGVjdG9yQWxsKCdnW2FyaWEtbGFiZWw9XCJ0aXBcIl0nKTtcbiAgICAgICAgICAgICAgICBpZiAodGlwRWxlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpcENvbnRhaW5lckVsID0gdGlwRWxlbWVudHNbMF0gYXMgU1ZHR0VsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgIHRpcENvbnRhaW5lckVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHRpcCBjb250YWluZXIgaXMgZW1wdHksIHRoZSB0b29sdGlwIGhhcyBiZWVuIGRpc21pc3NlZFxuICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIHRoZSB0b29sdGlwXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpcEVsID0gdGlwQ29udGFpbmVyRWwuZmlyc3RDaGlsZCBhcyBTVkdHRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGlwRWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGVUb29sdGlwKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSB0aXAgY29udGFpbmVyIGFuZCBwYXJzZSBpdCB0byBkZXRlcm1pbmUgaG93IHRoZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXJlIGNvbmZpZ3VyZWQgYW5kIHdoYXQgaXMgYmVpbmcgZGlzcGxheWVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VTVkdUb29sdGlwKHRpcEVsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgU1ZHIHBvaW50IHRvIHNjcmVlbiBjb29yZGluYXRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ZnUG9pbnQgPSBzdmdFbC5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnUG9pbnQueCA9IHBhcnNlZC50cmFuc2Zvcm0/LnggfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Z1BvaW50LnkgPSBwYXJzZWQudHJhbnNmb3JtPy55IHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5Qb2ludCA9IHN2Z1BvaW50Lm1hdHJpeFRyYW5zZm9ybShzdmdFbC5nZXRTY3JlZW5DVE0oKSEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQb3NpdGlvbiB0aGUgdG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2VudGVyWCA9IHNjcmVlblBvaW50Lng7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjZW50ZXJZID0gc2NyZWVuUG9pbnQueTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29uZmlndXJlIHRpcHB5IHRvIGRpc3BsYXkgdGhlIEhUTUwgdG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbHRpcEluc3RhbmNlLnNldFByb3BzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZC5wbGFjZW1lbnQgIT09ICdtaWRkbGUnID8gcGFyc2VkLnBsYWNlbWVudCB8fCAndG9wJyA6ICd0b3AnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldFJlZmVyZW5jZUNsaWVudFJlY3Q6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiBjZW50ZXJZLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiBjZW50ZXJZLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogY2VudGVyWCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBjZW50ZXJYLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogY2VudGVyWCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGNlbnRlclksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b0pTT046ICgpID0+IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGFzIERPTVJlY3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJvdzogcGFyc2VkLnBsYWNlbWVudCAhPT0gJ21pZGRsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBwYXJzZWQucGxhY2VtZW50ID09PSAnbWlkZGxlJyA/IFswLCAwXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3BwZXJPcHRpb25zOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBtaWRkbGUgcGxhY2VtZW50LCB3aGljaCBpc24ndCBhIHN1cHBvcnRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aXBweSBwbGFjZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkLnBsYWNlbWVudCA9PT0gJ21pZGRsZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZpZXJzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAncHJldmVudE92ZXJmbG93JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdmbGlwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjdXN0b21NaWRkbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaGFzZTogJ21haW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbjogKHsgc3RhdGUgfTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDZW50ZXIgdGhlIHBvcG92ZXIgYXQgdGhlIHJlZmVyZW5jZSBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUubW9kaWZpZXJzRGF0YS5wb3BwZXJPZmZzZXRzLnggPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbnRlclggLSBzdGF0ZS5yZWN0cy5wb3BwZXIud2lkdGggLyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUubW9kaWZpZXJzRGF0YS5wb3BwZXJPZmZzZXRzLnkgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbnRlclkgLSBzdGF0ZS5yZWN0cy5wb3BwZXIuaGVpZ2h0IC8gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudEVsLmNsYXNzTGlzdC5hZGQoJ2luc3BlY3QtdGlwLWNvbnRhaW5lcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHBhcnNlZC52YWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgcm93XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dFbC5jbGFzc05hbWUgPSAnaW5zcGVjdC10aXAtcm93JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50RWwuYXBwZW5kQ2hpbGQocm93RWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGtleVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleUVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5RWwuY2xhc3NOYW1lID0gJ2luc3BlY3QtdGlwLWtleSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5RWwuYXBwZW5kKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHJvdy5rZXkpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZUVsLmNsYXNzTmFtZSA9ICdpbnNwZWN0LXRpcC12YWx1ZSc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZUVsLmFwcGVuZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShyb3cudmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yRWwuY2xhc3NOYW1lID0gJ2luc3BlY3QtdGlwLWNvbG9yJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JFbC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSByb3cuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlRWwuYXBwZW5kKGNvbG9yRWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd0VsLmFwcGVuZENoaWxkKGtleUVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dFbC5hcHBlbmRDaGlsZCh2YWx1ZUVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSB0b29sdGlwXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sdGlwSW5zdGFuY2Uuc2V0Q29udGVudChjb250ZW50RWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvd1Rvb2x0aXAoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBleGFjdGx5IG9uZSB0aXAgZWxlbWVudCwgZm91bmQgJHt0aXBFbGVtZW50cy5sZW5ndGh9YFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBvYnNlcnZlci5vYnNlcnZlKHN2Z0VsLCB7XG4gICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgc3VidHJlZTogdHJ1ZSxcbiAgICB9KTtcbn07XG5cbmludGVyZmFjZSBUb29sdGlwUm93IHtcbiAgICBrZXk6IHN0cmluZztcbiAgICB2YWx1ZTogc3RyaW5nO1xuICAgIGNvbG9yPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUGFyc2VkVG9vbHRpcCB7XG4gICAgdHJhbnNmb3JtPzoge1xuICAgICAgICB4OiBudW1iZXI7XG4gICAgICAgIHk6IG51bWJlcjtcbiAgICB9O1xuICAgIHZhbHVlczogQXJyYXk8VG9vbHRpcFJvdz47XG4gICAgcGxhY2VtZW50PzogUGxhY2VtZW50IHwgJ21pZGRsZSc7XG59XG5cbmNvbnN0IHBhcnNlU1ZHVG9vbHRpcCA9ICh0aXBFbDogU1ZHR0VsZW1lbnQpOiBQYXJzZWRUb29sdGlwID0+IHtcbiAgICBjb25zdCByZXN1bHQ6IFBhcnNlZFRvb2x0aXAgPSB7IHZhbHVlczogW10gfTtcblxuICAgIC8vIFBhcnNlIHRoZSB0cmFuc2Zvcm0gYXR0cmlidXRlIHRvIGNhcHR1cmUgdGhlIHBvc2l0aW9uXG4gICAgLy8gb2Zmc2V0IChyZWxhdGl2ZSB0byBTVkcgZWxlbWVudClcbiAgICBjb25zdCB0cmFuc2Zvcm1WYWwgPSB0aXBFbC5nZXRBdHRyaWJ1dGUoJ3RyYW5zZm9ybScpO1xuICAgIGlmICh0cmFuc2Zvcm1WYWwpIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSB0cmFuc2Zvcm1WYWwubWF0Y2goL3RyYW5zbGF0ZVxcKChbXildKylcXCkvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBtYXRjaFsxXS5zcGxpdCgnLCcpLm1hcChOdW1iZXIpO1xuICAgICAgICAgICAgcmVzdWx0LnRyYW5zZm9ybSA9IHsgeCwgeSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgdGhlIGNoaWxkIHNwYW5zXG4gICAgY29uc3QgdHNwYW5FbHMgPSB0aXBFbC5xdWVyeVNlbGVjdG9yQWxsKCd0c3BhbicpO1xuICAgIHRzcGFuRWxzLmZvckVhY2godHNwYW4gPT4ge1xuICAgICAgICBsZXQga2V5ID0gdW5kZWZpbmVkO1xuICAgICAgICBsZXQgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBjb2xvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdHNwYW4uY2hpbGROb2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAgICAgaWYgKG5vZGUubm9kZU5hbWUgPT09ICd0c3BhbicpIHtcbiAgICAgICAgICAgICAgICAvLyBOZXN0ZWQgdHNwYW4sIGVpdGhlciBrZXkgb3IgY29sb3JcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xvckF0dHIgPSAobm9kZSBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGUoJ2ZpbGwnKTtcbiAgICAgICAgICAgICAgICBpZiAoY29sb3JBdHRyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yID0gY29sb3JBdHRyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGtleSA9IG5vZGUudGV4dENvbnRlbnQ/LnRyaW0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZU5hbWUgPT09ICcjdGV4dCcpIHtcbiAgICAgICAgICAgICAgICAvLyBCYXJlIHRleHQgbm9kZXMgYXJlIGEga2V5XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBub2RlLnRleHRDb250ZW50Py50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoa2V5ICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVzdWx0LnZhbHVlcy5wdXNoKHsga2V5LCB2YWx1ZSwgY29sb3IgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFBhcnNlIHRoZSBwYXRoIHRvIGRldGVybWluZSB0aGUgYXJyb3cgZGlyZWN0aW9uXG4gICAgY29uc3QgcGF0aEVsID0gdGlwRWwucXVlcnlTZWxlY3RvcigncGF0aCcpO1xuICAgIGlmIChwYXRoRWwpIHtcbiAgICAgICAgY29uc3QgcGF0aERhdGEgPSBwYXRoRWwuZ2V0QXR0cmlidXRlKCdkJyk7XG4gICAgICAgIGlmIChwYXRoRGF0YSkge1xuICAgICAgICAgICAgcmVzdWx0LnBsYWNlbWVudCA9IHBhcnNlQXJyb3dEaXJlY3Rpb24ocGF0aERhdGEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmNvbnN0IHBhcnNlQXJyb3dQb3NpdGlvbiA9IChhOiBudW1iZXIsIGI6IG51bWJlcik6ICdzdGFydCcgfCAnY2VudGVyJyB8ICdlbmQnID0+IHtcbiAgICBpZiAoYSA8IGIpIHtcbiAgICAgICAgcmV0dXJuICdlbmQnO1xuICAgIH0gZWxzZSBpZiAoYSA+IGIpIHtcbiAgICAgICAgcmV0dXJuICdzdGFydCc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICdjZW50ZXInO1xuICAgIH1cbn07XG5cbmNvbnN0IHBhcnNlQXJyb3dEaXJlY3Rpb24gPSAocGF0aERhdGE6IHN0cmluZyk6IFBsYWNlbWVudCB8ICdtaWRkbGUnID0+IHtcbiAgICBjb25zdCBwYXJzZWQgPSBzdmdQYXRoUGFyc2VyLnBhcnNlU1ZHKHBhdGhEYXRhKTtcbiAgICBpZiAocGFyc2VkLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgcmV0dXJuICd0b3AnO1xuICAgIH1cblxuICAgIGNvbnN0IG1vdmVUbyA9IHBhcnNlZFswXTtcbiAgICBpZiAobW92ZVRvLmNvZGUgIT09ICdNJykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ0V4cGVjdGVkIG1vdmV0byBjb21tYW5kIChNKSBpbiBwYXRoIGRhdGEsIGZvdW5kOicsIG1vdmVUbyk7XG4gICAgICAgIHJldHVybiAndG9wJztcbiAgICB9XG5cbiAgICBpZiAobW92ZVRvLnggIT09IDAgJiYgbW92ZVRvLnkgIT09IDApIHtcbiAgICAgICAgcmV0dXJuICdtaWRkbGUnO1xuICAgIH1cblxuICAgIGNvbnN0IGxpbmVUbyA9IHBhcnNlZFsxXTtcbiAgICBpZiAobGluZVRvLmNvZGUgIT09ICdsJykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ0V4cGVjdGVkIGxpbmV0byBjb21tYW5kIChsKSBpbiBwYXRoIGRhdGEsIGZvdW5kOicsIGxpbmVUbyk7XG4gICAgICAgIHJldHVybiAndG9wJztcbiAgICB9XG5cbiAgICBjb25zdCBmaXJzdEVkZ2VMaW5lVG8gPSBwYXJzZWRbMl07XG4gICAgaWYgKGZpcnN0RWRnZUxpbmVUby5jb2RlICE9PSAnaCcgJiYgZmlyc3RFZGdlTGluZVRvLmNvZGUgIT09ICd2Jykge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAnRXhwZWN0ZWQgaG9yaXpvbnRhbCAoaCkgb3IgdmVydGljYWwgKHYpIGxpbmUgY29tbWFuZCBhZnRlciBtb3ZlLCBmb3VuZDonLFxuICAgICAgICAgICAgZmlyc3RFZGdlTGluZVRvXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiAndG9wJztcbiAgICB9XG5cbiAgICBjb25zdCBsYXN0RWRnZUxpbmVUbyA9IHBhcnNlZFtwYXJzZWQubGVuZ3RoIC0gMl07XG4gICAgaWYgKGxhc3RFZGdlTGluZVRvLmNvZGUgIT09ICdoJyAmJiBsYXN0RWRnZUxpbmVUby5jb2RlICE9PSAndicpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgJ0V4cGVjdGVkIGhvcml6b250YWwgKGgpIG9yIHZlcnRpY2FsICh2KSBsaW5lIGNvbW1hbmQgYmVmb3JlIGNsb3NlLCBmb3VuZDonLFxuICAgICAgICAgICAgbGFzdEVkZ2VMaW5lVG9cbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuICd0b3AnO1xuICAgIH1cblxuICAgIC8vIGZpcnN0IGRldGVybWluZSB0aGUgZGlyZWN0aW9uIG9mIHRoZSBhcnJvd1xuICAgIGNvbnN0IHggPSBsaW5lVG8ueDtcbiAgICBjb25zdCB5ID0gbGluZVRvLnk7XG5cbiAgICBsZXQgYXJyb3dEaXJlY3Rpb246ICd0b3AnIHwgJ2JvdHRvbScgfCAnbGVmdCcgfCAncmlnaHQnID0gJ3RvcCc7XG4gICAgaWYgKHggPiAwICYmIHkgPiAwKSB7XG4gICAgICAgIGFycm93RGlyZWN0aW9uID0gJ2JvdHRvbSc7XG4gICAgfSBlbHNlIGlmICh4IDwgMCAmJiB5IDwgMCkge1xuICAgICAgICBpZiAoZmlyc3RFZGdlTGluZVRvLmNvZGUgPT09ICdoJykge1xuICAgICAgICAgICAgYXJyb3dEaXJlY3Rpb24gPSAnYm90dG9tJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFycm93RGlyZWN0aW9uID0gJ2xlZnQnO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh4ID4gMCAmJiB5IDwgMCkge1xuICAgICAgICBpZiAoZmlyc3RFZGdlTGluZVRvLmNvZGUgPT09ICdoJykge1xuICAgICAgICAgICAgYXJyb3dEaXJlY3Rpb24gPSAndG9wJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFycm93RGlyZWN0aW9uID0gJ3JpZ2h0JztcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoeCA8IDAgJiYgeSA+IDApIHtcbiAgICAgICAgYXJyb3dEaXJlY3Rpb24gPSAnYm90dG9tJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAnQ291bGQgbm90IGRldGVybWluZSBhcnJvdyBkaXJlY3Rpb24gZnJvbSBwYXRoIGRhdGEsIHJldHVybmluZyBkZWZhdWx0IHBsYWNlbWVudDogdG9wJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIE5leHQgZGV0ZXJtaW5lIHRoZSBwbGFjZW1lbnQgd2l0aGluIHRoZSBzdmcgKHN0YXJ0LCBjZW50ZXIsIGVuZClcbiAgICBsZXQgYXJyb3dQb3NpdGlvbjogJ3N0YXJ0JyB8ICdjZW50ZXInIHwgJ2VuZCcgPSAnY2VudGVyJztcbiAgICBpZiAoZmlyc3RFZGdlTGluZVRvLmNvZGUgPT09ICdoJykge1xuICAgICAgICBhcnJvd1Bvc2l0aW9uID0gcGFyc2VBcnJvd1Bvc2l0aW9uKGZpcnN0RWRnZUxpbmVUby54LCBsYXN0RWRnZUxpbmVUby54KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhcnJvd1Bvc2l0aW9uID0gcGFyc2VBcnJvd1Bvc2l0aW9uKGZpcnN0RWRnZUxpbmVUby55LCBsYXN0RWRnZUxpbmVUby55KTtcbiAgICB9XG5cbiAgICAvLyBGaW5hbGl6ZSB0aGUgcGxhY2VtZW50IGJhc2VkIG9uIGRpcmVjdGlvbiBhbmQgcG9zaXRpb25cbiAgICBpZiAoYXJyb3dQb3NpdGlvbiA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgcmV0dXJuIGFycm93RGlyZWN0aW9uIGFzIFBsYWNlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYCR7YXJyb3dEaXJlY3Rpb259LSR7YXJyb3dQb3NpdGlvbn1gIGFzIFBsYWNlbWVudDtcbiAgICB9XG59O1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUVBO0FBQUEsRUFHSTtBQUFBLE9BR0c7QUFFUCxTQUFTLFlBQUFBLGlCQUFnQjs7O0FDUnpCLFNBQVMscUJBQXFCO0FBRTlCLFNBQVMsMEJBQTBCOzs7QUNKbkM7QUFBQSxFQUNJO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLE9BQ0c7QUFFUDtBQUFBLEVBRUk7QUFBQSxPQUVHOzs7QUNaQSxJQUFNLFdBQVcsQ0FBQyxNQUE2QztBQUNsRSxTQUFPLE1BQU0sUUFBUSxPQUFPLE1BQU0sWUFBWSxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBQ2xFOzs7QUNGQTtBQUFBLEVBQ0k7QUFBQSxFQUNBO0FBQUEsT0FHRztBQVNBLFNBQVMsTUFDWixlQUNHLFFBQ1E7QUFDWCxRQUFNQyxTQUFRLElBQUksV0FBVyxHQUFHLE1BQU07QUFDdEMsY0FBWSxFQUFFLFFBQVFBLE1BQUs7QUFDM0IsU0FBT0EsT0FBTTtBQUNqQjtBQUVPLElBQU0sUUFBTixjQUFvQixhQUFhO0FBQUEsRUFDcEI7QUFBQSxFQUNoQixZQUFZLFVBQXNCO0FBQzlCLFVBQU0sUUFBUTtBQUNkLFNBQUssVUFBVSxTQUFTLGNBQWMsS0FBSztBQUMzQyxXQUFPLGVBQWUsS0FBSyxTQUFTLFNBQVMsRUFBRSxPQUFPLEtBQUssQ0FBQztBQUFBLEVBQ2hFO0FBQUEsRUFFQSxXQUFXO0FBQUEsRUFFWDtBQUNKOzs7QUNsQ08sU0FBUyxhQUFhO0FBQ3pCLFNBQU8sUUFBUSxLQUFLLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRSxVQUFVLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRSxTQUFTLEVBQUU7QUFDbkY7OztBQ0VPLFNBQVMsZUFBZSxRQUFzQztBQUNqRSxRQUFNLFdBQVcsT0FBTyxTQUFTLGNBQWMsVUFBVTtBQUV6RCxNQUFJLFFBQVE7QUFDUixVQUFNLFdBQVcsT0FBTyxTQUFTLGNBQWMsUUFBUTtBQUN2RCxhQUFTLFlBQVk7QUFDckIsYUFBUyxPQUFPLE1BQU07QUFBQSxFQUMxQjtBQUVBLFNBQU87QUFDWDtBQUVPLFNBQVMsbUJBQ1osVUFDQSxTQUNBLE1BQ0Y7QUFFRSxXQUFTLGlCQUFpQixjQUFjLEVBQUUsUUFBUSxRQUFNO0FBQ3BELE9BQUcsT0FBTztBQUFBLEVBQ2QsQ0FBQztBQUdELFFBQU0sT0FBTyxXQUFXO0FBQ3hCLGFBQVcsRUFBRSxPQUFPLE1BQU0sS0FBSyxXQUFXLENBQUMsR0FBRztBQUMxQyxVQUFNLEVBQUUsV0FBVyxJQUFJLG1CQUFtQixNQUFNLE9BQU8sTUFBTSxLQUFLO0FBQ2xFLGFBQVMsWUFBWSxVQUFVO0FBQUEsRUFDbkM7QUFDSjtBQUVPLFNBQVMsbUJBQ1osTUFDQSxPQUNBLE1BQ0EsT0FDRjtBQUNFLFFBQU0sYUFBYSxPQUFPLFNBQVMsY0FBYyxPQUFPO0FBQ3hELFFBQU1DLFNBQVEsT0FBTyxTQUFTLGNBQWMsT0FBTztBQUNuRCxFQUFBQSxPQUFNLE9BQU87QUFDYixNQUFJLE1BQU07QUFDTixJQUFBQSxPQUFNLE9BQU87QUFBQSxFQUNqQjtBQUNBLE1BQUksT0FBTztBQUNQLElBQUFBLE9BQU0sUUFBUTtBQUFBLEVBQ2xCO0FBQ0EsYUFBVyxZQUFZQSxNQUFLO0FBQzVCLGFBQVcsWUFBWSxPQUFPLFNBQVMsZUFBZSxJQUFJLFNBQVMsS0FBSyxFQUFFLENBQUM7QUFDM0UsU0FBTyxFQUFFLFlBQVksT0FBQUEsT0FBTTtBQUMvQjtBQUVPLFNBQVMseUJBQXlCQSxRQUFjLFNBQXNCO0FBRXpFLFVBQVEsaUJBQWlCLGdCQUFnQixTQUFPO0FBQzVDLFFBQUksQ0FBQyxJQUFJLFFBQVMsQ0FBQUEsT0FBTSxTQUFTO0FBQUEsRUFDckMsQ0FBQztBQUNELFVBQVEsaUJBQWlCLFNBQVMsTUFBTUEsT0FBTSxTQUFTLENBQUM7QUFDNUQ7OztBSmhDTyxJQUFlLGNBQWYsY0FBbUMsTUFBTTtBQUFBLEVBRTVDLFlBQStCLFVBQThCO0FBQ3pELFVBQU0sU0FBUyxRQUFRO0FBREk7QUFBQSxFQUUvQjtBQUFBLEVBSFUsUUFBa0IsQ0FBQztBQUFBLEVBVzdCLFdBQVc7QUFDUCxRQUFJLFlBQVksS0FBSyxTQUFTLEVBQUUsS0FBSyxLQUFLLFNBQVMsUUFBUTtBQUN2RCxZQUFNLFFBQVEsS0FBSyxTQUFTLFNBQVMsS0FBSyxTQUFTO0FBQ25ELFdBQUssU0FBUyxHQUFHLFNBQVMsWUFBWSxPQUFPLFFBQVcsRUFBRSxRQUFRLEtBQUssQ0FBQyxDQUFDO0FBQUEsSUFDN0U7QUFBQSxFQUNKO0FBQUEsRUFFQSxRQUFRLE9BQTJCO0FBQy9CLFVBQU0sRUFBRSxJQUFJLE9BQU8sUUFBQUMsUUFBTyxJQUFJLEtBQUs7QUFDbkMsUUFBSSxZQUFZLEVBQUUsS0FBS0EsU0FBUTtBQUMzQixVQUFJLFNBQVMsWUFBWSxTQUFTQSxTQUFRLFFBQVcsRUFBRSxRQUFRLEtBQUssQ0FBQztBQUNyRSxVQUFJLE1BQU0sUUFBUSxLQUFLLEtBQUssTUFBTSxTQUFTLEdBQUc7QUFDMUMsaUJBQVM7QUFBQSxVQUNMLENBQUMsU0FBU0EsT0FBTTtBQUFBLFVBQ2hCLE1BQU0sSUFBSSxPQUFLLENBQUMsQ0FBQyxDQUFDO0FBQUEsVUFDbEIsRUFBRSxRQUFRLEtBQUs7QUFBQSxRQUNuQjtBQUFBLE1BQ0osV0FBVyxPQUFPLFFBQVE7QUFDdEIsaUJBQVMsWUFBWSxTQUFTQSxTQUFRLE9BQU8sRUFBRSxRQUFRLEtBQUssQ0FBQztBQUFBLE1BQ2pFO0FBQ0EsU0FBRyxPQUFPLE1BQU07QUFBQSxJQUNwQixXQUFXLFFBQVEsRUFBRSxHQUFHO0FBQ3BCLFNBQUcsT0FBTyxLQUFLO0FBQUEsSUFDbkI7QUFBQSxFQUNKO0FBQUEsRUFFQSxNQUFNLFNBQXVCLENBQUMsR0FBdUI7QUFDakQsVUFBTSxFQUFFLE1BQU0sUUFBQUEsUUFBTyxJQUFJLEtBQUs7QUFFOUIsUUFBSSxDQUFDLE1BQU07QUFDUCxhQUFPO0FBQUEsSUFDWDtBQUVBLFFBQUksQ0FBQ0EsU0FBUTtBQUNULFlBQU0sSUFBSSxNQUFNLG9EQUFvRDtBQUFBLElBQ3hFO0FBRUEsV0FBTyxNQUFNLEtBQUssSUFBSSxFQUNqQixPQUFPLEVBQUUsT0FBT0EsUUFBTyxDQUFDLEVBQ3hCLFNBQVMsRUFDVCxNQUFNLEdBQUcsTUFBTSxFQUNmLFFBQVFBLE9BQU07QUFBQSxFQUN2QjtBQUFBLEVBRUEsWUFBWSxNQUFpQjtBQUN6QixTQUFLLFFBQVEsQ0FBQyxFQUFFLE9BQU8sSUFBSSxPQUFPLE1BQU0sR0FBRyxHQUFHLEtBQUssbUJBQW1CLElBQUksQ0FBQyxDQUFDO0FBQzVFLFdBQU87QUFBQSxFQUNYO0FBQUEsRUFFQSxtQkFBbUIsTUFBcUI7QUFDcEMsVUFBTSxVQUFVLGNBQWMsSUFBSTtBQUNsQyxVQUFNLFNBQVMsUUFBUSxRQUFRO0FBQy9CLFdBQU8sT0FBTyxJQUFJLFFBQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtBQUFBLEVBQ3pDO0FBQUEsRUFFVSxXQUFXLFNBQW1CO0FBQ3BDLFNBQUssUUFBUSxRQUFRLElBQUksU0FBUSxTQUFTLEdBQUcsSUFBSSxNQUFNLEVBQUUsT0FBTyxJQUFJLENBQUUsQ0FBQztBQUN2RSxTQUFLLE9BQU87QUFBQSxFQUNoQjtBQUFBLEVBRVUscUJBQXFCO0FBQzNCLFFBQUksQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFLEdBQUc7QUFDaEMsV0FBSyxTQUFTLEdBQUcsaUJBQWlCLFNBQVMsV0FBUztBQUNoRCxhQUFLLGdCQUFnQjtBQUFBLE1BQ3pCLENBQUM7QUFBQSxJQUNMO0FBQUEsRUFDSjtBQUFBLEVBRVUseUJBQXlCLFNBQXNCO0FBQ3JELFFBQUksWUFBWSxLQUFLLFNBQVMsRUFBRSxHQUFHO0FBQy9CLCtCQUF5QixNQUFNLE9BQU87QUFBQSxJQUMxQztBQUFBLEVBQ0o7QUFBQSxFQUVVLHNCQUFzQjtBQUU1QixVQUFNLFFBQVEsWUFBWSxLQUFLLFNBQVMsRUFBRSxJQUNwQyxLQUFLLFNBQVMsR0FBRyxTQUFTLElBQUksSUFDOUIsS0FBSyxTQUFTLEdBQUc7QUFDdkIsU0FBSyxnQkFBZ0IsVUFBVSxTQUFZLEtBQUs7QUFBQSxFQUNwRDtBQUFBLEVBRUEsUUFBUSxTQUFtQjtBQUN2QixRQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxHQUFHO0FBQ2hDLFlBQU0sYUFBYSxLQUFLLFNBQVMsR0FBRztBQUNwQyxVQUNJLGNBQ0EsQ0FBQyxNQUFNLFFBQVEsVUFBVSxLQUN6QixDQUFDLFFBQVEsS0FBSyxZQUFVLE9BQU8sVUFBVSxVQUFVLEdBQ3JEO0FBQ0Usa0JBQVUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxPQUFPLFdBQVcsQ0FBQztBQUFBLE1BQ2hEO0FBQUEsSUFDSjtBQUNBLFNBQUssUUFBUTtBQUFBLEVBQ2pCO0FBQ0o7OztBS2xJTyxJQUFNLGFBQU4sY0FBeUIsWUFBWTtBQUFBLEVBQ3ZCO0FBQUEsRUFDakIsWUFBWSxTQUE0QjtBQUVwQyxVQUFNLE9BQU87QUFHYixTQUFLLFlBQVksZUFBZSxRQUFRLFNBQVMsUUFBUSxNQUFNO0FBQy9ELFNBQUssUUFBUSxPQUFPLEtBQUssU0FBUztBQUdsQyxRQUFJLFFBQVEsU0FBUztBQUNqQixXQUFLLFdBQVcsUUFBUSxPQUFPO0FBQUEsSUFDbkM7QUFHQSxTQUFLLGdCQUFnQjtBQUdyQixTQUFLLFVBQVUsaUJBQWlCLFVBQVUsT0FBSztBQUMzQyxVQUFJLEVBQUUsa0JBQWtCLGtCQUFrQjtBQUN0QyxZQUFJLEVBQUUsT0FBTyxTQUFTLFNBQVM7QUFDM0IsZUFBSyxRQUFRLEtBQUssaUJBQWlCLElBQUk7QUFBQSxRQUMzQztBQUFBLE1BQ0o7QUFBQSxJQUNKLENBQUM7QUFHRCxTQUFLLG1CQUFtQjtBQUN4QixTQUFLLHlCQUF5QixLQUFLLFNBQVM7QUFBQSxFQUNoRDtBQUFBLEVBRUEsSUFBSSxnQkFBd0I7QUFDeEIsVUFBTSxVQUFVLEtBQUssVUFBVTtBQUFBLE1BQzNCO0FBQUEsSUFDSjtBQUNBLFdBQU8sU0FBUyxRQUFTLFFBQVEsVUFBVSxPQUFPLEtBQUssUUFBUSxRQUFTO0FBQUEsRUFDNUU7QUFBQSxFQUVBLElBQUksY0FBYyxPQUFlO0FBQzdCLFlBQVEsVUFBVSxLQUFLLE9BQU87QUFDOUIsVUFBTSxTQUFTLEtBQUssVUFBVSxpQkFBaUIscUJBQXFCO0FBQ3BFLGVBQVcsU0FBUyxRQUFRO0FBQ3hCLFVBQUssTUFBMkIsVUFBVSxPQUFPO0FBQzdDLFFBQUMsTUFBMkIsVUFBVTtBQUN0QyxjQUFNLGNBQWMsSUFBSSxNQUFNLFVBQVUsRUFBRSxTQUFTLEtBQUssQ0FBQyxDQUFDO0FBQzFEO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsRUFFQSxTQUFlO0FBQ1gsdUJBQW1CLEtBQUssV0FBVyxLQUFLLE9BQU8sT0FBTztBQUN0RCxTQUFLLG9CQUFvQjtBQUN6QixXQUFPO0FBQUEsRUFDWDtBQUNKOzs7QUM3RE8sSUFBTSxvQkFBb0I7QUFDMUIsSUFBTSxlQUFlOzs7QUNJNUIsT0FBTyxlQUFlO0FBQ3RCLFNBQVMsZUFBQUMsb0JBQW1CO0FBUXJCLElBQU0sU0FBTixjQUFxQixZQUFZO0FBQUEsRUFDbkI7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNULGFBQXlCO0FBQUEsRUFDakMsWUFBWSxTQUF3QjtBQUVoQyxVQUFNLE9BQU87QUFHYixTQUFLLFlBQVksUUFBUSxZQUFZO0FBQ3JDLFNBQUssY0FBYyxRQUFRLFVBQVU7QUFDckMsU0FBSyxnQkFDRCxRQUFRLFVBQVUsU0FBUyxRQUFRLFVBQVUsU0FBUyxTQUFZLFFBQVE7QUFHOUUsU0FBSyxRQUFRLFVBQVUsSUFBSSxpQkFBaUI7QUFHNUMsVUFBTSxRQUFRLFFBQVEsU0FBUyxRQUFRO0FBQ3ZDLFFBQUksVUFBbUM7QUFDdkMsUUFBSSxVQUFVLFFBQVc7QUFDckIsZ0JBQVUsT0FBTyxTQUFTLGNBQWMsT0FBTztBQUMvQyxjQUFRLFlBQVk7QUFDcEIsV0FBSyxRQUFRLFlBQVksT0FBTztBQUFBLElBQ3BDO0FBR0EsU0FBSyxVQUFVLFNBQVMsY0FBYyxRQUFRO0FBQzlDLFFBQUksUUFBUSxPQUFPO0FBQ2YsV0FBSyxRQUFRLE1BQU0sUUFBUSxHQUFHLFFBQVEsS0FBSztBQUFBLElBQy9DO0FBQ0EsU0FBSyxRQUFRLEtBQUssV0FBVztBQUM3QixRQUFJLFNBQVM7QUFDVCxjQUFRLFlBQVksS0FBSyxPQUFPO0FBQUEsSUFDcEMsT0FBTztBQUNILFdBQUssUUFBUSxZQUFZLEtBQUssT0FBTztBQUFBLElBQ3pDO0FBR0EsUUFBSSxRQUFRLFNBQVM7QUFDakIsV0FBSyxXQUFXLFFBQVEsT0FBTztBQUFBLElBQ25DO0FBR0EsUUFBSSxLQUFLLGtCQUFrQixVQUFhQSxhQUFZLEtBQUssU0FBUyxFQUFFLEdBQUc7QUFDbkUsV0FBSyxRQUFRLFFBQVEsS0FBSztBQUFBLElBQzlCO0FBR0EsU0FBSyxRQUFRLGlCQUFpQixTQUFTLE1BQU07QUFDekMsV0FBSyxRQUFRLEtBQUssaUJBQWlCLElBQUk7QUFBQSxJQUMzQyxDQUFDO0FBR0QsU0FBSyxtQkFBbUI7QUFDeEIsU0FBSyx5QkFBeUIsS0FBSyxPQUFPO0FBQUEsRUFDOUM7QUFBQSxFQUVBLFlBQVksTUFBaUI7QUFDekIsUUFBSSxLQUFLLGFBQWEsQ0FBQyxLQUFLLGFBQWE7QUFDckMsV0FBSyxRQUFRLEtBQUssbUJBQW1CLElBQUksQ0FBQztBQUMxQyxhQUFPO0FBQUEsSUFDWCxPQUFPO0FBQ0gsYUFBTyxNQUFNLFlBQVksSUFBSTtBQUFBLElBQ2pDO0FBQUEsRUFDSjtBQUFBLEVBRUEsSUFBSSxnQkFBbUM7QUFDbkMsV0FBTyxLQUFLLFlBQVksU0FBUyxLQUFLO0FBQUEsRUFDMUM7QUFBQSxFQUVBLElBQUksY0FBYyxPQUEwQjtBQUN4QyxTQUFLLFlBQVksU0FBUyxLQUFLO0FBQUEsRUFDbkM7QUFBQSxFQUVBLFNBQWU7QUFFWCxRQUFJLENBQUMsS0FBSyxZQUFZO0FBQ2xCLFVBQUksS0FBSyxXQUFXO0FBQ2hCLGFBQUssUUFBUSxXQUFXO0FBQUEsTUFDNUI7QUFDQSxZQUFNLFNBQStCO0FBQUEsUUFDakMsUUFBUTtBQUFBLFFBQ1IsZ0JBQWdCO0FBQUEsTUFDcEI7QUFDQSxVQUFJLENBQUMsS0FBSyxRQUFRLFVBQVU7QUFDeEIsZUFBTyxtQkFBbUIsS0FBSztBQUUvQixlQUFPLGVBQWU7QUFBQSxNQUMxQixPQUFPO0FBQ0gsZUFBTyxVQUFVO0FBQUEsVUFDYixlQUFlO0FBQUEsWUFDWCxPQUFPO0FBQUEsVUFDWDtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBRUEsV0FBSyxhQUFhLElBQUksVUFBVSxLQUFLLFNBQVMsTUFBTTtBQUVwRCxVQUFJLEtBQUssV0FBVztBQUNoQixhQUFLLFdBQVcsR0FBRyxZQUFZLE1BQU07QUFDakMsZUFBSyxXQUFZLGNBQWMsUUFBUTtBQUN2QyxlQUFLLFlBQVksZUFBZSxLQUFLO0FBQUEsUUFDekMsQ0FBQztBQUFBLE1BQ0w7QUFFQSxZQUFNLGVBQ0YsS0FBSyxrQkFBa0IsS0FBSyxjQUFjLEtBQUssS0FBSyxRQUFRLENBQUMsRUFBRTtBQUNuRSxZQUFNLFFBQVFBLGFBQVksS0FBSyxTQUFTLEVBQUUsSUFDcEMsZUFDQSxLQUFLLFNBQVMsR0FBRyxTQUFTO0FBRWhDLFdBQUssZ0JBQWdCO0FBQ3JCLFdBQUssUUFBUSxLQUFLO0FBQUEsSUFDdEI7QUFHQSxTQUFLLFdBQVcsYUFBYTtBQUM3QixTQUFLLFdBQVc7QUFBQSxNQUNaLEtBQUssTUFBTSxJQUFJLFFBQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRTtBQUFBLElBQ3RFO0FBQ0EsU0FBSyxXQUFXLGVBQWUsS0FBSztBQUdwQyxTQUFLLG9CQUFvQjtBQUV6QixXQUFPO0FBQUEsRUFDWDtBQUNKOzs7QUMzSU8sSUFBTSxnQkFBTixjQUE0QixZQUFZO0FBQUEsRUFDMUI7QUFBQSxFQUNqQixZQUFZLFNBQStCO0FBRXZDLFVBQU0sT0FBTztBQUdiLFNBQUssWUFBWSxlQUFlLFFBQVEsU0FBUyxRQUFRLE1BQU07QUFDL0QsU0FBSyxRQUFRLE9BQU8sS0FBSyxTQUFTO0FBR2xDLFFBQUksUUFBUSxTQUFTO0FBQ2pCLFdBQUssV0FBVyxRQUFRLE9BQU87QUFBQSxJQUNuQztBQUdBLFNBQUssVUFBVSxpQkFBaUIsVUFBVSxPQUFLO0FBQzNDLFVBQUksRUFBRSxrQkFBa0Isa0JBQWtCO0FBQ3RDLFlBQUksRUFBRSxPQUFPLFNBQVMsWUFBWTtBQUM5QixlQUFLLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDO0FBQUEsUUFDekM7QUFBQSxNQUNKO0FBQUEsSUFDSixDQUFDO0FBR0QsU0FBSyxtQkFBbUI7QUFDeEIsU0FBSyx5QkFBeUIsS0FBSyxTQUFTO0FBQUEsRUFDaEQ7QUFBQSxFQUVBLElBQUksZ0JBQTBCO0FBQzFCLFVBQU0sVUFBVSxLQUFLLFVBQVU7QUFBQSxNQUMzQjtBQUFBLElBQ0o7QUFDQSxXQUFPLE1BQU0sS0FBSyxPQUFPLEVBQUUsSUFBSSxjQUFZLFNBQVMsS0FBSztBQUFBLEVBQzdEO0FBQUEsRUFFQSxJQUFJLGNBQWMsUUFBa0I7QUFDaEMsVUFBTSxhQUFhLEtBQUssVUFBVSxpQkFBaUIsd0JBQXdCO0FBQzNFLGVBQVcsWUFBWSxZQUFZO0FBQy9CLFlBQU1DLFNBQVE7QUFDZCxZQUFNLGtCQUFrQixPQUFPLFNBQVNBLE9BQU0sS0FBSztBQUVuRCxVQUFJQSxPQUFNLFlBQVksaUJBQWlCO0FBQ25DLFFBQUFBLE9BQU0sVUFBVTtBQUNoQixRQUFBQSxPQUFNLGNBQWMsSUFBSSxNQUFNLFVBQVUsRUFBRSxTQUFTLEtBQUssQ0FBQyxDQUFDO0FBQUEsTUFDOUQ7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUFBLEVBRUEsWUFBWSxNQUFpQjtBQUN6QixTQUFLLFFBQVEsS0FBSyxtQkFBbUIsSUFBSSxDQUFDO0FBQzFDLFdBQU87QUFBQSxFQUNYO0FBQUEsRUFFQSxTQUFlO0FBQ1gsdUJBQW1CLEtBQUssV0FBVyxLQUFLLE9BQU8sVUFBVTtBQUN6RCxTQUFLLG9CQUFvQjtBQUN6QixXQUFPO0FBQUEsRUFDWDtBQUNKOzs7QUNoRUE7QUFBQSxFQUNJLGVBQUFDO0FBQUEsRUFDQSxXQUFBQztBQUFBLEVBQ0EsZUFBQUM7QUFBQSxPQUVHO0FBWUEsSUFBTSxXQUFOLGNBQXVCLE1BQU07QUFBQSxFQUNoQyxZQUErQixVQUEyQjtBQUN0RCxVQUFNLFNBQVMsUUFBUTtBQURJO0FBSTNCLFVBQU0sRUFBRSxZQUFZLE9BQUFDLE9BQU0sSUFBSSxtQkFBbUIsWUFBWSxTQUFTLEtBQUs7QUFDM0UsSUFBQUEsT0FBTSxLQUFLLFdBQVc7QUFDdEIsU0FBSyxRQUFRLFlBQVksVUFBVTtBQUduQyxJQUFBQSxPQUFNLFVBQVUsQ0FBQ0MsYUFBWSxLQUFLLFNBQVMsRUFBRSxJQUN0QyxLQUFLLFNBQVMsSUFBSSxTQUFTLFNBQVMsVUFDckMsU0FBUztBQUdmLFVBQU0sVUFBVSxNQUNaLEtBQUs7QUFBQSxNQUNERCxPQUFNLFVBQVUsU0FBUyxPQUFPLENBQUMsS0FBSyxTQUFZLFNBQVMsT0FBTyxDQUFDLEtBQUs7QUFBQSxJQUM1RTtBQUNKLElBQUFBLE9BQU0saUJBQWlCLFVBQVUsT0FBTztBQUN4QyxZQUFRO0FBR1IsUUFBSSxDQUFDQyxhQUFZLEtBQUssU0FBUyxFQUFFLEdBQUc7QUFDaEMsV0FBSyxTQUFTLEdBQUcsaUJBQWlCLFNBQVMsV0FBUztBQUNoRCxRQUFBRCxPQUFNLFVBQVUsVUFBVSxLQUFLLFNBQVMsT0FBTyxDQUFDO0FBQUEsTUFDcEQsQ0FBQztBQUFBLElBQ0wsT0FHSztBQUNELCtCQUF5QixNQUFNQSxNQUFLO0FBQUEsSUFDeEM7QUFBQSxFQUNKO0FBQUEsRUFFQSxXQUFpQjtBQUNiLFFBQUlDLGFBQVksS0FBSyxTQUFTLEVBQUUsR0FBRztBQUMvQixXQUFLLFNBQVMsR0FBRyxTQUFTLEtBQUssT0FBTyxDQUFDO0FBQUEsSUFDM0M7QUFBQSxFQUNKO0FBQUEsRUFFQSxPQUFPLE9BQW9EO0FBQ3ZELFFBQUksQ0FBQyxLQUFLLFNBQVMsT0FBTztBQUN0QixZQUFNLElBQUksTUFBTSwwREFBMEQ7QUFBQSxJQUM5RTtBQUVBLFdBQU9DLGFBQVksS0FBSyxTQUFTLE9BQU8sT0FBTyxFQUFFLFFBQVEsS0FBSyxDQUFDO0FBQUEsRUFDbkU7QUFBQSxFQUVBLFFBQVEsT0FBbUM7QUFDdkMsUUFBSUQsYUFBWSxLQUFLLFNBQVMsRUFBRSxHQUFHO0FBQy9CLFdBQUssU0FBUyxHQUFHLE9BQU8sS0FBSyxPQUFPLEtBQUssQ0FBQztBQUFBLElBQzlDLFdBQVdFLFNBQVEsS0FBSyxTQUFTLEVBQUUsR0FBRztBQUNsQyxXQUFLLFNBQVMsR0FBRyxPQUFPLEtBQUs7QUFBQSxJQUNqQztBQUFBLEVBQ0o7QUFDSjs7O0FDekVBO0FBQUEsRUFDSTtBQUFBLEVBQ0EsZUFBQUM7QUFBQSxFQUNBLFdBQUFDO0FBQUEsRUFDQSxlQUFBQztBQUFBLE9BRUc7QUFHUDtBQUFBLEVBRUk7QUFBQSxFQUNBO0FBQUEsRUFDQSxTQUFBQztBQUFBLE9BQ0c7QUFJUDtBQUFBLEVBQ0ksVUFBVTtBQUFBLE9BRVA7QUFlUCxJQUFNLGVBQWU7QUFFZCxJQUFNLFNBQU4sY0FBcUIsTUFBTTtBQUFBLEVBSzlCLFlBQStCLFVBQXlCO0FBQ3BELFVBQU0sU0FBUyxRQUFRO0FBREk7QUFJM0IsU0FBSyxRQUFRLFVBQVUsSUFBSSxjQUFjLGlCQUFpQjtBQUcxRCxVQUFNLEtBQUssV0FBVztBQUN0QixVQUFNLFFBQVEsU0FBUyxTQUFTLFNBQVM7QUFDekMsUUFBSSxZQUF5QixLQUFLO0FBQ2xDLFFBQUksT0FBTztBQUNQLGtCQUFZLE9BQU8sU0FBUyxjQUFjLE9BQU87QUFDakQsZ0JBQVUsWUFBWTtBQUN0QixXQUFLLFFBQVEsWUFBWSxTQUFTO0FBQUEsSUFDdEM7QUFHQSxRQUFJLEVBQUUsT0FBTyxPQUFPLEtBQUFDLE1BQUssS0FBQUMsS0FBSSxJQUFJO0FBR2pDLFNBQUssVUFBVSxTQUFTLGNBQWMsS0FBSztBQUMzQyxTQUFLLFFBQVEsVUFBVSxJQUFJLFlBQVk7QUFDdkMsU0FBSyxRQUFRLGFBQWEsTUFBTSxFQUFFO0FBQ2xDLFFBQUksU0FBUyxRQUFXO0FBQ3BCLFdBQUssUUFBUSxNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQUs7QUFBQSxJQUN4QztBQUNBLFFBQUksV0FBVztBQUNYLGdCQUFVLFlBQVksS0FBSyxPQUFPO0FBQUEsSUFDdEMsT0FBTztBQUNILFdBQUssUUFBUSxZQUFZLEtBQUssT0FBTztBQUFBLElBQ3pDO0FBQ0EsU0FBSyxhQUFhLGFBQWEsS0FBSyxTQUFTO0FBQUEsTUFDekMsT0FBTyxFQUFFLEtBQUssR0FBRyxLQUFLLEVBQUU7QUFBQSxNQUN4QixTQUFTLFNBQVMsV0FBVztBQUFBLE1BQzdCLE9BQU8sU0FBUyxXQUFXLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSTtBQUFBLElBQ3JELENBQUM7QUFHRCxTQUFLLFVBQVUsU0FBUyxjQUFjLE9BQU87QUFDN0MsU0FBSyxRQUFRLGFBQWEsU0FBUyxjQUFjO0FBQ2pELFNBQUssUUFBUSxZQUFZLEtBQUssT0FBTztBQUdyQyxRQUFJLEtBQUssU0FBUyxJQUFJLFVBQVUsUUFBVztBQUN2QyxXQUFLLFFBQVEsS0FBSztBQUFBLElBQ3RCLFdBQVcsVUFBVSxRQUFXO0FBQzVCLGNBQVEsS0FBSyxTQUFTLElBQUk7QUFBQSxJQUM5QjtBQUdBLFNBQUssbUJBQW1CO0FBR3hCLFFBQUksQ0FBQ0MsYUFBWSxLQUFLLFNBQVMsRUFBRSxHQUFHO0FBQ2hDLFdBQUssU0FBUyxHQUFHLGlCQUFpQixTQUFTLENBQUFDLFdBQVM7QUFDaEQsWUFBSSxDQUFDLFNBQVNBLFFBQU8sS0FBSyxXQUFXLEdBQUc7QUFDcEMsZUFBSyxXQUFXLElBQUlBLE1BQUs7QUFDekIsZUFBSyxtQkFBbUI7QUFBQSxRQUM1QjtBQUFBLE1BQ0osQ0FBQztBQUFBLElBQ0wsT0FHSztBQUNELCtCQUF5QixNQUFNLEtBQUssT0FBTztBQUFBLElBQy9DO0FBR0EsUUFBSSxDQUFDLFNBQVMsTUFBTTtBQUNoQixNQUFBSCxPQUFNQSxTQUFRLE1BQU0sUUFBUSxLQUFLLElBQUksTUFBTSxDQUFDLElBQUssU0FBUztBQUMxRCxNQUFBQyxPQUFNQSxTQUFRLE1BQU0sUUFBUSxLQUFLLElBQUksTUFBTSxDQUFDLElBQUssU0FBUztBQUMxRCxZQUFNLFFBQVEsVUFBVSxTQUFTLFdBQVcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJO0FBQ2xFLFdBQUssYUFBYUQsTUFBS0MsTUFBSyxLQUFLO0FBQ2pDLFdBQUssV0FBVyxHQUFHLFVBQVUsTUFBTTtBQUMvQixhQUFLLG1CQUFtQjtBQUN4QixhQUFLLFFBQVEsS0FBSyxXQUFXO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0w7QUFBQSxFQUNKO0FBQUEsRUFsRmlCO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNULGNBQXVCO0FBQUEsRUFpRi9CLHFCQUFxQjtBQUNqQixVQUFNLFFBQVEsS0FBSztBQUNuQixRQUFJLE1BQU0sUUFBUSxLQUFLLEdBQUc7QUFDdEIsV0FBSyxRQUFRLFlBQVksR0FBRyxNQUFNLENBQUMsRUFBRSxlQUFlLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxlQUFlLENBQUM7QUFBQSxJQUN0RixPQUFPO0FBQ0gsV0FBSyxRQUFRLFlBQVksTUFBTSxlQUFlO0FBQUEsSUFDbEQ7QUFBQSxFQUNKO0FBQUEsRUFFQSxJQUFJLGNBQXlDO0FBQ3pDLFVBQU0sUUFBUSxLQUFLLFdBQVcsSUFBSTtBQUNsQyxRQUFJLE1BQU0sUUFBUSxLQUFLLEdBQUc7QUFDdEIsYUFBTyxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sR0FBRyxDQUFDO0FBQUEsSUFDNUMsT0FBTztBQUNILGFBQU8sWUFBWSxLQUFLO0FBQUEsSUFDNUI7QUFBQSxFQUNKO0FBQUEsRUFFQSxJQUFJLFlBQVksT0FBa0M7QUFDOUMsU0FBSyxXQUFXLElBQUksT0FBTyxJQUFJO0FBQUEsRUFDbkM7QUFBQSxFQUVBLFdBQWlCO0FBQ2IsVUFBTSxTQUFTLEtBQUssU0FBUztBQUM3QixRQUFJQyxhQUFZLE1BQU0sR0FBRztBQUNyQixhQUFPLFNBQVMsS0FBSyxPQUFPLENBQUM7QUFBQSxJQUNqQztBQUFBLEVBQ0o7QUFBQSxFQUVBLE1BQU0sU0FBdUIsQ0FBQyxHQUFHO0FBQzdCLFVBQU0sRUFBRSxNQUFNLFFBQUFFLFFBQU8sSUFBSSxLQUFLO0FBQzlCLFFBQUksQ0FBQyxRQUFRLENBQUNBLFNBQVE7QUFDbEIsYUFBTztBQUFBLElBQ1g7QUFDQSxXQUFPQyxPQUFNLE9BQU8sRUFBRSxLQUFLLElBQUlELE9BQU0sR0FBRyxLQUFLLElBQUlBLE9BQU0sRUFBRSxDQUFDLEVBQ3JELEtBQUssSUFBSSxFQUNULE1BQU0sR0FBRyxNQUFNO0FBQUEsRUFDeEI7QUFBQSxFQUVBLFlBQVksTUFBVztBQUVuQixVQUFNLEVBQUUsS0FBSyxTQUFTLEtBQUssUUFBUSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztBQUN6RCxVQUFNSixPQUFNLEtBQUssU0FBUyxPQUFPO0FBQ2pDLFVBQU1DLE9BQU0sS0FBSyxTQUFTLE9BQU87QUFHakMsUUFBSSxRQUFRLEtBQUs7QUFDakIsUUFBSSxDQUFDLEtBQUssYUFBYTtBQUNuQixXQUFLLGNBQWM7QUFDbkIsVUFBSSxLQUFLLFNBQVMsVUFBVSxRQUFXO0FBQ25DLGdCQUFRLEtBQUssU0FBUyxXQUFXLGFBQWEsQ0FBQ0QsTUFBS0MsSUFBRyxJQUFJQTtBQUFBLE1BQy9ELE9BQU87QUFDSCxnQkFBUSxLQUFLLFNBQVM7QUFBQSxNQUMxQjtBQUVBLFdBQUssYUFBYUQsTUFBS0MsTUFBSyxLQUFLO0FBRWpDLFdBQUssV0FBVyxHQUFHLFVBQVUsTUFBTTtBQUMvQixhQUFLLG1CQUFtQjtBQUN4QixhQUFLLFFBQVEsS0FBSyxXQUFXO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0wsT0FBTztBQUNILFdBQUssYUFBYUQsTUFBS0MsTUFBSyxLQUFLO0FBQUEsSUFDckM7QUFFQSxXQUFPO0FBQUEsRUFDWDtBQUFBLEVBRUEsYUFBYUQsTUFBYUMsTUFBYSxPQUFrQztBQUNyRSxVQUFNLE9BQU8sS0FBSyxTQUFTLFNBQVNELFFBQU8sS0FBS0MsUUFBTyxJQUFJLElBQUk7QUFDL0QsU0FBSyxXQUFXO0FBQUEsTUFDWjtBQUFBLFFBQ0ksT0FBTztBQUFBLFVBQ0gsS0FBQUQ7QUFBQSxVQUNBLEtBQUFDO0FBQUEsUUFDSjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDSjtBQUFBLE1BQ0E7QUFBQSxJQUNKO0FBQ0EsV0FBTztBQUFBLEVBQ1g7QUFBQSxFQUVBLE9BQU8sT0FBb0Q7QUFDdkQsUUFBSSxFQUFFLE9BQU8sUUFBQUcsU0FBUSxLQUFBSixNQUFLLFNBQVMsUUFBUSxJQUFJLEtBQUs7QUFDcEQsWUFBUSxTQUFTSTtBQUNqQixRQUFJLENBQUMsT0FBTztBQUNSLFlBQU0sSUFBSTtBQUFBLFFBQ047QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUNBLFFBQUksV0FBVyxjQUFjLFVBQVUsUUFBVztBQUM5QyxZQUFNLFNBQTJCLE1BQU0sUUFBUSxLQUFLLElBQUksUUFBUSxDQUFDSixRQUFPLEdBQUcsS0FBSztBQUNoRixhQUFPLGVBQWUsT0FBTyxRQUFRO0FBQUEsUUFDakMsUUFBUTtBQUFBLFFBQ1IsS0FBSztBQUFBLFFBQ0wsT0FBTyxFQUFFLE1BQU0sWUFBWSxPQUFPO0FBQUEsUUFDbEMsV0FBVyxLQUFLLFNBQVMsUUFBUTtBQUFBLE1BQ3JDLENBQUM7QUFBQSxJQUNMLE9BQU87QUFDSCxhQUFPTSxhQUFZLE9BQU8sTUFBTSxRQUFRLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxPQUFPO0FBQUEsUUFDL0QsUUFBUTtBQUFBLE1BQ1osQ0FBQztBQUFBLElBQ0w7QUFBQSxFQUNKO0FBQUEsRUFFQSxRQUFRLE9BQW1DO0FBQ3ZDLFVBQU0sU0FBUyxLQUFLLFNBQVM7QUFDN0IsUUFBSUosYUFBWSxNQUFNLEdBQUc7QUFDckIsYUFBTyxPQUFPLEtBQUssT0FBTyxLQUFLLENBQUM7QUFBQSxJQUNwQyxXQUFXSyxTQUFRLE1BQU0sR0FBRztBQUN4QixhQUFPLE9BQU8sS0FBSztBQUFBLElBQ3ZCO0FBQUEsRUFDSjtBQUNKO0FBRUEsU0FBUyxTQUFTLEdBQThCLEdBQThCO0FBQzFFLE1BQUksTUFBTSxRQUFRLENBQUMsS0FBSyxNQUFNLFFBQVEsQ0FBQyxHQUFHO0FBQ3RDLFdBQU8sRUFBRSxJQUFJLFdBQVcsTUFBTSxFQUFFLElBQUksV0FBVztBQUFBLEVBQ25ELFdBQVcsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxRQUFRLENBQUMsR0FBRztBQUMvQyxXQUFPLFlBQVksQ0FBQyxNQUFNLFlBQVksQ0FBQztBQUFBLEVBQzNDLE9BQU87QUFDSCxXQUFPO0FBQUEsRUFDWDtBQUNKO0FBRUEsU0FBUyxZQUFZLEtBQXNCO0FBQ3ZDLE1BQUksT0FBTyxRQUFRLFVBQVU7QUFDekIsVUFBTSxXQUFXLEdBQUc7QUFBQSxFQUN4QjtBQUdBLE1BQUksQ0FBQyxTQUFTLEdBQUcsRUFBRyxRQUFPO0FBQzNCLE1BQUksUUFBUSxFQUFHLFFBQU87QUFHdEIsUUFBTSxZQUFZLEtBQUssSUFBSSxHQUFHO0FBQzlCLFFBQU0sVUFBVSxZQUFZLE9BQU8sVUFBVTtBQUc3QyxRQUFNLFVBQVUsS0FBSyxNQUFNLEdBQUc7QUFHOUIsTUFBSSxLQUFLLElBQUksTUFBTSxPQUFPLElBQUksU0FBUztBQUNuQyxXQUFPO0FBQUEsRUFDWDtBQUdBLFNBQU8sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO0FBQ3pDOzs7QUNqUkE7QUFBQSxFQUNJLGdCQUFBQztBQUFBLEVBQ0EsZUFBQUM7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0EsaUJBQUFDO0FBQUEsT0FDRztBQUVQO0FBQUEsRUFDSTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUdBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0EsU0FBQUM7QUFBQSxFQUVBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQSxPQUFBQztBQUFBLEVBQ0EsT0FBQUM7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsT0FDRztBQUVQO0FBQUEsRUFDSTtBQUFBLEVBR0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLE9BU0c7QUFFUCxZQUFZLGNBQWM7QUFDMUIsWUFBWSxrQkFBa0I7QUFROUIsSUFBTSxnQkFBZ0I7QUFDdEIsSUFBTSxvQkFBb0I7QUFnSG5CLElBQU0sUUFBTixjQUFvQixNQUFNO0FBQUEsRUFtQjdCLFlBQStCLFVBQXdCO0FBQ25ELFVBQU0sU0FBUyxTQUFTO0FBREc7QUFJM0IsbUJBQWUsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUM7QUFHbkQsU0FBSyxNQUFNLFdBQVc7QUFHdEIsU0FBSyxjQUFjO0FBR25CLFNBQUssUUFBUSxVQUFVLElBQUksbUJBQW1CO0FBRzlDLFFBQUksT0FBTyxLQUFLLFNBQVMsVUFBVSxVQUFVO0FBQ3pDLFdBQUssUUFBUSxNQUFNLFFBQVEsR0FBRyxLQUFLLFNBQVMsS0FBSztBQUFBLElBQ3JEO0FBRUEsUUFBSSxLQUFLLFNBQVMsV0FBVztBQUN6QixXQUFLLFFBQVEsTUFBTSxXQUFXLEdBQUcsS0FBSyxTQUFTLFNBQVM7QUFBQSxJQUM1RDtBQUVBLFFBQUksS0FBSyxTQUFTLGNBQWM7QUFDNUIsV0FBSyxRQUFRLE1BQU0sU0FBUztBQUFBLElBQ2hDLFdBQVcsS0FBSyxTQUFTLFVBQVUsS0FBSyxTQUFTLFdBQVcsUUFBUTtBQUNoRSxXQUFLLFFBQVEsTUFBTSxTQUFTLEdBQUcsS0FBSyxTQUFTLE1BQU07QUFBQSxJQUN2RDtBQUVBLFFBQUksS0FBSyxTQUFTLE9BQU87QUFJckIsVUFBSSxLQUFLLFNBQVMsT0FBTyxrQkFBa0I7QUFDdkMsYUFBSyxRQUFRLE1BQU07QUFBQSxVQUNmO0FBQUEsVUFDQSxLQUFLLFNBQVMsTUFBTTtBQUFBLFFBQ3hCO0FBQUEsTUFDSjtBQUVBLFVBQUksS0FBSyxTQUFTLE9BQU8sa0JBQWtCO0FBQ3ZDLGFBQUssUUFBUSxNQUFNO0FBQUEsVUFDZjtBQUFBLFVBQ0EsS0FBSyxTQUFTLE1BQU07QUFBQSxRQUN4QjtBQUFBLE1BQ0o7QUFFQSxVQUFJLEtBQUssU0FBUyxPQUFPLGNBQWM7QUFDbkMsYUFBSyxRQUFRLE1BQU07QUFBQSxVQUNmO0FBQUEsVUFDQSxLQUFLLFNBQVMsTUFBTTtBQUFBLFFBQ3hCO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFHQSxTQUFLLGlCQUFpQixTQUFTLGNBQWMsS0FBSztBQUNsRCxTQUFLLGVBQWUsS0FBSyxLQUFLO0FBQzlCLFNBQUssZUFBZSxNQUFNLFFBQVE7QUFDbEMsU0FBSyxlQUFlLE1BQU0sU0FBUztBQUNuQyxTQUFLLFFBQVEsWUFBWSxLQUFLLGNBQWM7QUFHNUMsU0FBSyxlQUFlLEtBQUssa0JBQWtCLEtBQUssUUFBUTtBQUFBLEVBQzVEO0FBQUEsRUFuRmlCO0FBQUEsRUFDVCxXQUE2QixDQUFDO0FBQUEsRUFDOUIsaUJBQWlELENBQUM7QUFBQSxFQUNsRCxlQUF1QyxDQUFDO0FBQUEsRUFFL0I7QUFBQSxFQUNULFFBQXdCO0FBQUEsRUFDeEI7QUFBQSxFQUVBO0FBQUEsRUFDQSxhQUE2QixDQUFDO0FBQUEsRUFDOUIsZUFBNEIsQ0FBQztBQUFBLEVBRTdCLFFBQXNFO0FBQUEsSUFDMUUsU0FBUztBQUFBLElBQ1QsU0FBUyxDQUFDO0FBQUEsRUFDZDtBQUFBO0FBQUEsRUFzRUEsT0FBTyxPQUFpQixDQUFDLEdBQUc7QUFDeEIsVUFBTSxTQUFTLEtBQUssbUJBQW1CLEVBQUUsSUFBSSxDQUFBQyxZQUFVQSxRQUFPLFNBQVM7QUFFdkUsVUFBTSxTQUFTLEtBQUssSUFBSSxTQUFPO0FBQzNCLGFBQU8sT0FBTyxJQUFJLE9BQUssS0FBSyxNQUFNLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQztBQUFBLElBQ3JELENBQUM7QUFDRCxXQUFPQyxjQUFhLFFBQVEsUUFBUSxFQUFFLFFBQVEsS0FBSyxDQUFDO0FBQUEsRUFDeEQ7QUFBQTtBQUFBO0FBQUEsRUFJQSxNQUFNLFVBQVU7QUFFWixVQUFNLFFBQVEsS0FBSyxTQUFTO0FBQzVCLFVBQU0sU0FBUyxNQUFNLGVBQWUsS0FBSyxhQUFjLENBQUMsRUFBRSxRQUFRLEtBQUssTUFBTSxDQUFDLENBQUM7QUFJL0UsVUFBTSxjQUFjLEtBQUssU0FBUyxVQUM1QixLQUFLLFNBQVMsVUFDZCxPQUFPLElBQUksT0FBSyxFQUFFLE1BQU07QUFDOUIsU0FBSyxXQUFXLGVBQWUsV0FBVztBQUMxQyxTQUFLLGlCQUFpQixLQUFLLFNBQVM7QUFBQSxNQUNoQyxDQUFDLEtBQUssUUFBUTtBQUNWLFlBQUksSUFBSSxXQUFXLElBQUk7QUFDdkIsZUFBTztBQUFBLE1BQ1g7QUFBQSxNQUNBLENBQUM7QUFBQSxJQUNMO0FBS0EsU0FBSyxTQUNBLE9BQU8sT0FBSyxFQUFFLFNBQVMsU0FBUyxFQUNoQyxRQUFRLENBQUFELFlBQVU7QUFDZixZQUFNLE9BQU8sT0FBTyxLQUFLLE9BQUssRUFBRSxXQUFXQSxRQUFPLFNBQVM7QUFDM0QsVUFBSSxNQUFNO0FBQ04sYUFBSyxhQUFhQSxRQUFPLFdBQVcsSUFBSSxLQUFLO0FBQUEsTUFDakQ7QUFBQSxJQUNKLENBQUM7QUFHTCxTQUFLLGtCQUFrQixFQUFFLFFBQVEsT0FBSztBQUNsQyxZQUFNLFNBQVMsRUFBRTtBQUNqQixVQUFJLE1BQU0sUUFBUSxNQUFNLEdBQUc7QUFFdkIsY0FBTSxXQUFXLE9BQU8sQ0FBQztBQUN6QixjQUFNLFVBQ0YsT0FBTyxhQUFhLFlBQ2QsWUFDQSxPQUFPLGFBQWEsV0FDbEIsV0FDQTtBQUNaLFlBQUksU0FBUztBQUNULGVBQUssYUFBYSxFQUFFLFdBQVcsSUFBSTtBQUFBLFFBQ3ZDO0FBQUEsTUFDSixXQUFXLE9BQU8sV0FBVyxXQUFXO0FBQ3BDLGFBQUssYUFBYSxFQUFFLFdBQVcsSUFBSTtBQUFBLE1BQ3ZDLFdBQVcsT0FBTyxXQUFXLFVBQVU7QUFDbkMsYUFBSyxhQUFhLEVBQUUsV0FBVyxJQUFJO0FBQUEsTUFDdkM7QUFBQSxJQUNKLENBQUM7QUFHRCxVQUFNLGFBQXVCLEtBQUssU0FBUyxJQUFJLENBQUFBLFlBQVU7QUFDckQsWUFBTSxJQUFJLEtBQUssYUFBYUEsUUFBTyxXQUFXO0FBQzlDLGFBQU8sS0FBSyxnQkFBZ0JBLFFBQU8sYUFBYSxDQUFDO0FBQUEsSUFDckQsQ0FBQztBQUNELFNBQUssYUFBYSxhQUFhO0FBRy9CLFNBQUssUUFBUSxXQUFXLEtBQUssZ0JBQWdCLEtBQUssWUFBWTtBQUFBLEVBQ2xFO0FBQUE7QUFBQTtBQUFBLEVBSUEsTUFBTSxTQUF1QixDQUFDLEdBQUc7QUFDN0IsVUFBTSxjQUFpRCxDQUFDO0FBQ3hELFVBQU0sVUFBb0IsQ0FBQztBQUMzQixRQUFJLGdCQUFnQjtBQUtwQixlQUFXQSxXQUFVLEtBQUssbUJBQW1CLEdBQUc7QUFDNUMsVUFBSUEsUUFBTyxTQUFTLGFBQWE7QUFDN0IsY0FBTSxPQUFPLG9CQUFvQkEsT0FBTTtBQUN2QyxvQkFBWSxLQUFLLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQztBQUM3Qix3QkFBZ0I7QUFBQSxNQUNwQixXQUFXQSxRQUFPLFNBQVMsVUFBVTtBQUNqQyxvQkFBWUEsUUFBTyxTQUFTLElBQUlBLFFBQU87QUFDdkMsZ0JBQVEsS0FBS0EsUUFBTyxTQUFTO0FBQUEsTUFDakM7QUFBQSxJQUNKO0FBR0EsUUFBSSxRQUFRRSxPQUFNLEtBQUssS0FBSyxTQUFTLElBQUksRUFBRTtBQUFBLE1BQ3ZDLE9BQU8sS0FBSyxXQUFXLEVBQUUsU0FBUyxjQUFjO0FBQUEsSUFDcEQ7QUFHQSxRQUFJLGlCQUFpQixRQUFRLFNBQVMsR0FBRztBQUNyQyxZQUFNLFFBQVEsT0FBTztBQUFBLElBQ3pCO0FBR0EsWUFBUSxNQUFNLE1BQU0sR0FBRyxNQUFNO0FBRzdCLFdBQU8sS0FBSyxLQUFLLFlBQVksRUFBRSxRQUFRLGdCQUFjO0FBQ2pELFlBQU0sTUFBTSxLQUFLLGVBQWUsVUFBVSxLQUFLLENBQUM7QUFDaEQsVUFBSSxJQUFJLFNBQVMsV0FBVztBQUN4QixjQUFNLFlBQVksSUFBSSxTQUFTO0FBQy9CLGNBQU1DLFVBQVMsS0FBSyxhQUFhLFVBQVU7QUFDM0MsY0FBTSxhQUFhLGlCQUFpQixZQUFZQSxTQUFRLEtBQUs7QUFDN0QsWUFBSSxZQUFZO0FBQ1osY0FBSSxXQUFXO0FBQ1gsa0JBQU0sT0FBTyxVQUFVO0FBQUEsVUFDM0IsT0FBTztBQUNILG9CQUFRLE1BQU0sTUFBTSxVQUFVO0FBQUEsVUFDbEM7QUFBQSxRQUNKO0FBQUEsTUFDSjtBQUFBLElBQ0osQ0FBQztBQUdELFFBQUksS0FBSyxXQUFXLFNBQVMsR0FBRztBQUM1QixXQUFLLFdBQVcsUUFBUSxVQUFRO0FBQzVCLGNBQU0sTUFBTSxLQUFLLGVBQWUsS0FBSyxLQUFLLEtBQUssQ0FBQztBQUNoRCxZQUFJLElBQUksU0FBUyxXQUFXO0FBQ3hCLGtCQUFRLE1BQU0sUUFBUSxLQUFLLFNBQVMsUUFBUSxJQUFJLEtBQUssS0FBSyxJQUFJLEtBQUssS0FBSyxLQUFLLENBQUM7QUFBQSxRQUNsRjtBQUFBLE1BQ0osQ0FBQztBQUFBLElBQ0w7QUFFQSxXQUFPO0FBQUEsRUFDWDtBQUFBO0FBQUEsRUFHQSxZQUFZLE1BQVc7QUFDbkIsU0FBSyxRQUFRQyxlQUFjLElBQUk7QUFDL0IsV0FBTztBQUFBLEVBQ1g7QUFBQTtBQUFBLEVBR0EsU0FBUztBQUNMLFNBQUssV0FBVyxJQUFJO0FBQ3BCLFdBQU87QUFBQSxFQUNYO0FBQUEsRUFFUSxhQUFhLFNBQVMsWUFBWTtBQUN0QyxRQUFJLENBQUMsS0FBSyxPQUFPO0FBQ2I7QUFBQSxJQUNKO0FBR0EsVUFBTSxVQUFpQixDQUFDO0FBQ3hCLGFBQVMsSUFBSSxHQUFHLElBQUksS0FBSyxNQUFNLFNBQVMsS0FBSztBQUN6QyxZQUFNLE1BQVcsQ0FBQztBQUNsQixXQUFLLFNBQVMsUUFBUSxDQUFDLEVBQUUsYUFBYSxRQUFBSixRQUFPLE1BQU07QUFDL0MsWUFBSSxNQUFNLFFBQVFBLE9BQU0sR0FBRztBQUN2QixnQkFBTSxRQUFRLElBQUlBLFFBQU87QUFDekIsY0FBSSxXQUFXLElBQUlBLFFBQU8sS0FBSztBQUFBLFFBQ25DLFdBQVcsT0FBT0EsWUFBVyxhQUFhLE9BQU9BLFlBQVcsVUFBVTtBQUNsRSxjQUFJLFdBQVcsSUFBSUE7QUFBQSxRQUN2QixPQUFPO0FBQ0gsY0FBSSxXQUFXLElBQUksS0FBSyxNQUFNLFFBQVEsV0FBVyxFQUFFLENBQUM7QUFBQSxRQUN4RDtBQUFBLE1BQ0osQ0FBQztBQUVELGNBQVEsS0FBSyxHQUFHO0FBQUEsSUFDcEI7QUFFQSxTQUFLLE1BQU0sY0FBYyxXQUFXLE9BQU87QUFDM0MsUUFBSSxLQUFLLE1BQU0sVUFBVSxpQkFBaUIsS0FBSyxTQUFTLFdBQVcsUUFBVztBQUMxRSxXQUFLLE1BQU0sY0FBYyxhQUFhLFlBQVk7QUFBQSxJQUN0RCxXQUNJLENBQUMsS0FBSyxTQUFTLGlCQUNkLEtBQUssU0FBUyxXQUFXLFVBQVUsS0FBSyxTQUFTLFdBQVcsU0FDL0Q7QUFDRSxXQUFLLFFBQVEsTUFBTSxTQUFTLEdBQUcsaUJBQWlCO0FBQUEsSUFDcEQ7QUFBQSxFQUNKLENBQUM7QUFBQSxFQUVPLGtCQUFrQixTQUFvQztBQUMxRCxVQUFNLHFCQUNGLE9BQU8sUUFBUSxrQkFBa0IsV0FBVyxTQUFZLFFBQVE7QUFDcEUsVUFBTSxjQUFjLFFBQVEsV0FBVztBQUN2QyxVQUFNLG9CQUFvQixvQkFBb0IsT0FBTztBQUdyRCxVQUFNLFlBQVksWUFBWSxXQUFXO0FBQUEsTUFDckMsV0FBVyxLQUFLLFNBQVMsT0FBTztBQUFBLE1BQ2hDLGlCQUNJLEtBQUssU0FBUyxPQUFPLHFCQUFxQixLQUFLLFNBQVMsT0FBTztBQUFBLE1BQ25FLGVBQWUsS0FBSyxTQUFTLE9BQU87QUFBQSxNQUVwQyxZQUFZLEtBQUssU0FBUyxPQUFPO0FBQUEsTUFDakMsa0JBQ0ksS0FBSyxTQUFTLE9BQU8sc0JBQXNCLEtBQUssU0FBUyxPQUFPO0FBQUEsTUFDcEUsZ0JBQ0ksS0FBSyxTQUFTLE9BQU8sb0JBQW9CLEtBQUssU0FBUyxPQUFPO0FBQUEsTUFFbEUsU0FBUyxLQUFLLFNBQVMsT0FBTyxXQUFXO0FBQUEsTUFFekMsYUFBYSxLQUFLLFNBQVMsT0FBTztBQUFBLE1BQ2xDLGNBQWMsS0FBSyxTQUFTLE9BQU87QUFBQSxNQUVuQyw0QkFBNEIsS0FBSyxTQUFTLE9BQU87QUFBQSxJQUNyRCxDQUFDO0FBQ0QsVUFBTSxZQUFZLEtBQUssU0FBUyxXQUFXLFNBQVMsZUFBZTtBQUduRSxXQUFPO0FBQUE7QUFBQSxNQUVILFlBQVksQ0FBQyxDQUFDLFFBQVE7QUFBQSxNQUN0Qix3QkFDSSxRQUFRLFlBQVksY0FBYyxVQUNsQyxRQUFRLFlBQVksY0FBYztBQUFBLE1BQ3RDLDRCQUE0QixRQUFRLFlBQVk7QUFBQSxNQUNoRCxvQkFDSSxPQUFPLFFBQVEsWUFBWSxjQUFjLFdBQ25DLFFBQVEsV0FBVyxZQUNuQjtBQUFBLE1BQ1YsYUFBYTtBQUFBLE1BQ2IsY0FBYztBQUFBLE1BQ2QsV0FBVyxRQUFRO0FBQUEsTUFDbkI7QUFBQSxNQUNBLFlBQVksQ0FBQztBQUFBLE1BQ2IsU0FBUyxDQUFDO0FBQUEsTUFDVixjQUFjO0FBQUEsTUFDZCxtQkFBbUI7QUFBQSxNQUNuQix5QkFBeUI7QUFBQSxNQUN6QixPQUFPO0FBQUEsTUFDUCxpQkFBaUIsTUFBTTtBQUVuQixhQUFLLGVBQWUsS0FBSyxPQUFPLGVBQWUsS0FBSyxDQUFDO0FBR3JELGFBQUssYUFBYTtBQUFBLE1BQ3RCO0FBQUEsTUFDQSxlQUFlLE1BQU07QUFDakIsWUFBSSxLQUFLLE9BQU87QUFFWixnQkFBTSxZQUFZLEtBQUssTUFDbEIsZUFBZSxFQUNmLE9BQU8sU0FBTyxJQUFJLElBQUksRUFDdEIsSUFBSSxVQUFRLEVBQUUsT0FBTyxJQUFJLE9BQU8sTUFBTSxJQUFJLEtBQUssRUFBRTtBQUN0RCxlQUFLLGFBQWE7QUFHbEIsZUFBSyxhQUFhO0FBQUEsUUFDdEI7QUFBQSxNQUNKO0FBQUEsTUFDQSxvQkFBb0IsV0FBUztBQUN6QixZQUFJLHNCQUFzQixVQUFhSyxhQUFZLEtBQUssU0FBUyxFQUFFLEdBQUc7QUFDbEUsY0FBSSxNQUFNLGVBQWU7QUFFckIsa0JBQU0sYUFBYSxNQUFNLGNBQ3BCLElBQUksT0FBSyxFQUFFLFFBQVEsRUFDbkIsT0FBTyxPQUFLLE1BQU0sSUFBSTtBQUczQixpQkFBSyxTQUFTLEdBQUcsT0FBTyxLQUFLLE9BQU8sVUFBVSxDQUFDO0FBQUEsVUFDbkQ7QUFBQSxRQUNKO0FBQUEsTUFDSjtBQUFBLE1BQ0EsaUJBQWlCLFdBQVM7QUFDdEIsWUFBSSxlQUFlQSxhQUFZLEtBQUssU0FBUyxFQUFFLEdBQUc7QUFDOUMsZ0JBQU0sV0FBVyxNQUFNO0FBQ3ZCLGNBQ0ksYUFBYSxVQUNiLGFBQWEsUUFDYixhQUFhLEtBQUssYUFDcEI7QUFDRSxpQkFBSyxjQUFjO0FBQ25CLGlCQUFLLFNBQVMsR0FBRyxPQUFPLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQUEsVUFDbkQ7QUFBQSxRQUNKO0FBQUEsTUFDSjtBQUFBLE1BQ0EsZ0JBQWdCLE1BQU07QUFDbEIsWUFBSSxlQUFlQSxhQUFZLEtBQUssU0FBUyxFQUFFLEdBQUc7QUFDOUMsZUFBSyxjQUFjO0FBQ25CLGVBQUssU0FBUyxHQUFHLE9BQU8sS0FBSyxPQUFPLENBQUM7QUFBQSxRQUN6QztBQUFBLE1BQ0o7QUFBQSxNQUNBLGFBQWEsTUFBTTtBQUVmLGFBQUssVUFBVTtBQUFBLE1BQ25CO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUVRLG9CQUE2QztBQUNqRCxXQUFPLEtBQUssU0FBUyxPQUFPLE9BQUssRUFBRSxTQUFTLFNBQVM7QUFBQSxFQUN6RDtBQUFBLEVBRVEscUJBQTRFO0FBQ2hGLFdBQU8sS0FBSyxTQUFTLE9BQU8sT0FBSyxFQUFFLFNBQVMsWUFBWSxFQUFFLFNBQVMsV0FBVztBQUFBLEVBQ2xGO0FBQUEsRUFFUSxnQkFBZ0IsYUFBcUIsTUFBc0I7QUFDL0QsVUFBTUwsVUFBUyxLQUFLLGVBQWUsV0FBVyxLQUFLLENBQUM7QUFHcEQsVUFBTSxRQUFRQSxRQUFPLFVBQVUsU0FBUyxXQUFXLFVBQVU7QUFDN0QsVUFBTSxrQkFBa0JBLFFBQU87QUFHL0IsVUFBTSxZQUFZLGlCQUFpQixNQUFNQSxRQUFPLE1BQU07QUFHdEQsVUFBTSxXQUFXLEtBQUssU0FBUyxZQUFZLFNBQVNBLFFBQU8sYUFBYTtBQUN4RSxVQUFNLGFBQWEsS0FBSyxTQUFTLGNBQWMsU0FBU0EsUUFBTyxlQUFlO0FBRzlFLFVBQU0sWUFBWUEsUUFBTyxjQUFjO0FBR3ZDLFVBQU0sV0FBV0EsUUFBTztBQUN4QixVQUFNLFdBQVdBLFFBQU87QUFHeEIsVUFBTSxhQUFhQSxRQUFPO0FBQzFCLFVBQU0sbUJBQ0YsS0FBSyxTQUFTLGtCQUFrQixVQUFVQSxRQUFPLHVCQUF1QjtBQUc1RSxVQUFNLFdBQVdBLFFBQU87QUFDeEIsVUFBTSxpQkFBaUJBLFFBQU87QUFHOUIsVUFBTSxPQUFPQSxRQUFPO0FBSXBCLFVBQU0sb0JBQW9CLENBQUMsU0FBa0IsWUFBcUI7QUFDOUQsYUFBTztBQUFBLElBQ1g7QUFHQSxVQUFNLFNBQWlCO0FBQUEsTUFDbkIsT0FBTztBQUFBLE1BQ1AsWUFBWUEsUUFBTyxTQUFTO0FBQUEsTUFDNUIsYUFBYSxjQUFjLGVBQWU7QUFBQSxNQUMxQyxXQUFXLEVBQUUsV0FBVyxNQUFNO0FBQUEsTUFDOUIsWUFBWUEsUUFBTyxTQUFTLFlBQVksb0JBQW9CO0FBQUEsTUFDNUQsUUFBUSxDQUFDLGFBQWEsUUFBUSxvQkFBb0IsSUFBSTtBQUFBLE1BQ3REO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBLGdCQUFnQixLQUFLLFNBQVMsY0FBYztBQUFBO0FBQUEsTUFFNUMsaUJBQWlCO0FBQUEsTUFDakIsZ0JBQWdCLFlBQVU7QUFFdEIsY0FBTSxRQUFRLE9BQU87QUFDckIsWUFBSSxhQUFhLFVBQVUsUUFBUSxVQUFVLFFBQVc7QUFDcEQsaUJBQU8sVUFBVSxLQUFLO0FBQUEsUUFDMUI7QUFDQSxlQUFPO0FBQUEsTUFDWDtBQUFBLElBQ0o7QUFJQSxVQUFNLFFBQVFBLFFBQU87QUFDckIsUUFBSSxPQUFPO0FBQ1AsYUFBTyxRQUFRO0FBQUEsSUFDbkIsV0FBVyxTQUFTLFVBQWEsU0FBUyxNQUFNO0FBQzVDLGFBQU8sT0FBTztBQUFBLElBQ2xCO0FBRUEsV0FBTztBQUFBLEVBQ1g7QUFBQSxFQUVRLFlBQVk7QUFDaEIsUUFBSSxDQUFDLEtBQUssT0FBTztBQUNiO0FBQUEsSUFDSjtBQUVBLFVBQU0sVUFBVSxLQUFLLE1BQU0sV0FBVztBQUN0QyxRQUFJLFNBQVM7QUFDVCxjQUFRLFFBQVEsT0FBTUEsWUFBVTtBQUM1QixjQUFNLFFBQVFBLFFBQU8sU0FBUztBQUM5QixjQUFNLGlCQUFpQixNQUFNLEtBQUssTUFBTyx3QkFBd0IsS0FBSztBQUN0RSxjQUFNLE1BQU0sS0FBSyxlQUFlLEtBQUssS0FBSyxDQUFDO0FBTzNDLFlBQ0ksa0JBQ0EsT0FBTyxlQUFlLG1CQUFtQixjQUN6QyxJQUFJLFNBQVMsV0FDZjtBQUNFLHlCQUFlLGlCQUFpQixNQUFNO0FBQUEsUUFDMUM7QUFBQSxNQUNKLENBQUM7QUFBQSxJQUNMO0FBQUEsRUFDSjtBQUFBO0FBQUEsRUFHQSxXQUFXO0FBQ1AsUUFBSUssYUFBWSxLQUFLLFNBQVMsRUFBRSxHQUFHO0FBQy9CLFdBQUssU0FBUyxHQUFHLFNBQVMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQUEsSUFDN0M7QUFBQSxFQUNKO0FBQ0o7QUFFQSxJQUFNLGlCQUFpQixDQUFDLFlBQXNEO0FBQzFFLE1BQUksY0FBYztBQUNsQixRQUFNLHdCQUF3QixNQUFNO0FBQ2hDLFdBQU8sT0FBTyxhQUFhO0FBQUEsRUFDL0I7QUFFQSxTQUFPLFFBQVEsSUFBSSxTQUFPO0FBQ3RCLFFBQUksT0FBTyxRQUFRLFVBQVU7QUFFekIsYUFBTztBQUFBLFFBQ0gsYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBLFFBQ1gsUUFBUTtBQUFBLFFBQ1IsTUFBTTtBQUFBLE1BQ1Y7QUFBQSxJQUNKLFdBQVcsT0FBTyxRQUFRLFlBQVksUUFBUSxNQUFNO0FBR2hELFVBQUksT0FBTyxJQUFJLFdBQVcsVUFBVTtBQUNoQyxlQUFPO0FBQUEsVUFDSCxHQUFHO0FBQUEsVUFDSCxhQUFhLElBQUk7QUFBQSxVQUNqQixXQUFXLElBQUk7QUFBQSxVQUNmLE1BQU07QUFBQSxRQUNWO0FBQUEsTUFDSixXQUFXLE9BQU8sSUFBSSxXQUFXLFVBQVU7QUFJdkMsZUFBTztBQUFBLFVBQ0gsR0FBRztBQUFBLFVBQ0gsYUFBYSxzQkFBc0I7QUFBQSxVQUNuQyxRQUFRLElBQUk7QUFBQSxVQUNaLE1BQU07QUFBQSxRQUNWO0FBQUEsTUFDSixXQUFXLE9BQU8sSUFBSSxXQUFXLFdBQVc7QUFJeEMsZUFBTztBQUFBLFVBQ0gsR0FBRztBQUFBLFVBQ0gsYUFBYSxzQkFBc0I7QUFBQSxVQUNuQyxRQUFRLElBQUk7QUFBQSxVQUNaLE1BQU07QUFBQSxRQUNWO0FBQUEsTUFDSixXQUFXLE1BQU0sUUFBUSxJQUFJLE1BQU0sR0FBRztBQUVsQyxZQUFJLElBQUksT0FBTyxXQUFXLEdBQUc7QUFDekIsZ0JBQU0sSUFBSSxNQUFNLHFDQUFxQztBQUFBLFFBQ3pEO0FBQ0EsZUFBTztBQUFBLFVBQ0gsR0FBRztBQUFBLFVBQ0gsYUFBYSxzQkFBc0I7QUFBQSxVQUNuQyxRQUFRLElBQUk7QUFBQSxVQUNaLE1BQU07QUFBQSxRQUNWO0FBQUEsTUFDSixXQUFXLE9BQU8sSUFBSSxXQUFXLFVBQVU7QUFDdkMsY0FBTSxNQUFNLE9BQU8sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO0FBQ3JDLGNBQU0sZUFBZSxJQUFJLE9BQU8sR0FBRztBQUNuQyxlQUFPO0FBQUEsVUFDSCxHQUFHO0FBQUEsVUFDSCxhQUFhLEdBQUcsR0FBRyxJQUFJLFlBQVk7QUFBQSxVQUNuQyxXQUFXO0FBQUEsVUFDWCxVQUFVO0FBQUEsVUFDVixlQUFlLENBQUMsWUFBWTtBQUFBLFVBQzVCLE1BQU07QUFBQSxRQUNWO0FBQUEsTUFDSixPQUFPO0FBQ0gsY0FBTSxJQUFJLE1BQU0sOEJBQThCLE9BQU8sSUFBSSxNQUFNO0FBQUEsTUFDbkU7QUFBQSxJQUNKLE9BQU87QUFDSCxZQUFNLElBQUksTUFBTSw4QkFBOEIsR0FBRyxFQUFFO0FBQUEsSUFDdkQ7QUFBQSxFQUNKLENBQUM7QUFDTDtBQUVBLElBQU0sZ0JBQWdCLENBQUMsVUFBMEU7QUFDN0YsTUFBSSxDQUFDLE9BQU87QUFDUixXQUFPO0FBQUEsRUFDWDtBQUNBLFNBQU8sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUM3QjtBQUVBLElBQU0sc0JBQXNCLENBQUMsWUFBcUU7QUFDOUYsTUFBSSxRQUFRLFdBQVcsU0FBUztBQUM1QixXQUFPO0FBQUEsRUFDWDtBQUVBLFFBQU0sYUFBYSxRQUFRLFVBQVU7QUFDckMsTUFBSSxXQUFXLFdBQVcsU0FBUyxHQUFHO0FBQ2xDLFdBQU87QUFBQSxNQUNILE1BQU07QUFBQSxNQUNOLFlBQVksUUFBUSxXQUFXO0FBQUEsTUFDL0Isc0JBQXNCLFFBQVEsV0FBVztBQUFBLElBQzdDO0FBQUEsRUFDSixXQUFXLFdBQVcsV0FBVyxXQUFXLEdBQUc7QUFDM0MsV0FBTztBQUFBLE1BQ0gsTUFBTTtBQUFBLE1BQ04sV0FBVztBQUFBLE1BQ1gsWUFBWSxRQUFRLFdBQVc7QUFBQSxJQUNuQztBQUFBLEVBQ0osT0FBTztBQUNILFVBQU0sSUFBSSxNQUFNLDRCQUE0QixRQUFRLE1BQU07QUFBQSxFQUM5RDtBQUNKO0FBRUEsSUFBTSxzQkFBc0IsQ0FBQyxTQUF5QjtBQUVsRCxVQUFRLE1BQU07QUFBQSxJQUNWLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFDRCxhQUFPO0FBQUEsSUFDWCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQ0QsYUFBTztBQUFBLElBQ1gsS0FBSztBQUNELGFBQU87QUFBQSxJQUNYO0FBQ0ksYUFBTztBQUFBLEVBQ2Y7QUFDSjtBQUVBLElBQU0sbUJBQW1CLENBQUMsTUFBYyxjQUF1QjtBQUMzRCxVQUFRLE1BQU07QUFBQSxJQUNWLEtBQUs7QUFDRCxhQUFnQixnQkFBTyxhQUFhLEdBQUc7QUFBQSxJQUMzQyxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQ0QsYUFBZ0IsZ0JBQU8sYUFBYSxPQUFPO0FBQUEsSUFDL0MsS0FBSztBQUNELGFBQWdCLGdCQUFPLGFBQWEsT0FBTztBQUFBLElBQy9DLEtBQUs7QUFFRCxhQUFvQix3QkFBVyxhQUFhLFVBQVU7QUFBQSxJQUMxRCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBRUQsYUFBb0Isd0JBQVcsYUFBYSxtQkFBbUI7QUFBQSxJQUNuRSxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTDtBQUNJLGFBQU87QUFBQSxFQUNmO0FBQ0o7QUFXQSxJQUFNLG1CQUFtQixDQUNyQixPQUNBLFFBQ0EsVUFDdUI7QUFDdkIsTUFBSSxzQkFBc0IsTUFBTSxHQUFHO0FBQy9CLFVBQU0sV0FBVyxPQUFPLGFBQWEsUUFBUSxNQUFNO0FBQ25ELFVBQU0sY0FBYyxPQUFPLFlBQ3JCLElBQUksQ0FBQyxNQUFXO0FBQ2QsYUFBTyxpQkFBaUIsT0FBTyxHQUFzQixLQUFLO0FBQUEsSUFDOUQsQ0FBQyxFQUNBLE9BQU8sT0FBSyxNQUFNLE1BQVM7QUFDaEMsUUFBSSxlQUFlLFlBQVksU0FBUyxHQUFHO0FBQ3ZDLGFBQU8sU0FBUyxHQUFHLFdBQVc7QUFBQSxJQUNsQztBQUFBLEVBQ0osV0FBVyxhQUFhLE1BQU0sR0FBRztBQUM3QixXQUFPLGlCQUFpQixPQUFPLE9BQU8sTUFBTSxPQUFPLFFBQVEsUUFBVyxJQUFJO0FBQUEsRUFDOUUsV0FBVyxlQUFlLE1BQU0sR0FBRztBQUMvQixXQUFPLGlCQUFpQixPQUFPLE9BQU8sTUFBTSxPQUFPLE1BQU07QUFBQSxFQUM3RCxXQUFXLGNBQWMsTUFBTSxHQUFHO0FBQzlCLFVBQU0sT0FBTyxPQUFPLGNBQ2QsSUFBSSxDQUFDLE1BQVc7QUFDZCxhQUFPLGlCQUFpQixPQUFPLEdBQUcsS0FBSztBQUFBLElBQzNDLENBQUMsRUFDQSxPQUFPLE9BQUssTUFBTSxNQUFTO0FBQ2hDLFFBQUksUUFBUSxLQUFLLFNBQVMsR0FBRztBQUN6QixhQUFPLElBQUksR0FBRyxJQUFJO0FBQUEsSUFDdEI7QUFBQSxFQUNKLFdBQVcsYUFBYSxNQUFNLEdBQUc7QUFDN0IsV0FBTyxpQkFBaUIsT0FBTyxPQUFPLE1BQU0sT0FBTyxVQUFVLE9BQU8sVUFBVSxNQUFTO0FBQUEsRUFDM0YsV0FBVyxZQUFZLE1BQU0sR0FBRztBQUM1QixZQUFRLEtBQUssNEJBQTRCO0FBQUEsRUFDN0M7QUFDSjtBQUVPLElBQU0sbUJBQW1CLENBQzVCLE9BQ0EsTUFpQkEsUUFDQSxXQUErQyxRQUMvQyxhQUFzQixVQUNDO0FBQ3ZCLFVBQVEsTUFBTTtBQUFBLElBQ1YsS0FBSztBQUNELGFBQU8sR0FBRyxPQUFPLFFBQVEsTUFBTSxDQUFDO0FBQUEsSUFDcEMsS0FBSztBQUNELGFBQU8sSUFBSSxPQUFPLFFBQVEsTUFBTSxDQUFDO0FBQUEsSUFDckMsS0FBSztBQUNELFVBQUksWUFBWTtBQUNaLGVBQU8sTUFBTSxPQUFPLEtBQUssQ0FBQyxVQUFVLFFBQVEsTUFBTSxTQUFTLEdBQUcsQ0FBQztBQUFBLE1BQ25FLE9BQU87QUFDSCxlQUFPLFNBQVMsT0FBTyxPQUFPLE1BQU0sQ0FBQztBQUFBLE1BQ3pDO0FBQUEsSUFDSixLQUFLO0FBQ0QsYUFBTyxJQUFJLFNBQVMsT0FBTyxPQUFPLE1BQU0sQ0FBQyxDQUFDO0FBQUEsSUFDOUMsS0FBSztBQUNELGFBQU8sT0FBTyxLQUFLO0FBQUEsSUFDdkIsS0FBSztBQUNELGFBQU8sSUFBSSxPQUFPLEtBQUssQ0FBQztBQUFBLElBQzVCLEtBQUs7QUFDRCxhQUFPLE9BQU8sT0FBTyxPQUFPLE1BQU0sQ0FBQztBQUFBLElBQ3ZDLEtBQUs7QUFDRCxhQUFPLE9BQU8sT0FBTyxPQUFPLE1BQU0sQ0FBQztBQUFBLElBQ3ZDLEtBQUs7QUFDRCxhQUFPLEdBQUcsT0FBTyxRQUFRLE1BQU0sQ0FBQztBQUFBLElBQ3BDLEtBQUs7QUFDRCxhQUFPLEdBQUcsT0FBTyxRQUFRLE1BQU0sQ0FBQztBQUFBLElBQ3BDLEtBQUs7QUFDRCxhQUFPLElBQUksT0FBTyxRQUFRLE1BQU0sQ0FBQztBQUFBLElBQ3JDLEtBQUs7QUFDRCxhQUFPLElBQUksT0FBTyxRQUFRLE1BQU0sQ0FBQztBQUFBLElBQ3JDLEtBQUs7QUFDRCxVQUFJLGFBQWEsVUFBYSxhQUFhLE1BQU07QUFDN0MsZUFBUSxJQUFJLE9BQU8sUUFBUSxNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sUUFBUSxRQUFRLENBQUM7QUFBQSxNQUNyRTtBQUNBO0FBQUEsSUFDSjtBQUNJLGNBQVEsS0FBSyw0QkFBNEIsSUFBSSxFQUFFO0FBQUEsRUFDdkQ7QUFDQSxTQUFPO0FBQ1g7QUFFQSxJQUFNLHNCQUFzQixDQUN4QixNQUM0QztBQUM1QyxRQUFNLFVBQVUsRUFBRTtBQUVsQixRQUFNLFdBQVcsTUFBTTtBQUNuQixRQUFJLEVBQUUsY0FBYyxTQUFTLEdBQUc7QUFDNUIsYUFBTyxFQUFFLGNBQWMsQ0FBQztBQUFBLElBQzVCO0FBQ0EsVUFBTSxJQUFJLE1BQU0sd0JBQXdCLE9BQU8saUNBQWlDO0FBQUEsRUFDcEY7QUFFQSxRQUFNLFlBQVksTUFBTTtBQUNwQixRQUFJLEVBQUUsY0FBYyxTQUFTLEdBQUc7QUFDNUIsYUFBTyxFQUFFLGNBQWMsQ0FBQztBQUFBLElBQzVCO0FBQ0EsVUFBTSxJQUFJLE1BQU0sd0JBQXdCLE9BQU8sa0NBQWtDO0FBQUEsRUFDckY7QUFFQSxRQUFNLElBQUksQ0FBQyxRQUFrRTtBQUN6RSxXQUFPLENBQUMsRUFBRSxhQUFhLEdBQUc7QUFBQSxFQUM5QjtBQUVBLFVBQVEsU0FBUztBQUFBLElBQ2IsS0FBSztBQUNELGFBQU8sRUFBRSxNQUFNLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDOUIsS0FBSztBQUNELGFBQU8sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDNUIsS0FBSztBQUNELGFBQU8sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDNUIsS0FBSztBQUNELGFBQU8sRUFBRSxPQUFPLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQztBQUFBLElBQzVDLEtBQUs7QUFDRCxhQUFPLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQztBQUFBLElBQzVCLEtBQUs7QUFDRCxhQUFPLEVBQUVDLEtBQUksU0FBUyxDQUFDLENBQUM7QUFBQSxJQUM1QixLQUFLO0FBQ0QsYUFBTyxFQUFFQyxLQUFJLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDNUIsS0FBSztBQUNELGFBQU8sRUFBRSxRQUFRLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDaEMsS0FBSztBQUNELGFBQU8sRUFBRSxRQUFRLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDaEMsS0FBSztBQUNELGFBQU8sRUFBRSxPQUFPLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDL0IsS0FBSztBQUNELGFBQU8sRUFBRSxLQUFLLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDN0IsS0FBSztBQUNELGFBQU8sRUFBRSxTQUFTLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDakMsS0FBSztBQUNELGFBQU8sRUFBRSxPQUFPLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDL0IsS0FBSztBQUNELGFBQU8sRUFBRSxTQUFTLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDakMsS0FBSztBQUNELGFBQU8sRUFBRSxTQUFTLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDakMsS0FBSztBQUNELGFBQU8sRUFBRSxRQUFRLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDaEMsS0FBSztBQUNELGFBQU8sRUFBRSxPQUFPLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDL0IsS0FBSztBQUNELGFBQU8sRUFBRSxVQUFVLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDbEMsS0FBSztBQUNELGFBQU8sRUFBRSxNQUFNLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDOUIsS0FBSztBQUNELGFBQU8sRUFBRSxLQUFLLFNBQVMsQ0FBQyxDQUFDO0FBQUEsSUFDN0IsS0FBSztBQUNELGFBQU8sRUFBRSxVQUFVLFNBQVMsQ0FB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LFFBQVEsQ0FBQyxLQUFLLFVBQVUsS0FBSyxRQUFRLENBQUMsSUFDeEQ7QUFDRSxXQUFPO0FBQUEsRUFDWCxPQUFPO0FBQ0gsV0FBTztBQUFBLEVBQ1g7QUFDSjtBQUVBLFNBQVMsWUFBWSxNQUFZO0FBQzdCLFNBQU8sV0FBVyxRQUFRLEtBQUssVUFBVTtBQUM3QztBQUVBLFNBQVMsWUFBWSxNQUFZO0FBQzdCLFNBQU8sV0FBVyxRQUFRLEtBQUssVUFBVTtBQUM3QztBQUVBLGVBQWUsU0FBUyxLQUFlLEtBQXlCO0FBRTVELGFBQVcsQ0FBQyxNQUFNLElBQUksS0FBSyxPQUFPLFFBQVEsSUFBSSxNQUFNLEdBQUc7QUFHbkQsUUFBSSxDQUFDLElBQUksYUFBYSxJQUFJLElBQUksS0FBSyxXQUFXLEdBQUc7QUFDN0MsWUFBTSxRQUFTLEtBQWlCLFlBQVksR0FBRztBQUMvQyxVQUFJLGFBQWEsSUFBSSxNQUFNLEtBQUs7QUFBQSxJQUNwQztBQUFBLEVBQ0o7QUFHQSxTQUFPLElBQUksS0FBSyxZQUFZLEdBQUc7QUFDbkM7QUFFQSxlQUFlLHVCQUF1QixLQUFpQixVQUF1QjtBQUcxRSxRQUFNLGdCQUFnQixTQUFTLGlCQUFpQixnQkFBZ0I7QUFDaEUsYUFBVyxZQUFZLGVBQWU7QUFDbEMsVUFBTSxRQUFRLE1BQU0sSUFBSSxzQkFBc0I7QUFDOUMsUUFBSSxPQUFPO0FBQ1AseUJBQW1CLE9BQU8sUUFBdUI7QUFBQSxJQUNyRDtBQUFBLEVBQ0o7QUFDSjtBQUVBLElBQU8saUJBQVEsRUFBRSxPQUFPOyIsCiAgIm5hbWVzIjogWyJ0aHJvdHRsZSIsICJpbnB1dCIsICJpbnB1dCIsICJjb2x1bW4iLCAiaXNTZWxlY3Rpb24iLCAiaW5wdXQiLCAiY2xhdXNlUG9pbnQiLCAiaXNQYXJhbSIsICJpc1NlbGVjdGlvbiIsICJpbnB1dCIsICJpc1NlbGVjdGlvbiIsICJjbGF1c2VQb2ludCIsICJpc1BhcmFtIiwgImNsYXVzZVBvaW50IiwgImlzUGFyYW0iLCAiaXNTZWxlY3Rpb24iLCAiUXVlcnkiLCAibWluIiwgIm1heCIsICJpc1NlbGVjdGlvbiIsICJ2YWx1ZSIsICJjb2x1bW4iLCAiUXVlcnkiLCAiY2xhdXNlUG9pbnQiLCAiaXNQYXJhbSIsICJjbGF1c2VQb2ludHMiLCAiaXNTZWxlY3Rpb24iLCAidG9EYXRhQ29sdW1ucyIsICJRdWVyeSIsICJtYXgiLCAibWluIiwgImNvbHVtbiIsICJjbGF1c2VQb2ludHMiLCAiUXVlcnkiLCAiZmlsdGVyIiwgInRvRGF0YUNvbHVtbnMiLCAiaXNTZWxlY3Rpb24iLCAibWF4IiwgIm1pbiIsICJpc1BhcmFtIiwgImlzU2VsZWN0aW9uIiwgIlF1ZXJ5IiwgImlzU2VsZWN0aW9uIiwgImlzUGFyYW0iLCAiUXVlcnkiLCAiY291bnQiLCAidGhyb3R0bGUiXQp9Cg==
