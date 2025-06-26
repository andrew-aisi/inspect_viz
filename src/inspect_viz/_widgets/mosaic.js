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
    if (isParam(this.options_.as)) {
      const paramValue = this.options_.as.value;
      if (paramValue && !options.some((option) => option.value === paramValue)) {
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
var Select = class extends ChoiceInput {
  select_;
  multiple_;
  tomSelect_ = void 0;
  constructor(options) {
    super(options);
    this.multiple_ = options.multiple || false;
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
    this.select_.addEventListener("input", () => {
      this.publish(this.selectedValue ?? null);
    });
    this.setupParamListener();
    this.setupActivationListeners(this.select_);
  }
  queryResult(data) {
    if (this.multiple_) {
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
        config.allowEmptyOption = !this.select_.multiple;
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
          this.tomSelect_?.refreshOptions();
        });
      }
    }
    this.tomSelect_.clearOptions();
    this.tomSelect_.addOption(
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
  isSelection as isSelection2
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
var Checkbox = class extends Input {
  constructor(options_) {
    super(options_.filterBy);
    this.options_ = options_;
    const { inputLabel, input: input2 } = createLabeledInput("checkbox", options_.label);
    input2.id = generateId();
    this.element.appendChild(inputLabel);
    input2.checked = options_.checked;
    const publish = () => this.publish(
      input2.checked ? options_.values[0] || void 0 : options_.values[1] || void 0
    );
    input2.addEventListener("change", publish);
    publish();
    if (!isSelection2(this.options_.as)) {
      this.options_.as.addEventListener("value", (value) => {
        input2.checked = value === this.options_.values[0];
      });
    } else {
      setupActivationListeners(this, input2);
    }
  }
  activate() {
    if (isSelection2(this.options_.as)) {
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
    if (isSelection2(this.options_.as)) {
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
  isSelection as isSelection3
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
    }
    this.updateCurrentValue();
    this.curval_.innerText = this.sliderValue.toString();
    this.sliderApi_.on("update", () => {
      this.updateCurrentValue();
      this.publish(this.sliderValue);
    });
    if (!isSelection3(this.options_.as)) {
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
    if (isSelection3(target)) {
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
    }
    this.updateSlider(min3, max3, start);
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
    if (isSelection3(target)) {
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
  isSelection as isSelection4,
  queryFieldInfo,
  throttle,
  toDataColumns as toDataColumns2
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
import {
  and as and2,
  asc as asc2,
  contains as contains2,
  desc as desc2,
  eq as eq2,
  gt as gt2,
  gte as gte2,
  isNull as isNull2,
  literal as literal2,
  lt as lt2,
  lte as lte2,
  neq as neq2,
  not as not2,
  or as or2,
  prefix as prefix2,
  Query as Query4
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm";
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  themeBalham
} from "https://cdn.jsdelivr.net/npm/ag-grid-community@33.3.2/+esm";
import * as d3Format from "https://cdn.jsdelivr.net/npm/d3-format@3.1.0/+esm";
import * as d3TimeFormat from "https://cdn.jsdelivr.net/npm/d3-time-format@4.1.0/+esm";

// node_modules/@uwdata/mosaic-sql/src/constants.js
var COLUMN_REF = "COLUMN_REF";
var COLUMN_PARAM = "COLUMN_PARAM";
var TABLE_REF = "TABLE_REF";
var LITERAL = "LITERAL";
var ORDER_BY = "ORDER_BY";
var CAST = "CAST";
var CASE = "CASE";
var WHEN = "WHEN";
var UNARY_OPERATOR = "UNARY";
var BINARY_OPERATOR = "BINARY";
var BETWEEN_OPERATOR = "BETWEEN";
var NOT_BETWEEN_OPERATOR = "NOT_BETWEEN";
var LOGICAL_OPERATOR = "LOGICAL_OPERATOR";
var IN_OPERATOR = "IN";
var FUNCTION = "FUNCTION";
var AGGREGATE = "AGGREGATE";
var WINDOW = "WINDOW";
var WINDOW_DEF = "WINDOW_DEF";
var WINDOW_FRAME = "WINDOW_FRAME";
var EXPRESSION = "EXPRESSION";
var FRAGMENT = "FRAGMENT";
var PARAM = "PARAM";
var SELECT_CLAUSE = "SELECT_CLAUSE";
var FROM_CLAUSE = "FROM_CLAUSE";
var WINDOW_CLAUSE = "WINDOW_CLAUSE";
var SELECT_QUERY = "SELECT_QUERY";
var DESCRIBE_QUERY = "DESCRIBE_QUERY";
var SET_OPERATION = "SET_OPERATION";

// node_modules/@uwdata/mosaic-sql/src/ast/node.js
var SQLNode = class {
  /**
   * Instantiate a SQL AST node.
   * @param {string} type The SQL AST node type.
   */
  constructor(type) {
    this.type = type;
  }
};
var ExprNode = class extends SQLNode {
};

// node_modules/@uwdata/mosaic-sql/src/ast/literal.js
var LiteralNode = class extends ExprNode {
  /**
   * Instantiate an literal node.
   * @param {*} value The literal value.
   */
  constructor(value) {
    super(LITERAL);
    this.value = value;
  }
  /**
   * Generate a SQL query string for this node.
   * @returns {string}
   */
  toString() {
    return literalToSQL(this.value);
  }
};
function literalToSQL(value) {
  switch (typeof value) {
    case "number":
      return Number.isFinite(value) ? `${value}` : "NULL";
    case "string":
      return `'${value.replaceAll(`'`, `''`)}'`;
    case "boolean":
      return value ? "TRUE" : "FALSE";
    default:
      if (value == null) {
        return "NULL";
      } else if (value instanceof Date) {
        const ts = +value;
        if (Number.isNaN(ts)) return "NULL";
        const y2 = value.getUTCFullYear();
        const m = value.getUTCMonth();
        const d = value.getUTCDate();
        return ts === Date.UTC(y2, m, d) ? `DATE '${y2}-${m + 1}-${d}'` : `epoch_ms(${ts})`;
      } else if (value instanceof RegExp) {
        return `'${value.source}'`;
      } else {
        return `${value}`;
      }
  }
}

// node_modules/@uwdata/mosaic-sql/src/ast/param.js
var ParamNode = class extends ExprNode {
  /**
   * Instantiate a param node with a dynamic parameter.
   * @param {ParamLike} param The dynamic parameter.
   */
  constructor(param) {
    super(PARAM);
    this.param = param;
  }
  /**
   * Returns the current parameter value.
   * @returns {*}
   */
  get value() {
    return this.param.value;
  }
  /**
   * Generate a SQL query string for this node.
   * @returns {string}
   */
  toString() {
    return literalToSQL(this.value);
  }
};

// node_modules/@uwdata/mosaic-sql/src/ast/function.js
var FunctionNode = class extends ExprNode {
  /**
   * Instantiate a function node.
   * @param {string} name The function name.
   * @param {ExprNode[]} [args=[]] The function arguments.
   */
  constructor(name, args = []) {
    super(FUNCTION);
    this.name = name;
    this.args = args;
  }
  /**
   * Generate a SQL query string for this node.
   * @returns {string}
   */
  toString() {
    const { name, args } = this;
    return `${name}(${args.join(", ")})`;
  }
};

// node_modules/@uwdata/mosaic-sql/src/util/function.js
function fn(name, ...args) {
  return new FunctionNode(name, argsList(args).map(asNode));
}
function exprList(list, cast2 = asNode) {
  return list.flat().filter((x2) => x2 != null).map((x2) => cast2(x2));
}
function argsList(list) {
  const n = list.length;
  let i = n;
  for (; i > 0 && list[i - 1] === void 0; --i) ;
  return i < n ? list.slice(0, i) : list;
}

// node_modules/@uwdata/mosaic-sql/src/util/string.js
function parseIdentifier(id) {
  return id.split(".");
}
function quoteIdentifier(value) {
  return `"${value}"`;
}

// node_modules/@uwdata/mosaic-sql/src/util/type-check.js
function isString(value) {
  return typeof value === "string";
}
function isArray(value) {
  return Array.isArray(value);
}
function isParamLike(value) {
  return value && typeof value.addEventListener === "function" && value.dynamic !== false && "value" in value;
}

// node_modules/@uwdata/mosaic-sql/src/ast/column-ref.js
var ColumnRefNode = class extends ExprNode {
  /**
   * Instantiate a column reference node.
   * @param {TableRefNode} [table] The table reference.
   */
  constructor(type, table) {
    super(type);
    this.table = table;
  }
  /**
   * Returns the column name.
   * @returns {string}
   */
  get column() {
    return null;
  }
  /**
   * Generate a SQL query string for this node.
   * @returns {string}
   */
  toString() {
    const { column: column2, table } = this;
    const tref = `${table ?? ""}`;
    const id = column2 === "*" ? "*" : quoteIdentifier(column2);
    return (tref ? tref + "." : "") + id;
  }
};
var ColumnNameRefNode = class extends ColumnRefNode {
  /**
   * Instantiate a column reference node.
   * @param {string} name The column name.
   * @param {TableRefNode} [table] The table reference.
   */
  constructor(name, table) {
    super(COLUMN_REF, table);
    this.name = name;
  }
  /**
   * Returns the column name.
   * @returns {string}
   */
  get column() {
    return this.name;
  }
};

// node_modules/@uwdata/mosaic-sql/src/ast/column-param.js
var ColumnParamNode = class extends ColumnRefNode {
  /**
   * Instantiate a column param node.
   * @param {ParamNode} param The column name as a parameter node.
   * @param {TableRefNode} [table] The table reference.
   */
  constructor(param, table) {
    super(COLUMN_PARAM, table);
    this.param = param;
  }
  /**
   * Returns the column name.
   * @returns {string}
   */
  get column() {
    return `${this.param.value}`;
  }
};

// node_modules/@uwdata/mosaic-sql/src/functions/column.js
function column(name, table) {
  const tref = asTableRef(table);
  return isParamLike(name) ? new ColumnParamNode(new ParamNode(name), tref) : new ColumnNameRefNode(name, tref);
}

// node_modules/@uwdata/mosaic-sql/src/functions/literal.js
function literal(value) {
  return new LiteralNode(value);
}

// node_modules/@uwdata/mosaic-sql/src/ast/table-ref.js
var TableRefNode = class extends ExprNode {
  /**
   * Instantiate a table reference node.
   * @param {string | string[]} table The table name.
   */
  constructor(table) {
    super(TABLE_REF);
    this.table = [table].flat();
  }
  /**
   * The table name without database or schema namespaces.
   * @returns {string}
   */
  get name() {
    return this.table[this.table.length - 1];
  }
  /**
   * Generate a SQL query string for this node.
   * @returns {string}
   */
  toString() {
    return this.table.map((t) => quoteIdentifier(t)).join(".");
  }
};

// node_modules/@uwdata/mosaic-sql/src/functions/table-ref.js
function tableRef(...ids) {
  const args = exprList(ids, String);
  return args?.length ? new TableRefNode(args) : void 0;
}

// node_modules/@uwdata/mosaic-sql/src/util/ast.js
function asNode(value) {
  return isString(value) ? parseColumnRef(value) : asLiteral(value);
}
function asLiteral(value) {
  return value instanceof ExprNode ? value : isParamLike(value) ? new ParamNode(value) : literal(value);
}
function asTableRef(value) {
  return isString(value) ? parseTableRef(value) : isArray(value) ? tableRef(value) : value;
}
function parseColumnRef(ref) {
  const ids = parseIdentifier(ref);
  return column(ids.pop(), tableRef(ids));
}
function parseTableRef(ref) {
  return tableRef(parseIdentifier(ref));
}

// node_modules/@uwdata/mosaic-sql/src/ast/aggregate.js
var aggregateNames = [
  "any_value",
  "approx_count_distinct",
  "approx_quantile",
  "arbitrary",
  "arg_max",
  "arg_max_null",
  "arg_min",
  "arg_min_null",
  "array_agg",
  "avg",
  "bit_and",
  "bit_or",
  "bit_xor",
  "bitstring_agg",
  "bool_and",
  "bool_or",
  "corr",
  "count",
  "covar_pop",
  "covar_samp",
  "entropy",
  "favg",
  "first",
  "fsum",
  "geomean",
  "kurtosis_pop",
  "kurtosis",
  "last",
  "mad",
  "max",
  "max_by",
  "median",
  "min",
  "min_by",
  "mode",
  "product",
  "quantile",
  "quantile_cont",
  "quantile_disc",
  "regr_avgx",
  "regr_avgy",
  "regr_count",
  "regr_intercept",
  "regr_r2",
  "regr_sxx",
  "regr_sxy",
  "regr_syy",
  "regr_slope",
  "reservoir_quantile",
  "skewness",
  "stddev",
  "stddev_pop",
  "stddev_samp",
  "string_agg",
  "sum",
  "variance",
  "var_pop",
  "var_samp"
];

// node_modules/@uwdata/mosaic-sql/src/functions/string.js
function strFn(name, expr, ...args) {
  return fn(name, expr, ...argsList(args).map(asLiteral));
}
function suffix(string, search_string) {
  return strFn("ends_with", string, search_string);
}

// node_modules/@uwdata/mosaic-sql/src/visit/recurse.js
var recurse = {
  [AGGREGATE]: ["args", "filter"],
  [BETWEEN_OPERATOR]: ["expr", "extent"],
  [BINARY_OPERATOR]: ["left", "right"],
  [CASE]: ["expr", "_when", "_else"],
  [CAST]: ["expr"],
  [COLUMN_PARAM]: ["param", "table"],
  [COLUMN_REF]: ["table"],
  [DESCRIBE_QUERY]: ["query"],
  [EXPRESSION]: ["node"],
  [FRAGMENT]: ["spans"],
  [FROM_CLAUSE]: ["expr"],
  [FUNCTION]: ["args"],
  [IN_OPERATOR]: ["expr", "values"],
  [LOGICAL_OPERATOR]: ["clauses"],
  [NOT_BETWEEN_OPERATOR]: ["expr", "extent"],
  [ORDER_BY]: ["expr"],
  [PARAM]: ["value"],
  [SELECT_CLAUSE]: ["expr"],
  [SELECT_QUERY]: ["_with", "_select", "_from", "_where", "_sample", "_groupby", "_having", "_window", "_qualify", "_orderby"],
  [SET_OPERATION]: ["subqueries", "_orderby"],
  [UNARY_OPERATOR]: ["expr"],
  [WHEN]: ["when", "then"],
  [WINDOW]: ["func", "def"],
  [WINDOW_CLAUSE]: ["def"],
  [WINDOW_DEF]: ["partition", "order", "frame"],
  [WINDOW_FRAME]: ["extent"]
};

// node_modules/@uwdata/mosaic-sql/src/visit/visitors.js
var aggrRegExp = new RegExp(`^(${aggregateNames.join("|")})$`);

// node_modules/@uwdata/mosaic-sql/src/transforms/util/time-interval.js
var YEAR = "year";
var MONTH = "month";
var DAY = "day";
var HOUR = "hour";
var MINUTE = "minute";
var SECOND = "second";
var durationSecond = 1e3;
var durationMinute = durationSecond * 60;
var durationHour = durationMinute * 60;
var durationDay = durationHour * 24;
var durationWeek = durationDay * 7;
var durationMonth = durationDay * 30;
var durationYear = durationDay * 365;
var units = [
  { unit: SECOND, step: 1, dt: durationSecond },
  { unit: SECOND, step: 5, dt: durationSecond * 5 },
  { unit: SECOND, step: 15, dt: durationSecond * 15 },
  { unit: SECOND, step: 30, dt: durationSecond * 30 },
  { unit: MINUTE, step: 1, dt: durationMinute },
  { unit: MINUTE, step: 5, dt: durationMinute * 5 },
  { unit: MINUTE, step: 15, dt: durationMinute * 15 },
  { unit: MINUTE, step: 30, dt: durationMinute * 30 },
  { unit: HOUR, step: 1, dt: durationHour },
  { unit: HOUR, step: 3, dt: durationHour * 3 },
  { unit: HOUR, step: 6, dt: durationHour * 6 },
  { unit: HOUR, step: 12, dt: durationHour * 12 },
  { unit: DAY, step: 1, dt: durationDay },
  { unit: DAY, step: 7, dt: durationWeek },
  { unit: MONTH, step: 1, dt: durationMonth },
  { unit: MONTH, step: 3, dt: durationMonth * 3 },
  { unit: YEAR, step: 1, dt: durationYear }
];

// js/inputs/table.ts
var Table = class extends Input {
  constructor(options_) {
    super(options_.filterBy);
    this.options_ = options_;
    ModuleRegistry.registerModules([AllCommunityModule]);
    this.id_ = generateId();
    this.columns_ = this.options_.columns || ["*"];
    this.align_ = this.options_.align || {};
    this.format_ = this.options_.format || {};
    this.height_ = this.options_.height;
    this.widths_ = typeof this.options_.width === "object" ? this.options_.width : {};
    this.currentRow_ = -1;
    this.schema_ = [];
    if (typeof this.options_.width === "number") {
      this.element.style.width = `${this.options_.width}px`;
    }
    if (this.options_.maxWidth) {
      this.element.style.maxWidth = `${this.options_.maxWidth}px`;
    }
    if (this.options_.height) {
      this.element.style.height = `${this.height_}px`;
    } else {
      this.element.style.height = "100%";
    }
    this.gridContainer_ = document.createElement("div");
    this.gridContainer_.id = this.id_;
    this.gridContainer_.style.width = "100%";
    this.gridContainer_.style.height = "100%";
    this.element.appendChild(this.gridContainer_);
    this.gridOptions_ = {
      pagination: !!options_.pagination,
      paginationAutoPageSize: !!options_.paginationAutoPageSize,
      paginationPageSizeSelector: options_.paginationPageSizeSelector,
      paginationPageSize: options_.paginationPageSize,
      animateRows: false,
      columnDefs: [],
      rowData: [],
      defaultColDef: {
        sortable: options_.sorting !== false,
        resizable: true
      },
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
      onCellMouseOver: (event) => {
        if (isSelection4(this.options_.as)) {
          const rowIndex = event.rowIndex;
          if (rowIndex !== void 0 && rowIndex !== null && rowIndex !== this.currentRow_) {
            this.currentRow_ = rowIndex;
            this.options_.as.update(this.clause([rowIndex]));
          }
        }
      },
      onCellMouseOut: () => {
        if (isSelection4(this.options_.as)) {
          this.currentRow_ = -1;
          this.options_.as.update(this.clause());
        }
      },
      onGridReady: () => {
        this.patchColumns();
      }
    };
  }
  id_;
  columns_;
  align_;
  format_ = {};
  height_;
  widths_;
  gridContainer_;
  grid_ = null;
  gridOptions_;
  schema_;
  currentRow_;
  sortModel_ = [];
  filterModel_ = {};
  data_ = {
    numRows: 0,
    columns: {}
  };
  // contribute a selection clause back to the target selection
  clause(rows = []) {
    const fields = this.schema_.map((s) => s.column);
    const values = rows.map((row) => {
      return fields.map((f) => this.data_.columns[f][row]);
    });
    return clausePoints2(fields, values, { source: this });
  }
  // mosaic calls this and initialization to let us fetch the schema
  // and do related setup
  async prepare() {
    const table = this.options_.from;
    const fields = this.columns_.map((column2) => ({ column: column2, table }));
    this.schema_ = await queryFieldInfo(this.coordinator, fields);
    const columnDefs = this.schema_.map(({ column: column2, type }) => {
      const align = this.align_[column2] || (type === "number" ? "right" : "left");
      const formatter = formatterForType(type, this.format_[column2]);
      const colDef = {
        field: column2,
        headerName: column2,
        cellStyle: { textAlign: align },
        comparator: (_valueA, _valueB) => {
          return 0;
        },
        filter: this.options_.filtering === false ? false : filterForColumnType(type),
        valueFormatter: (params) => {
          const value = params.value;
          if (formatter && value !== null && value !== void 0) {
            return formatter(value);
          }
          return value;
        }
      };
      const width = this.widths_[column2];
      if (width) {
        colDef.width = width;
      } else {
        colDef.flex = 1;
      }
      return colDef;
    });
    this.gridOptions_.columnDefs = columnDefs;
    const myTheme = themeBalham.withParams({
      spacing: 4,
      accentColor: "blue"
    });
    this.gridOptions_.theme = myTheme;
    this.grid_ = createGrid(this.gridContainer_, this.gridOptions_);
  }
  // mosaic calls this every time it needs to show data to find
  // out what query we want to run
  query(filter = []) {
    let query = Query4.from(this.options_.from).select(
      this.schema_.length ? this.schema_.map((s) => s.column) : "*"
    );
    query = query.where(...filter);
    Object.keys(this.filterModel_).forEach((colId) => {
      const filter2 = this.filterModel_[colId];
      const expression = filterExpression(colId, filter2, query);
      if (expression) {
        query = query.where(expression);
      }
    });
    if (this.sortModel_.length > 0) {
      this.sortModel_.forEach((sort) => {
        query = query.orderby(sort.sort === "asc" ? asc2(sort.colId) : desc2(sort.colId));
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
    if (!this.grid_) return;
    const rowData = [];
    for (let i = 0; i < this.data_.numRows; i++) {
      const row = {};
      this.schema_.forEach(({ column: column2 }) => {
        row[column2] = this.data_.columns[column2][i];
      });
      rowData.push(row);
    }
    this.grid_.setGridOption("rowData", rowData);
  });
  patchColumns() {
    if (!this.grid_) {
      return;
    }
    const columns = this.grid_.getColumns();
    if (columns) {
      columns.forEach(async (column2) => {
        const colId = column2.getColId();
        const filterInstance = await this.grid_.getColumnFilterInstance(colId);
        if (filterInstance && typeof filterInstance.doesFilterPass === "function") {
          filterInstance.doesFilterPass = () => true;
        }
      });
    }
  }
  // all mosaic inputs implement this, not exactly sure what it does
  activate() {
    if (isSelection4(this.options_.as)) {
      this.options_.as.activate(this.clause([]));
    }
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
      return d3TimeFormat.format(formatStr || "%Y-%m-%d");
    // ISO date format (2024-03-15)
    case "datetime":
    case "timestamp":
      return d3TimeFormat.format(formatStr || "%Y-%m-%d %H:%M:%S");
    // ISO datetime format
    case "boolean":
    case "string":
    default:
      return void 0;
  }
};
var filterExpression = (colId, filter, query) => {
  if (isCombinedSimpleModel(filter)) {
    const exp2 = filter.operator === "AND" ? and2 : or2;
    const expressions = filter.conditions?.map((f) => {
      const typedF = f;
      return filterExpression(colId, typedF, query);
    }).filter((e) => e !== void 0);
    if (expressions && expressions.length > 0) {
      return exp2(...expressions);
    }
  } else if (isTextFilter(filter)) {
    return simpleExpression(colId, filter.type, filter.filter);
  } else if (isNumberFilter(filter)) {
    return simpleExpression(colId, filter.type, filter.filter);
  } else if (isMultiFilter(filter)) {
    const expr = filter.filterModels?.map((f) => {
      return filterExpression(colId, f, query);
    }).filter((e) => e !== void 0);
    if (expr && expr.length > 0) {
      return and2(...expr);
    }
  } else if (isDateFilter(filter)) {
    return simpleExpression(colId, filter.type, filter.dateFrom, filter.dateTo || void 0);
  } else if (isSetFilter(filter)) {
    console.warn("Set filter not implemented");
  }
};
var simpleExpression = (colId, type, filter, filterTo = void 0) => {
  switch (type) {
    case "equals":
      return eq2(colId, literal2(filter));
    case "notEqual":
      return neq2(colId, literal2(filter));
    case "contains":
      return contains2(colId, String(filter));
    case "notContains":
      return not2(contains2(colId, String(filter)));
    case "blank":
      return isNull2(colId);
    case "notBlank":
      return not2(isNull2(colId));
    case "startsWith":
      return prefix2(colId, String(filter));
    case "endsWith":
      return suffix(colId, String(filter));
    case "greaterThan":
      return gt2(colId, literal2(filter));
    case "lessThan":
      return lt2(colId, literal2(filter));
    case "greaterThanOrEqual":
      return gte2(colId, literal2(filter));
    case "lessThanOrEqual":
      return lte2(colId, literal2(filter));
    case "inRange":
      if (filterTo !== void 0 && filterTo !== null) {
        return gte2(colId, literal2(filter)), lte2(colId, literal2(filterTo));
      }
      break;
    default:
      console.warn(`Unsupported filter type: ${type}`);
  }
  return void 0;
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
  isSelection as isSelection5
} from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm";
import { Query as Query5 } from "https://cdn.jsdelivr.net/npm/@uwdata/mosaic-sql@0.16.2/+esm";
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
    if (!isSelection5(this.options_.as)) {
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
    if (isSelection5(this.options_.as)) {
      this.options_.as.activate(this.clause(""));
    }
  }
  publish(value) {
    if (isSelection5(this.options_.as)) {
      this.options_.as.update(this.clause(value));
    } else if (isParam4(this.options_.as)) {
      this.options_.as.update(value);
    }
  }
  query(filter = []) {
    return Query5.from(this.options_.from).select({ list: this.options_.column }).distinct().where(...filter);
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
async function waitForTable(conn, table, { interval: interval2 = 250 } = {}) {
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
        `Table ${table} not yet available, trying again in ${interval2}ms (error: ${err})`
      );
    }
    await sleep(interval2);
  }
}

// js/util/errors.ts
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
  const errorHTML = errorAsHTML(error);
  if (isNotebook()) {
    renderEl.setAttribute("style", "");
    renderEl.innerHTML = errorAsHTML(error);
  } else {
    showErrorModal(errorHTML);
  }
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
  const div2 = document.createElement("div");
  div2.textContent = text;
  return div2.innerHTML;
}
function isVSCodeNotebook() {
  return window.location.protocol === "vscode-webview:" && window.location.search.includes("purpose=notebookRenderer");
}
function isNotebook() {
  const win = window;
  const hasNotebookGlobal = typeof win.Jupyter !== "undefined" || typeof win._JUPYTERLAB !== "undefined" || typeof win.google !== "undefined" && win.google.colab || typeof win.IPython !== "undefined" || typeof win.mo !== "undefined" || typeof win.acquireVsCodeApi !== "undefined";
  return hasNotebookGlobal || isVSCodeNotebook();
}
function isError(value) {
  return value instanceof Error;
}
var activeModal = null;
function showErrorModal(htmlContent) {
  if (activeModal) {
    activeModal.remove();
  }
  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 200px;
        padding-left: 20px;
        padding-right: 20px;
        box-sizing: border-box;
    `;
  const modal = document.createElement("div");
  modal.style.cssText = `
        max-width: 80vw;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
    `;
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;";
  closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
        z-index: 1;
    `;
  closeButton.onmouseover = () => {
    closeButton.style.backgroundColor = "#f0f0f0";
  };
  closeButton.onmouseout = () => {
    closeButton.style.backgroundColor = "transparent";
  };
  const contentWrapper = document.createElement("div");
  contentWrapper.innerHTML = htmlContent;
  modal.appendChild(closeButton);
  modal.appendChild(contentWrapper);
  backdrop.appendChild(modal);
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      activeModal = null;
    }
  };
  closeButton.onclick = () => {
    backdrop.remove();
    activeModal = null;
  };
  const handleEscape = (e) => {
    if (e.key === "Escape" && activeModal) {
      backdrop.remove();
      activeModal = null;
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);
  document.body.appendChild(backdrop);
  activeModal = backdrop;
}

// js/context/index.ts
var VizContext = class extends InstantiateContext {
  constructor(worker, conn_, plotDefaults) {
    super({ plotDefaults });
    this.conn_ = conn_;
    this.api = { ...this.api, ...INPUTS };
    this.coordinator.databaseConnector(wasmConnector({ connection: this.conn_ }));
    worker.addEventListener("message", (event) => {
      if (event.data.type === "ERROR") {
        this.workerErrors_.push(errorInfo(event.data.data.message));
      }
    });
  }
  tables_ = /* @__PURE__ */ new Set();
  workerErrors_ = [];
  async insertTable(table, data) {
    await this.conn_?.insertArrowFromIPCStream(data, {
      name: table,
      create: true
    });
    this.tables_.add(table);
  }
  async waitForTable(table) {
    await waitForTable(this.conn_, table);
  }
  async collectWorkerError(wait = 1e3) {
    const startTime = Date.now();
    while (Date.now() - startTime < wait) {
      if (this.workerErrors_.length > 0) {
        return this.workerErrors_.shift();
      }
      await sleep(100);
    }
    return void 0;
  }
};
var VIZ_CONTEXT_KEY = Symbol.for("@@inspect-viz-context");
async function vizContext(plotDefaults) {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  if (!globalScope[VIZ_CONTEXT_KEY]) {
    globalScope[VIZ_CONTEXT_KEY] = (async () => {
      const { db, worker } = await initDuckdb();
      const conn = await db.connect();
      return new VizContext(worker, conn, plotDefaults);
    })();
  }
  return globalScope[VIZ_CONTEXT_KEY];
}

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
  const renderSpec = async () => {
    try {
      const targetSpec = renderOptions.autoFill ? responsiveSpec(spec, el) : spec;
      const ast = parseSpec(targetSpec, { inputs });
      const specEl = await astToDOM(ast, ctx);
      el.innerHTML = "";
      el.appendChild(specEl);
      await handleWorkerErrors(ctx, el);
    } catch (e) {
      console.error(e);
      const error = errorInfo(e);
      el.innerHTML = errorAsHTML(error);
    }
  };
  await renderSpec();
  if (renderOptions.autoFill && !isInputSpec(spec)) {
    const resizeObserver = new ResizeObserver(throttle2(renderSpec));
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
  if ("hconcat" in spec && spec.hconcat.length == 1) {
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
async function astToDOM(ast, ctx) {
  for (const [name, node] of Object.entries(ast.params)) {
    if (!ctx.activeParams.has(name)) {
      const param = node.instantiate(ctx);
      ctx.activeParams.set(name, param);
    }
  }
  return ast.root.instantiate(ctx);
}
async function handleWorkerErrors(ctx, widgetEl) {
  const emptyPlotDivs = widgetEl.querySelectorAll("div.plot:empty");
  for (const emptyDiv of emptyPlotDivs) {
    const error = await ctx.collectWorkerError();
    if (error) {
      displayRenderError(error, emptyDiv);
    }
  }
  const emptyTables = widgetEl.querySelectorAll("tbody:empty");
  for (const emptyTable of emptyTables) {
    const error = await ctx.collectWorkerError();
    if (error) {
      const container = emptyTable.closest("div");
      if (container) {
        displayRenderError(error, container);
      }
    }
  }
}
var mosaic_default = { render };
export {
  mosaic_default as default
};
