from typing import Any, Literal, Sequence, Unpack

from shortuuid import uuid

from inspect_viz._util.notgiven import NOT_GIVEN, NotGiven

from .._core import Component
from .._core.param import Param
from ..interactor._interactors import Interactor
from ..layout._concat import hconcat, vconcat
from ..mark._mark import Mark
from ._attributes import PlotAttributes, plot_attributes_mosaic
from ._legend import Legend
from ._legend import legend as create_legend


def plot(
    *plot: Mark | Interactor | Legend | Sequence[Mark | Interactor | Legend],
    x_label: str | Param | None | NotGiven = NOT_GIVEN,
    fx_label: str | Param | None | NotGiven = NOT_GIVEN,
    y_label: str | Param | None | NotGiven = NOT_GIVEN,
    fy_label: str | Param | None | NotGiven = NOT_GIVEN,
    width: float | Param | None = None,
    height: float | Param | None = None,
    name: str | None = None,
    legend: Literal["color", "opacity", "symbol"] | Legend | None = None,
    **attributes: Unpack[PlotAttributes],
) -> Component:
    """Create a plot.

    Args:
        *plot: Plot elements (marks, interactors, legends)
        x_label: A textual label to show on the axis or legend; if null, show no label.
            By default the scale label is inferred from channel definitions, possibly with
            an arrow (↑, →, ↓, or ←) to indicate the direction of increasing value. Pass
            `None` for no x_label.
        fx_label:  A textual label to show on the axis or legend; if `None`, show no label. By default the scale label is inferred from channel definitions, possibly with an arrow (↑, →, ↓, or ←) to indicate the direction of increasing value.
        y_label: A textual label to show on the axis or legend; if null, show no label.
            By default the scale label is inferred from channel definitions, possibly with
            an arrow (↑, →, ↓, or ←) to indicate the direction of increasing value. Pass
            `None` for no y_label.
        fy_label:  A textual label to show on the axis or legend; if `None`, show no label. By default the scale label is inferred from channel definitions, possibly with an arrow (↑, →, ↓, or ←) to indicate the direction of increasing value.
        width: The outer width of the plot in pixels, including margins. Defaults to 700.
        height: The outer height of the plot in pixels, including margins. The default is width / 1.618 (the [golden ratio](https://en.wikipedia.org/wiki/Golden_ratio))
        name: A unique name for the plot. The name is used by standalone legend
            components to to lookup the plot and access scale mappings.
        legend: Plot legend.
        **attributes: Additional `PlotAttributes`.
    """
    # resolve items
    items: list[Mark | Interactor | Legend] = []
    for item in plot:
        if isinstance(item, (Mark, Interactor, Legend)):
            items.append(item)
        else:  # it's a sequence
            items.extend(item)

    # create plot
    components = [m.config for m in items]
    config: dict[str, Any] = dict(plot=components)

    if not isinstance(x_label, NotGiven):
        config["xLabel"] = x_label
    if not isinstance(y_label, NotGiven):
        config["yLabel"] = y_label
    if not isinstance(fx_label, NotGiven):
        config["fxLabel"] = fx_label
    if not isinstance(fy_label, NotGiven):
        config["fyLabel"] = fy_label

    # plot width and height (use quarto default if not specified)
    if width is not None:
        config["width"] = width
    else:
        config["width"] = 700
    if height is not None:
        config["height"] = height
    else:
        config["height"] = config["width"] / 1.618

    if name is not None:
        config["name"] = name

    # merge other plot options
    config = config | plot_attributes_mosaic(attributes)

    # wrap with legend if specified
    if legend is not None:
        # create name for plot and resolve/bind legend to it
        config["name"] = f"plot_{uuid()}"
        if isinstance(legend, str):
            legend = create_legend(legend, location="right")
        legend.config["for"] = config["name"]

        # handle legend location
        plot_component = Component(config=config)
        if legend.location in ["left", "right"]:
            if "width" not in legend.config:
                legend.config["width"] = 80
            if legend.location == "left":
                return hconcat(legend, plot_component)
            else:
                return hconcat(plot_component, legend)
        elif legend.location == "bottom":
            return vconcat(plot_component, legend)
        else:
            return vconcat(legend, plot_component)
    else:
        return hconcat(Component(config=config))
