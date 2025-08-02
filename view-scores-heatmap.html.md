# Scores Heatmap


## Overview

The `scores_heatmap()`function renders a heatmap for comparing eval
scores.

``` python
from inspect_viz import Data
from inspect_viz.view.beta import scores_heatmap

evals = Data.from_file("evals.parquet")
scores_heatmap(evals, height=200, legend=False)
```

## Data Preparation

Above we read the data for the plot from a parquet file. This file was
in turn created by:

1.  Reading logs into a data frame with
    [`evals_df()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#evals_df).

2.  Using the
    [`prepare()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#prepare)
    function to add
    [`model_info()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#model_info)
    and
    [`log_viewer()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#model_info)
    columns to the data frame.

``` python
from inspect_ai.analysis.beta import evals_df, log_viewer, model_into, prepare

df = evals_df("logs")
df = prepare(df, 
    model_info(),
    log_viewer("eval", {"logs": "https://samples.meridianlabs.ai/"}),
)
df.to_parquet("evals.parquet")
```

You can additionanlly use the
[`task_info()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#task_info)
operation to map lower-level task names to task display names
(e.g. “gpqa_diamond” -\> “GPQA Diamond”).

Note that both the log viewer links and model names are optional (the
plot will render without links and use raw model strings if the data
isn’t prepared with `log_viewer()` and `model_info()`).

## Function Reference

Creates a heatmap plot of success rate of eval data.

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/c61568f204f6e2fb9202da4ee1cb7194634e36f2/src/inspect_viz/view/beta/_scores_heatmap.py#L33)

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

`data` [Data](reference/inspect_viz.qmd#data)  
Evals data table.

`x` str  
Name of column to use for columns.

`y` str  
Name of column to use for rows.

`fill` str  
Name of the column to use as values to determine cell color.

`cell` [CellOptions](reference/inspect_viz.view.qmd#celloptions) \| None  
Options for the cell marks.

`tip` bool  
Whether to show a tooltip with the value when hovering over a cell
(defaults to True).

`title` str \| [Title](reference/inspect_viz.mark.qmd#title) \| None  
Title for plot (`str` or mark created with the `title()` function)

`marks` [Marks](reference/inspect_viz.mark.qmd#marks) \| None  
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

`legend` [Legend](reference/inspect_viz.plot.qmd#legend) \| bool \| None  
Options for the legend. Pass None to disable the legend.

`sort` Literal\['ascending', 'descending'\] \| SortOrder \| None  
Sort order for the x and y axes. If ascending, the highest values will
be sorted to the top right. If descending, the highest values will
appear in the bottom left. If None, no sorting is applied. If a
SortOrder is provided, it will be used to sort the x and y axes.

`**attributes` Unpack\[[PlotAttributes](reference/inspect_viz.plot.qmd#plotattributes)\]  
Additional \`PlotAttributes

## Implementation

The [Scores Heatmap](examples/inspect/scores-heatmap/index.qmd) example
demonstrates how this view was implemented using lower level plotting
components.
