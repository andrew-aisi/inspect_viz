
Above we read the data for the plot from a parquet file. This file was in turn created by reading logs into a data frame with [`evals_df()`](https://inspect.aisi.org.uk/reference/inspect_ai.analysis.html#evals_df) and then amending the data frame with log viewer links and additional model information:

```python
from inspect_ai.analysis.beta import evals_df, log_viewer, model_into, prepare

df = evals_df("logs")
df = prepare(df, 
    log_viewer("eval", 
        {"logs": "https://samples.meridianlabs.ai/"}),
    model_info()
)
df.to_parquet("{{< meta datafile>}}")
```

Note that both the log viewer links and model names are optional (the plot will render without links and use raw model strings if the data isn't prepared with `log_viewer` and `model_info`).

