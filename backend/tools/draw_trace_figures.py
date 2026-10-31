"""Draw the three electrophysiology figures of the Data page from .abf recordings.

    pip install pyabf matplotlib
    python tools/draw_trace_figures.py <folder with the .abf files> ../frontend/src/assets/data

The .abf files are the recordings' download links in data/internal/electrophysiologies.json
(95912005, 95810035 and 98513011).

Transparent background, light ink, the sweeps from -0.8 nA up to the strongest step
overlaid (one distinct colour each, blue to red, strongest on top), scale bars instead of axes,
and the current steps underneath in the same colours.
"""
import sys
import numpy as np
import pyabf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

INK = "#dde1f0"
# distinct, softened colours, from blue (most negative step) to red (strongest step)
GRADIENT = ["#7a96de", "#5bb1c4", "#63b690", "#b6bf6e", "#d0af6a", "#ce8c67", "#ca6e7a"]
AMPS = [-0.8, -0.4, 0.2, 0.4, 0.6, 0.8, 1.0]

def spikes(y):
    return int(((y[1:] > -10) & (y[:-1] <= -10)).sum())

def draw(path, out, width, height, t_end=0.48):
    abf = pyabf.ABF(path)
    rate = abf.dataRate
    sweeps = []
    for s in range(abf.sweepCount):
        abf.setSweep(s)
        sweeps.append((abf.sweepC[np.argmax(abs(abf.sweepC))], abf.sweepY.copy(), abf.sweepC.copy()))
    chosen = [min(sweeps, key=lambda sw: abs(sw[0] - a)) for a in AMPS]
    chosen = [sw for i, sw in enumerate(chosen) if abs(sw[0] - AMPS[i]) < 0.05]
    colors = GRADIENT[-len(chosen):] if len(chosen) < len(GRADIENT) else GRADIENT

    n = int(t_end * rate)
    t = np.arange(n) / rate * 1000
    fig = plt.figure(figsize=(width / 100, height / 100), dpi=200)
    fig.patch.set_alpha(0)
    v = fig.add_axes([0.04, 0.25, 0.92, 0.72])
    c = fig.add_axes([0.04, 0.03, 0.92, 0.19], sharex=v)
    for ax in (v, c):
        ax.set_axis_off()
        ax.patch.set_alpha(0)
    for (amp, y, cmd), color in zip(chosen, colors):
        v.plot(t, y[:n], color=color, lw=0.9, solid_joinstyle="round")
        c.plot(t, cmd[:n], color=color, lw=0.9)
    lo = min(sw[1][:n].min() for sw in chosen)
    hi = max(sw[1][:n].max() for sw in chosen)
    # room under the lowest trace for the scale bars
    v.set_ylim(lo - 40, hi + 4)
    v.set_xlim(0, t[-1])
    # scale bars, bottom right below the traces: 100 ms and 20 mV
    x1, y0 = t[-1] - 4, lo - 28
    v.plot([x1 - 100, x1], [y0, y0], color=INK, lw=1.4, solid_capstyle="butt")
    v.plot([x1, x1], [y0, y0 + 20], color=INK, lw=1.4, solid_capstyle="butt")
    fs = 7 if width < 700 else 8
    v.text(x1 - 50, y0 - 2, "100 ms", color=INK, ha="center", va="top", fontsize=fs)
    v.text(x1 - 6, y0 + 12, "20 mV", color=INK, ha="right", va="center", fontsize=fs)
    fig.savefig(out, transparent=True)
    plt.close(fig)
    print(out, [f"{a:+.1f} nA: {spikes(y)} spikes" for a, y, _ in chosen])

if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    draw(f"{src}/95912005.abf", f"{dst}/trace_1.png", 460, 400)
    draw(f"{src}/95810035.abf", f"{dst}/trace_2.png", 420, 260)
    draw(f"{src}/98513011.abf", f"{dst}/trace_3.png", 420, 260)
