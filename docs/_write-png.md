``` python
from inspect_viz import Data
from inspect_viz.mark import dot
from inspect_viz.plot import plot, write_png

penguins = Data.from_file("penguins.parquet")

pl = plot(
    dot(penguins, x="body_mass", y="flipper_length",  
        stroke="species", symbol="species"),
    legend="symbol",
    grid=True
)

write_png("penguins.png", pl)
```
