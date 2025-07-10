## Data

In the examples above we made `Data` available by reading from a parquet file. We can also read data from any Python Data Frame (e.g. Pandas, Polars, PyArrow, etc.). For example:

```python
import pandas as pd
from inspect_viz import Data

# read directly from file
penguins = Data.from_file("penguins.parquet")

# read from Pandas DF (i.e. to preprocess first)
df = pd.read_parquet("penguins.parquet")
penguins = Data.from_dataframe(df)
```

You might wonder why is there a special `Data` class in Inspect Viz rather than using data frames directly?  This is because Inpsect Viz is an interactive system where data can be dynamically filtered and transformed as part of plotting---the `Data` therefore needs to be sent to the web browser rather than remaining only in the Python session. This has a couple of important implications:

1. Data transformations should be done using standard Python Data Frame operations _prior_ to reading into `Data` for Inspect Viz. 

2. Since `Data` is embedded in the web page, you will want to filter it down to only the columns required for plotting (as you don't want the additional columns making the web page larger than is necessary).

