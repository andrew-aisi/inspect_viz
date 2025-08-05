# Scores Timeline


This example illustrates the code behind the
[`scores_timeline()`](../../../view-scores-timeline.qmd) pre-built view
function. If you want to include this plot in your notebooks or websites
you should start with that function rather than the lower-level code
below.

The example also relies on some [data
preparation](../../../view-scores-timeline.qmd#data-preparation) steps
to annotate the raw evals data with shorter model names and a “frontier”
column which drives the inclusion of text labels for scores that set a
new high water mark.

**Code**

``` python
from inspect_viz import Data, Selection
from inspect_viz.input import checkbox_group, select
from inspect_viz.layout import vconcat, vspace
from inspect_viz.plot import plot, legend
from inspect_viz.mark import dot, rule_x, text, regression_y
from inspect_viz.table import table
from inspect_viz.transform import ci_bounds, epoch_ms

# read data
evals = Data.from_file("benchmarks.parquet")

# transforms to compute ci bounds from score and stderr columns
ci_lower, ci_upper = ci_bounds(
    score="score_headline_value", 
    level=0.95,
    stderr="score_headline_stderr"
)


vconcat(
    # select benchmark
    select(evals, label="Eval: ", column="task_name", value="GPQA Diamond", width=425),
    
    # filter models by organization(s)
    checkbox_group(evals, column="model_organization_name"),
    
    # dot plot w/ error bars
    vspace(15),
    plot(
        # benchmark score
        dot(
            evals,
            x=epoch_ms("model_release_date"),
            y="score_headline_value",
            r=3,
            fill="model_organization_name",
            channels= {
                "Model": "model_display_name", 
                "Scorer": "score_headline_name", 
                "Stderr": "score_headline_stderr",
                "Log Viewer": "log_viewer"
            }
        ),
        # confidence interval
        rule_x( 
            evals,
            x=epoch_ms("model_release_date"),
            y="score_headline_value",
            y1=ci_lower,
            y2=ci_upper,
            stroke="model_organization_name",
            stroke_opacity=0.4,
            marker="tick-x",
        ), 
        # regression line
        regression_y(
            evals, 
            x=epoch_ms("model_release_date"), 
            y="score_headline_value", 
            stroke="#AAAAAA"
        ),
        # frontier annotation
        text(
            evals,
            text="model_display_name",
            x=epoch_ms("model_release_date"),
            y="score_headline_value",
            line_anchor="middle",
            frame_anchor="right",
            filter="frontier",
            dx=-4,
            fill="model_organization_name",
        ),
        legend=legend("color", target=evals.selection),
        x_domain="fixed",
        y_domain=[0,1.0],
        x_label="Release Date",
        y_label="Score",
        color_label="Organization",
        color_domain="fixed",
        x_tick_format="%b. %Y",
        grid=True,
        
    )
)
```

Line 10  
Benchmark data sourced from [Epoch
AI](https://epoch.ai/data/ai-benchmarking-dashboard).

Lines 13,17  
Create transforms used to compute the confidence intervals for each
point.

Line 33  
Use `epoch_ms` to convert the date into a timestamp so it is numeric for
use in computing the regression

Lines 37,42  
Additional channels are added to the tooltip.

Line 52  
Confidence interval: compute dynamically using `ci_value()`, color by
organization, and reduce opacity.

Line 65  
Text annotations are automatically moved to avoid collisions.

Line 70  
Only show annotations for records with `frontier=True`.

Line 74  
Specifying `target` makes the legend clickable.

Lines 75-76  
Domains: `x_domain` fixed so that the axes don’t jump around for
organization selections; `y_domain` should always span up to 1.0.

Line 81  
Use a tick format to format the x_axis value (which is a numeric
timestamp) into a pretty date string.

This plot was inspired by and includes data from the [Epoch
AI](https://epoch.ai/data/ai-benchmarking-dashboard) Benchmarking Hub.
