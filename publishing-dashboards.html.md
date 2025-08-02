# Dashboards


## Overview

[Quarto Dashboards](https://quarto.org/docs/dashboards/) are a special
type of Quarto website optimized for publishing easily navigable sets of
plots and tables. Features of Quarto Dashboards include:

1.  Many flexible ways to layout components (row or column based,
    tabsets, multiple pages, etc.) including responsive layout for
    mobile devices.

2.  A variety of ways to present inputs for interactivity including
    toolbars, sidebars, and card-level inputs.

3.  Dozens of available themes including the ability to create your own
    themes.

## Example

Here is the [Scores
Timeline](examples/inspect/scores-timeline/index.qmd) example from this
repository re-written as a dashboard (this is a live dashboard embedded
as an iframe):

<iframe src="https://jja.quarto.pub/capabilities-timeline/" style="width: 100%; height: 800px;" class="border column-body-outset-right"></iframe>

Below is the source code for this dashboard. You’ll notice that this
looks quite similar to the code for any other Quarto document, but
level-two headings (`##`) have been added to denote a toolbar and
dashboard rows (additional headings could be used to create columns and
tabsets).

```` python
---
title: "Capabilities Timeline"
format: dashboard
---

```{python}
from inspect_viz import Data, Param
from inspect_viz.input import select
from inspect_viz.mark import dot
from inspect_viz.plot import plot
from inspect_viz.table import table, column
from inspect_viz.view.beta import scores_timeline
from inspect_viz.input import checkbox_group, select

evals = Data.from_file("benchmarks.parquet")
```

## {.sidebar}

```{python}
select(
    evals,
    column="task_name",
    value="auto",
    label="Benchmark"
)

checkbox_group(
    evals, 
    column="model_organization_name", 
    label="Organization"
)
```

***

Benchmark data from the Epoch AI [Benchmarking Hub](https://epoch.ai/data/ai-benchmarking-dashboard).

## Column

### Row {height=60%}

```{python}
scores_timeline(evals, filters=False)
```

### Row {height=40%}

```{python}
table(
    evals, 
    columns=[
        column("model_organization_name", label="Organization"),
        column("model_display_name", label="Model"),
        column("model_release_date", label="Release Date"),
        column("score_headline_value", label="Score", width=100),
        column("score_headline_stderr", label="StdErr", width=100),
    ]
)
```
````

## Notebook Execution

When using Inspect Viz with Quarto Websites you should always add the
following configuration to your `_quarto.yml` to specify that notebooks
should be fully executed when rendered:

**\_quarto.yml**

``` yaml
execute: 
  enabled: true
```

## Learning More

- See the [Quarto Dashboards](https://quarto.org/docs/dashboards/)
  documentation for additional details on creating dashboards.

- See the [Dashboard
  Examples](https://quarto.org/docs/gallery/#dashboards) to get an idea
  for the sorts of layouts and themes that are available and to see the
  source code for a variety of dashboard types.
