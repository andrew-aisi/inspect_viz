
Above we read the data for the plot from a parquet file. This file was in turn created by reading logs into a data frame with [`evals_df()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#evals_df) and then amending the data frame with log viewer links:

```python
from inspect_ai.analysis.beta import evals_df, log_viewer, prepare

df = evals_df("logs")
df = prepare(df, 
    log_viewer("eval", {"logs": "https://samples.meridianlabs.ai/"})
)
df.to_parquet("{{< meta datafile>}}")
```

Note that the log viewer links are optional (the plot will render without links if they are not specified).

