# Tool Calls


This example illustrates the code behind the
[`tool_calls()`](../../../reference/inspect_viz.view.qmd#tool_calls)
pre-built view function. If you want to include this plot in your
notebooks or websites you should start with that function rather than
the lower-level code below.

The plot visualizes tool usage over a series of turns in a Cybench
evaluation. We use a `cell()` mark to visualize tool use over messages
in each sample of an evaluation. We note any limit that ended the sample
using a `text()` mark on the right side of the frame.

**Code**

``` python
from inspect_viz import Data
from inspect_viz.plot import plot, legend
from inspect_viz.mark import cell, text
from inspect_viz.transform import first

# read data (see 'Data Preparation' below)
data = Data.from_file("cybench_tools.parquet")

tools = ["bash", "python", "submit"]

plot(
    cell(
        data,
        x="order",
        y="id",
        fill="tool_call_function"
    ),
    
    text(
        data, 
        text=first("limit"), 
        y="id",
        frame_anchor="right", 
        font_size=8, 
        font_weight=200,
        dx=50
    ),
    legend=legend("color", frame_anchor="right"),
    margin_top=0,
    margin_left=20,
    margin_right=100,
    x_ticks=list(range(0, 400, 80)),
    y_ticks=[],
    x_label="Message",
    y_label="Sample",
    color_label="Tool",
    color_domain=tools
)
```

Line 7  
Read tool call data (see [Data
Preparation](../../../view-tool-calls.qmd#data-preparation) for
details).

Lines 12,17  
`cell()` mark showing tool calls.

Lines 19,27  
`text()` mark showing whether the sample terminated due to a limit.

Lines 29,31  
Tweak the margins so the axis labels and text annotations appear
correctly.

Lines 32-33  
Reduce the number of tick marks on the x-axis and eliminate y-ticks.

Lines 34-36  
Set some custom labels and ensure that tools follow our designed order.

Line 37  
Specify which tools we should show and in what order.
