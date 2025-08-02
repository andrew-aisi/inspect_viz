# Scores by Model


This example illustrates the code behind the
[`scores_by_model()`](../../../view-scores-by-model.qmd) pre-built view
function. If you want to include this plot in your notebooks or websites
you should start with that function rather than the lower-level code
below.

The plot summarizes the scores of a single evaluation task, showing
performance for 13 different models. Models are ordered based upon their
headline score (defaulting to descending).

**Code**

``` python
from inspect_viz import Data
from inspect_viz.plot import plot
from inspect_viz.mark import rule_y, baseline
from inspect_viz.transform import ci_bounds

evals = Data.from_file("agi-lsat-ar.parquet")

ci_lower, ci_upper = ci_bounds(
    score="score_headline_value",
    level=0.95,
    stderr="score_headline_stderr"
)

plot(
    rule_y(
        evals,
        x="score_headline_value",
        y="model",
        sort={"y": "x", "reverse": True},
        stroke_width=4,
        stroke_linecap="round",
        marker_end="circle",
        tip=True,
        stroke="#416AD0",
    ),
    rule_y(
        evals,
        x1=ci_lower,
        x2=ci_upper,
        y="model",
        sort={"y": "x", "reverse": True},
        stroke="#416AD020",
        stroke_width=15,
    ),
    baseline(0.78, label="Human"),
    margin_left=225,
    y_label=None,
    x_label="Score",
    x_domain=[0, 1.0]
)
```

Lines 8-12  
Create transforms for upper and lower CI bounds.

Lines 15-25  
This draws the core bar chart, sorting the y-axis by the value of x
(descending).

Lines 26-34  
This draws the error bars using the upper and lower bounds.

Line 35  
Add a mark for human baseline.

Line 36  
Ensure there is room for model names in the left margin.

Line 39  
Ensure that the x axis always goes to 1.0 (even if scores are below
that).
