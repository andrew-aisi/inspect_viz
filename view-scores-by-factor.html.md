# Scores by Factor


## Overview

The `scores_by_factor()` function renders a bar plot for comparing eval
scores by model and a boolean factor (e.g. non-reasoning vs. reasoning,
no hint vs. hint, etc.).

``` python
from inspect_viz import Data
from inspect_viz.view.beta import scores_by_factor

evals = Data.from_file("evals-hint.parquet")
scores_by_factor(evals, "task_arg_hint", ("No hint", "Hint"))
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
df.to_parquet("evals-hint.parquet")
```

You can additionanlly use the
[`task_info()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#task_info)
operation to map lower-level task names to task display names
(e.g. “gpqa_diamond” -\> “GPQA Diamond”).

You should also ensure that your evals data frame has a boolean field
corresponding to the factor you are splitting on (in the example above
this is “task_arg_hint”).

## Function Reference

Summarize eval scores with a factor of variation (e.g ‘No hint’
vs. ‘Hint’).

[Source](https://github.com/meridianlabs-ai/inspect_viz/blob/5f8862d2d1480ad43623482c450a1dcbce2bbdf5/src/inspect_viz/view/beta/_scores_by_factor.py#L13)

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

`data` [Data](reference/inspect_viz.qmd#data)  
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

`title` str \| [Mark](reference/inspect_viz.mark.qmd#mark) \| None  
Title for plot (`str` or mark created with the `title()` function).

`marks` [Marks](reference/inspect_viz.mark.qmd#marks) \| None  
Additional marks to include in the plot.

`width` float \| [Param](reference/inspect_viz.qmd#param) \| None  
The outer width of the plot in pixels, including margins. Defaults to
700.

`height` float \| [Param](reference/inspect_viz.qmd#param) \| None  
The outer height of the plot in pixels, including margins. Default to 65
pixels for each item on the “y” axis.

`**attributes` Unpack\[[PlotAttributes](reference/inspect_viz.plot.qmd#plotattributes)\]  
Additional \`PlotAttributes

## Implementation

The [Scores by Factor](examples/inspect/scores-by-factor/index.qmd)
example demonstrates how this view was implemented using lower level
plotting components.
