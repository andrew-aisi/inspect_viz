# inspect_viz.view.beta


> [!NOTE]
>
> View functions are currently in beta and are exported from the
> **inspect_ai.view.beta** module. The beta module will be preserved
> after final release so that code written against it now will continue
> to work after the beta.

## Scores

### scores_by_task

Bar plot for comparing eval scores.

Summarize eval scores using a bar plot. By default, scores (`y`) are
plotted by “task_display_name” (`fx`) and “model_display_name” (`x`). By
default, confidence intervals are also plotted (disable this with
`y_ci=False`).

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/1fa54e794b3b0592d0614efb9bfe24175b4b6277/src/inspect_viz/view/beta/_scores_by_task.py#L18)

``` python
def scores_by_task(
    data: Data,
    x: str = "model_display_name",
    fx: str = "task_display_name",
    y: str = "score_headline_value",
    y_stderr: str = "score_headline_stderr",
    y_ci: bool | float = 0.95,
    y_label: str | None | NotGiven = NOT_GIVEN,
    title: str | Title | None = None,
    marks: Marks | None = None,
    width: float | Param | None = None,
    height: float | Param | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component
```

`data` [Data](inspect_viz.qmd#data)  
Evals data table. This is typically created using a data frame read with
the inspect `evals_df()` function.

`x` str  
Name of field for x axis (defaults to “model_display_name”)

`fx` str  
Name of field for x facet (defaults to “task_display_name”)

`y` str  
Name of field for y axis (defaults to “score_headline_value”).

`y_stderr` str  
Name of field for stderr (defaults to “score_headline_metric”).

`y_ci` bool \| float  
Confidence interval (e.g. 0.80, 0.90, 0.95, etc.). Defaults to 0.95.

`y_label` str \| None \| NotGiven  
Y axis label (pass None for no label).

`title` str \| [Title](inspect_viz.mark.qmd#title) \| None  
Title for plot (`str` or mark created with the `title()` function).

`marks` [Marks](inspect_viz.mark.qmd#marks) \| None  
Additional marks to include in the plot.

`width` float \| [Param](inspect_viz.qmd#param) \| None  
The outer width of the plot in pixels, including margins. Defaults to
700.

`height` float \| [Param](inspect_viz.qmd#param) \| None  
The outer height of the plot in pixels, including margins. The default
is width / 1.618 (the [golden
ratio](https://en.wikipedia.org/wiki/Golden_ratio))

`**attributes` Unpack\[[PlotAttributes](inspect_viz.plot.qmd#plotattributes)\]  
Additional `PlotAttributes`. By default, the `margin_bottom` are is set
to 10 pixels and `x_ticks` is set to `[]`.

### scores_by_factor

Summarize eval scores with a factor of variation (e.g ‘No hint’
vs. ‘Hint’).

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/1fa54e794b3b0592d0614efb9bfe24175b4b6277/src/inspect_viz/view/beta/_scores_by_factor.py#L13)

``` python
def scores_by_factor(
    data: Data,
    fx: str,
    fx_labels: tuple[str, str],
    x: str = "score_headline_value",
    x_stderr: str = "score_headline_stderr",
    x_label: str = "Score",
    y: str = "model",
    y_label: str = "Model",
    ci: bool | float = 0.95,
    color: str | tuple[str, str] = "#3266ae",
    title: str | Mark | None = None,
    marks: Marks | None = None,
    width: float | Param | None = None,
    height: float | Param | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component
```

`data` [Data](inspect_viz.qmd#data)  
Evals data table. This is typically created using a data frame read with
the inspect `evals_df()` function.

`fx` str  
Field with factor of variation (should be of type boolean).

`fx_labels` tuple\[str, str\]  
Tuple of labels for factor of variation. `False` value should be first,
e.g. `("No hint", "Hint")`.

`x` str  
Name of field for x (scoring) axis (defaults to “score_headline_value”).

`x_stderr` str  
Name of field for scoring stderr (defaults to “score_headline_stderr”).

`x_label` str  
Label for x-axis (defaults to “Score”).

`y` str  
Name of field for y axis (defaults to “model”).

`y_label` str  
Lable for y axis (defaults to “Model”).

`ci` bool \| float  
Confidence interval (e.g. 0.80, 0.90, 0.95, etc.). Defaults to 0.95.)

`color` str \| tuple\[str, str\]  
Hex color value (or tuple of two values). If one value is provided the
second is computed by lightening the main color.

`title` str \| [Mark](inspect_viz.mark.qmd#mark) \| None  
Title for plot (`str` or mark created with the `title()` function).

`marks` [Marks](inspect_viz.mark.qmd#marks) \| None  
Additional marks to include in the plot.

`width` float \| [Param](inspect_viz.qmd#param) \| None  
The outer width of the plot in pixels, including margins. Defaults to
700.

`height` float \| [Param](inspect_viz.qmd#param) \| None  
The outer height of the plot in pixels, including margins. Default to 65
pixels for each item on the “y” axis.

`**attributes` Unpack\[[PlotAttributes](inspect_viz.plot.qmd#plotattributes)\]  
Additional \`PlotAttributes

### scores_timeline

Eval scores by model, organization, and release date.

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/1fa54e794b3b0592d0614efb9bfe24175b4b6277/src/inspect_viz/view/beta/_scores_timeline.py#L21)

``` python
def scores_timeline(
    data: Data,
    task_name: str = "task_display_name",
    model_name: str = "model_display_name",
    model_organization: str = "model_organization_name",
    model_release_date: str = "model_release_date",
    score_name: str = "score_headline_name",
    score_value: str = "score_headline_value",
    score_stderr: str = "score_headline_stderr",
    organizations: list[str] | None = None,
    filters: bool | list[Literal["task", "organization"]] = True,
    ci: float | bool = 0.95,
    time_label: str = "Release Date",
    score_label: str = "Score",
    eval_label: str = "Eval",
    title: str | Title | None = None,
    marks: Marks | None = None,
    width: float | Param | None = None,
    height: float | Param | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component
```

`data` [Data](inspect_viz.qmd#data)  
Data read using `evals_df()` and amended with model metadata using the
`model_info()` prepare operation (see [Data
Preparation](https://inspect.aisi.org.uk/dataframe.html#data-preparation)
for details).

`task_name` str  
Column for task name (defaults to “task_display_name”).

`model_name` str  
Column for model name (defaults to “model_display_name”).

`model_organization` str  
Column for model organization (defaults to “model_organization_name”).

`model_release_date` str  
Column for model release date (defaults to “model_release_date”).

`score_name` str  
Column for scorer name (defaults to “score_headline_name”).

`score_value` str  
Column for score value (defaults to “score_headline_value”).

`score_stderr` str  
Column for score stderr (defaults to “score_headline_stderr”)

`organizations` list\[str\] \| None  
List of organizations to include (in order of desired presentation).

`filters` bool \| list\[Literal\['task', 'organization'\]\]  
Provide UI to filter plot by task and organization(s).

`ci` float \| bool  
Confidence interval (defaults to 0.95, pass `False` for no confidence
intervals)

`time_label` str  
Label for time (x-axis).

`score_label` str  
Label for score (y-axis).

`eval_label` str  
Label for eval select input.

`title` str \| [Title](inspect_viz.mark.qmd#title) \| None  
Title for plot (`str` or mark created with the `title()` function).

`marks` [Marks](inspect_viz.mark.qmd#marks) \| None  
Additional marks to include in the plot.

`width` float \| [Param](inspect_viz.qmd#param) \| None  
The outer width of the plot in pixels, including margins. Defaults to
700.

`height` float \| [Param](inspect_viz.qmd#param) \| None  
The outer height of the plot in pixels, including margins. The default
is width / 1.618 (the [golden
ratio](https://en.wikipedia.org/wiki/Golden_ratio))

`**attributes` Unpack\[[PlotAttributes](inspect_viz.plot.qmd#plotattributes)\]  
Additional `PlotAttributes`. By default, the `x_domain` is set to
“fixed”, the `y_domain` is set to `[0,1.0]`, `color_label` is set to
“Organizations”, and `color_domain` is set to `organizations`.

### scores_by_model

Bar plot for comparing the scores of different models on a single
evaluation.

Summarize eval scores using a bar plot. By default, scores (`y`) are
plotted by “model_display_name” (`y`). By default, confidence intervals
are also plotted (disable this with `y_ci=False`).

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/1fa54e794b3b0592d0614efb9bfe24175b4b6277/src/inspect_viz/view/beta/_scores_by_model.py#L16)

``` python
def scores_by_model(
    data: Data,
    *,
    model_name: str = "model_display_name",
    score_value: str = "score_headline_value",
    score_stderr: str = "score_headline_stderr",
    ci: float = 0.95,
    sort: Literal["asc", "desc"] | None = None,
    score_label: str | None | NotGiven = None,
    model_label: str | None | NotGiven = None,
    color: str | None = None,
    title: str | Title | None = None,
    marks: Marks | None = None,
    width: float | None = None,
    height: float | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component
```

`data` [Data](inspect_viz.qmd#data)  
Evals data table. This is typically created using a data frame read with
the inspect `evals_df()` function.

`model_name` str  
Column containing the model name (defaults to “model_display_name”)

`score_value` str  
Column containing the score value (defaults to “score_headline_value”).

`score_stderr` str  
Column containing the score standard error (defaults to
“score_headline_stderr”).

`ci` float  
Confidence interval (e.g. 0.80, 0.90, 0.95, etc.). Defaults to 0.95.

`sort` Literal\['asc', 'desc'\] \| None  
Sort order for the bars (sorts using the ‘x’ value). Can be “asc” or
“desc”. Defaults to “asc”.

`score_label` str \| None \| NotGiven  
x-axis label (defaults to None).

`model_label` str \| None \| NotGiven  
x-axis label (defaults to None).

`color` str \| None  
The color for the bars. Defaults to “\#416AD0”. Pass any valid hex color
value.

`title` str \| [Title](inspect_viz.mark.qmd#title) \| None  
Title for plot (`str` or mark created with the `title()` function)

`marks` [Marks](inspect_viz.mark.qmd#marks) \| None  
Additional marks to include in the plot.

`width` float \| None  
The outer width of the plot in pixels, including margins. Defaults to
700.

`height` float \| None  
The outer height of the plot in pixels, including margins. The default
is width / 1.618 (the [golden
ratio](https://en.wikipedia.org/wiki/Golden_ratio))

`**attributes` Unpack\[[PlotAttributes](inspect_viz.plot.qmd#plotattributes)\]  
Additional `PlotAttributes`. By default, the `y_inset_top` and
`margin_bottom` are set to 10 pixels and `x_ticks` is set to `[]`.

### scores_heatmap

Creates a heatmap plot of success rate of eval data.

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/1fa54e794b3b0592d0614efb9bfe24175b4b6277/src/inspect_viz/view/beta/_scores_heatmap.py#L33)

``` python
def scores_heatmap(
    data: Data,
    x: str = "task_display_name",
    y: str = "model_display_name",
    fill: str = "score_headline_value",
    cell: CellOptions | None = None,
    tip: bool = True,
    title: str | Title | None = None,
    marks: Marks | None = None,
    height: float | None = None,
    width: float | None = None,
    x_label: str | None | NotGiven = None,
    y_label: str | None | NotGiven = None,
    legend: Legend | bool | None = None,
    sort: Literal["ascending", "descending"] | SortOrder | None = "ascending",
    **attributes: Unpack[PlotAttributes],
) -> Component
```

`data` [Data](inspect_viz.qmd#data)  
Evals data table.

`x` str  
Name of column to use for columns.

`y` str  
Name of column to use for rows.

`fill` str  
Name of the column to use as values to determine cell color.

`cell` [CellOptions](inspect_viz.view.qmd#celloptions) \| None  
Options for the cell marks.

`tip` bool  
Whether to show a tooltip with the value when hovering over a cell
(defaults to True).

`title` str \| [Title](inspect_viz.mark.qmd#title) \| None  
Title for plot (`str` or mark created with the `title()` function)

`marks` [Marks](inspect_viz.mark.qmd#marks) \| None  
Additional marks to include in the plot.

`height` float \| None  
The outer height of the plot in pixels, including margins. The default
is width / 1.618 (the [golden
ratio](https://en.wikipedia.org/wiki/Golden_ratio)).

`width` float \| None  
The outer width of the plot in pixels, including margins. Defaults to
700.

`x_label` str \| None \| NotGiven  
x-axis label (defaults to None).

`y_label` str \| None \| NotGiven  
y-axis label (defaults to None).

`legend` [Legend](inspect_viz.plot.qmd#legend) \| bool \| None  
Options for the legend. Pass None to disable the legend.

`sort` Literal\['ascending', 'descending'\] \| SortOrder \| None  
Sort order for the x and y axes. If ascending, the highest values will
be sorted to the top right. If descending, the highest values will
appear in the bottom left. If None, no sorting is applied. If a
SortOrder is provided, it will be used to sort the x and y axes.

`**attributes` Unpack\[[PlotAttributes](inspect_viz.plot.qmd#plotattributes)\]  
Additional \`PlotAttributes

## Tools

### tool_calls

Heat map visualising tool calls over evaluation turns.

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/1fa54e794b3b0592d0614efb9bfe24175b4b6277/src/inspect_viz/view/beta/_tool_calls.py#L15)

``` python
def tool_calls(
    data: Data,
    x: str = "order",
    y: str = "id",
    tool: str = "tool_call_function",
    limit: str = "limit",
    tools: list[str] | None = None,
    x_label: str | None = "Message",
    y_label: str | None = "Sample",
    title: str | Title | None = None,
    marks: Marks | None = None,
    width: float | None = None,
    height: float | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component
```

`data` [Data](inspect_viz.qmd#data)  
Messages data table. This is typically created using a data frame read
with the inspect `messages_df()` function.

`x` str  
Name of field for x axis (defaults to “order”)

`y` str  
Name of field for y axis (defaults to “id”).

`tool` str  
Name of field with tool name (defaults to “tool_call_function”)

`limit` str  
Name of field with sample limit (defaults to “limit”).

`tools` list\[str\] \| None  
Tools to include in plot (and order to include them). Defaults to all
tools found in `data`.

`x_label` str \| None  
x-axis label (defaults to “Message”).

`y_label` str \| None  
y-axis label (defaults to “Sample”).

`title` str \| [Title](inspect_viz.mark.qmd#title) \| None  
Title for plot (`str` or mark created with the `title()` function)

`marks` [Marks](inspect_viz.mark.qmd#marks) \| None  
Additional marks to include in the plot.

`width` float \| None  
The outer width of the plot in pixels, including margins. Defaults to
700.

`height` float \| None  
The outer height of the plot in pixels, including margins. The default
is width / 1.618 (the [golden
ratio](https://en.wikipedia.org/wiki/Golden_ratio))

`**attributes` Unpack\[[PlotAttributes](inspect_viz.plot.qmd#plotattributes)\]  
Additional `PlotAttributes`. By default, the `margin_top` is set to 0,
`margin_left` to 20, `margin_right` to 100, `color_label` is “Tool”,
`y_ticks` is empty, and `x_ticks` and `color_domain` are calculated from
`data`.

## Types

### CellOptions

Cell options for the heatmap.

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/1fa54e794b3b0592d0614efb9bfe24175b4b6277/src/inspect_viz/view/beta/_scores_heatmap.py#L23)

``` python
class CellOptions(TypedDict, total=False)
```

#### Attributes

`inset` float \| None  
Inset for the cell marks. Defaults to 1 pixel.

`text` str \| None  
Text color for the cell marks. Defaults to “white”. Set to None to
disable text.
