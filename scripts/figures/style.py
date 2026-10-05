"""Shared look for the portfolio figures: dark site theme, transparent SVG, text kept as text."""
import os
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402

# site tokens (styles/globals.css)
BG = "#0b0d10"
PANEL = "#14181e"
LINE = "#212832"
LINE_STRONG = "#2e3742"
FG = "#e7ecf2"
MUTED = "#98a4b2"
DIM = "#66727f"
TEAL = "#45d0bd"      # the author's main result
ORANGE = "#f0a04b"    # comparison / baseline
RED = "#e5677f"       # failure

WIDTH_IN = 9.375      # 675 pt = 900 CSS px
PNG_DPI = 192         # 2x -> 1800 px wide

OUT = Path(__file__).resolve().parents[2] / "public" / "media" / "figures"
SVG_FONT_STACK = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"


def setup():
    # Optional: point PORTFOLIO_FONT_DIR at a folder of static Inter .ttf files so PNG text (and the SVG text
    # layout) is measured with Inter. Without it the fallbacks below are used; the SVG text still asks for Inter.
    fdir = os.environ.get("PORTFOLIO_FONT_DIR")
    if fdir:
        for f in sorted(Path(fdir).glob("*.ttf")):
            font_manager.fontManager.addfont(str(f))
    plt.rcParams.update({
        "svg.fonttype": "none",
        "svg.hashsalt": "portfolio-figures",
        "font.family": ["Inter", "Helvetica", "DejaVu Sans"],
        "font.size": 9.5,
        "text.color": FG,
        "axes.labelcolor": MUTED,
        "axes.edgecolor": LINE_STRONG,
        "axes.linewidth": 0.8,
        "axes.facecolor": "none",
        "figure.facecolor": "none",
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "xtick.labelcolor": MUTED,
        "ytick.labelcolor": MUTED,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "axes.labelsize": 9.5,
        "grid.color": LINE,
        "grid.linewidth": 0.8,
        "legend.frameon": False,
        "legend.fontsize": 9,
        "lines.solid_capstyle": "round",
    })


def clean_axes(ax, grid_axis="y"):
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(LINE_STRONG)
    ax.tick_params(length=0, pad=6)
    if grid_axis:
        ax.grid(True, axis=grid_axis, zorder=0)
    ax.set_axisbelow(True)


def header(fig, title, subtitle=None, top=0.965):
    """Title + subtitle, left-aligned to the figure's left margin (in figure coordinates)."""
    fig.text(0.012, top, title, ha="left", va="top", fontsize=13.5, fontweight="semibold", color=FG)
    if subtitle:
        fig.text(0.012, top - 0.062 * (6.0 / fig.get_figheight()), subtitle, ha="left", va="top", fontsize=9.5,
                 color=MUTED, linespacing=1.45)


def footnote(fig, text, bottom=0.018):
    fig.text(0.012, bottom, text, ha="left", va="bottom", fontsize=8, color=MUTED, linespacing=1.5)


def save(fig, name, title, desc):
    OUT.mkdir(parents=True, exist_ok=True)
    svg = OUT / f"{name}.svg"
    fig.savefig(svg, format="svg", transparent=True, metadata={"Date": None, "Creator": None})
    s = svg.read_text()
    s = re.sub(r"font-family: [^;\"]+", "font-family: " + SVG_FONT_STACK, s)
    s = re.sub(r"(<svg [^>]*>)", lambda m: m.group(1) + f"\n <title>{esc(title)}</title>\n <desc>{esc(desc)}</desc>", s, count=1)
    svg.write_text(s)
    # social-preview PNG: opaque site background so light text stays readable on any host
    fig.savefig(OUT / f"{name}.png", format="png", dpi=PNG_DPI, facecolor=BG, transparent=False)
    plt.close(fig)
    print("wrote", svg, "and .png")


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
