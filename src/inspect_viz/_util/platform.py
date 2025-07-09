import os


def running_in_quarto() -> bool:
    return "QUARTO_FIG_WIDTH" in os.environ.keys()


def running_in_colab() -> bool:
    try:
        import google.colab  # type: ignore # noqa: F401

        return True
    except ImportError:
        return False


def quarto_fig_size() -> tuple[int, int] | None:
    if running_in_quarto():
        fig_width = os.environ.get("QUARTO_FIG_WIDTH", "")
        fig_height = os.environ.get("QUARTO_FIG_HEIGHT", "")
        if fig_width and fig_height:
            return (int(float(fig_width) * 96), int(float(fig_height) * 96))

    return None
