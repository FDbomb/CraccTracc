# Module to visualise CraccTracc output data
# Input: pandas dataframe
# Output: n/a

import matplotlib.pyplot as plt


def dashboard(log, df):
    fig = plt.figure(0)

    ax1 = fig.add_subplot(211)
    ax2 = fig.add_subplot(234)
    ax3 = fig.add_subplot(235)
    ax4 = fig.add_subplot(236, projection="polar")

    # plot scatter of path travelled
    ax1.plot(df["lon"], df["lat"])
    ax1.set_title("Course")

    # plot speed vs time
    ax2.plot(df["UTC"], df["sog"])
    ax2.set_title("Speed over time")

    # plot heading vs time
    ax3.plot(df["UTC"], df["hdg"])
    ax3.set_title("Heading over time")

    ax4.plot(df["cog"], df["sog"])
    ax4.set_title("Polarized")


def true_wind(log, df):
    fig = plt.figure(1)
    ax1 = fig.add_subplot(121)
    ax2 = fig.add_subplot(122)

    # plot heading vs time
    ax1.plot(df["UTC"], df["twd"])
    ax1.set_title("Wind direction over time")

    # plot heading vs time
    ax2.plot(df["UTC"], df["tws"])
    ax2.set_title("Wind speed over time")


def plot(log, df, y, x="UTC"):
    """Plot y vs x (default x=UTC) where x and y are column names from the pd.DataFrame"""
    fig = plt.figure(2)
    ax1 = fig.add_subplot(111)

    ax1.plot(df[x], df[y])
    ax1.set_title(f"{y} over {x}")


def show_plots(log):
    plt.show()  # TODO: Show plots in non-blocking manner - block=False
    log.debug(f"{len(plt.get_fignums())} plots displayed")


def close_plots(log):
    num_plots = len(plt.get_fignums())
    plt.close("all")
    if len(plt.get_fignums()) == 0:
        log.debug(f"{num_plots} plots closed")
    else:
        log.warning("Error closing plots")
