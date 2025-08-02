# Scores Heatmap


This example illustrates the code behind the
[`scores_heatmap()`](../../../view-scores-heatmap.qmd) pre-built view
function. If you want to include this plot in your notebooks or websites
you should start with that function rather than the lower-level code
below.

**Code**

``` python
from inspect_viz import Data
from inspect_viz.plot import plot
from inspect_viz.mark import cell, text

evals_data = Data.from_file("evals.parquet")

plot(
    cell(
        evals_data,                                                         
        x="task_name",                                                      
        y="model",
        fill="score_headline_value",
        tip=True,
        inset=1,
        sort={
            "y": {"value": "fill", "reduce": "sum", "reverse": True},
            "x": {"value": "fill", "reduce": "sum", "reverse": False},
        },
    ),
    text(
        evals_data,
        x="task_name",
        y="model",
        text="score_headline_value",
        fill="white",
        styles={"font_weight": 600},
    ),
    padding=0,
    color_scheme="viridis",
    height=250,
    margin_left=150,
    x_label=None,
    y_label=None
)
```

Line 8  
The `cell` mark draws the cells, position each cell along the x and y
axis using the fields specified in `x` and `y`.

Line 12  
The cell’s color is determined using the field specified in the `fill`.

Line 14  
The cell inset controls the space between cells.

Lines 15-18  
Sorting of the cells is important in a heatmap to cause colors to be
grouped along the x and y axis. In this case, we sort using the sum of
the rows and columns, place the highest values at the top righ and
lowest values at the bottom left.

Line 20  
Place the value as text centered in the cell.

Line 28  
Remove plot padding so the inset along controls spacing between cells.
