# Notebooks


## Overview

A convenient way to share sets of plots and related commentary is to
publish a notebook. There are a couple of straightforward ways to create
HTML documents from notebooks ([Quarto](#quarto) and
[nbconvert](#nbconvert)), and then these documents can in turn be
printed to PDF if required.

You can also share a live version of a notebook that supports filtering
and plot interactions by pubishing it on a platform like [Google
Colab](https://colab.research.google.com/).

## Quarto

The [Quarto](https://quarto.org) publishing system can also convert
notebooks to HTML. To install the `quarto-cli` Python package:

``` bash
pip install quarto-cli
```

Then, convert any notebook which includes Inspect Viz plots as follows:

``` bash
quarto render notebook.ipynb --to html --execute
```

This will create an HTML file named “notebook.html” and a directory
named “notebook_files” alongside the “notebook.ipynb”.

> [!IMPORTANT]
>
> The `--execute` flag is required to ensure that all Inspect Viz
> outputs are properly rendered (as some notebook front ends like VS
> Code don’t properly cache Jupyter Widget outputs).

#### Preview

To work on a notebook with a live updating preview, use the
`quarto preview` command:

``` bash
quarto preview notebook.ipynb --to html --execute
```

#### Code Blocks

You can also specify that you’d to disable display of code blocks using
the `-M echo:false` option:

``` bash
quarto render notebook.ipynb --to html --execute -M echo:false
```

If you need a PDF version of the notebook, open the file in a browser
and print to PDF.

#### Publishing

You can use the [Quarto Publish](https://quarto.org/docs/publishing/)
command to publish a notebook to GitHub Pages, Hugging Face Spaces,
Netlify, or Quarto’s own publishing service.

To publish a notebook, pass it to the `quarto publish` command:

``` bash
quarto publish notebook.ipynb
```

## nbconvert

The [nbconvert](https://nbconvert.readthedocs.io/en/latest/) Python
package enables export of any Jupyter notebook to HTML. Install
`nbconvert` with:

``` bash
pip install nbconvert
```

Then, convert any notebook which includes Inspect Viz plots as follows:

``` bash
jupyter nbconvert --to html --execute notebook.ipynb
```

This will create an HTML file named “notebook.html” alongside the
“notebook.ipynb”.

> [!IMPORTANT]
>
> The `--execute` flag is required to ensure that all Inspect Viz
> outputs are properly rendered (as some notebook front ends like VS
> Code don’t properly cache Jupyter Widget outputs).

#### Code Cells

You can also specify that you’d like code cells removed using the
`--no-input` option:

``` bash
jupyter nbconvert --to html --execute --no-input notebook.ipynb
```

If you need a PDF version of the notebook, open the file in a browser
and print to PDF.
