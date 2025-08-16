# Sample Heatmap


This example illustrates the code behind the
[`sample_heatmap()`](../../../view-sample-heatmap.qmd) pre-built view
function. If you want to include this plot in your notebooks or websites
you should start with that function rather than the lower-level code
below.

**Code**

``` python
from inspect_viz import Data
from inspect_viz.plot import plot, legend
from inspect_viz.mark import cell, text
from inspect_viz.transform import avg
from inspect_ai.analysis import samples_df,SampleSummary, EvalModel
from inspect_ai.analysis import prepare, model_info, log_viewer


samples_data = Data.from_file("writing_bench_samples.parquet")

channels = {
    "Model": "model_display_name",
    "Score": "score_multi_scorer_wrapper",
    "Log viewer": "log_viewer"
}

plot(
    cell(
        samples_data,
        x="id",
        y="model_display_name",
        fill="score_multi_scorer_wrapper",
        channels=channels,
        tip=True,
        inset=1, 
        sort={
            "y": {  "value": "fill",
                    "reduce": "sum",
                    "reverse": True
                },
            "x": {  "value": "fill",
                    "reduce": "sum",
                    "reverse": False
                }
        }   
    ),
    padding=0,
    color_scheme="greens",
    height=250,
    margin_left=50,
    x_label=None,
    y_label=None,
    x_scale="band",
    legend=legend("color", frame_anchor="bottom", border=False)

)
```

Line 9  
Read the data (the parquet file was generated using `samples_df` with
`SampleSummary` and `EvalModel` column definitions.)

Lines 11-14  
Channels are used to customize what is display in the tooltip for each
cell.

Line 18  
Use a cell mark to create each colored cell.

Line 22  
The fill is used to compute the color for each cell.

Lines 27-30  
Sorts the y-axis by the total score for each model, with the highest
score at the top.

Lines 31-33  
Sorts the x-axis by the total score for each question, witht he highest
score at the right.
