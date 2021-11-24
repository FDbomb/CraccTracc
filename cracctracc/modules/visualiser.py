# Module to visualise CraccTracc output data
# Input: pandas dataframe
# Output: n/a

import matplotlib.pyplot as plt


def plot(log, df):

    fig = plt.figure()

    ax1 = fig.add_subplot(211)
    ax2 = fig.add_subplot(234)
    ax3 = fig.add_subplot(235)
    ax4 = fig.add_subplot(236, projection="polar")

    # plot scatter of path travelled
    ax1.plot(df["lon"], df["lat"])
    ax1.set_title("Course")

    # plot speed vs time
    ax2.plot(df["time"], df["knots"])
    ax2.set_title("Speed over time")

    # plot heading vs time
    ax3.plot(df["time"], df["heading"])
    ax3.set_title("Heading over time")

    ax4.plot(df["rad_heading"], df["knots"])
    ax4.set_title("Polarized")

    plt.show()


def plot2(df):

    fig = plt.figure()
    ax1 = fig.add_subplot(121)
    ax2 = fig.add_subplot(122, projection="polar")

    # plot speed vs time
    # ax1.plot(df["time"], df["knots"] ** 2)
    # ax1.set_title("Speed over time")

    # plot heading vs time
    ax1.plot(df["time"], df["rel_heading"])
    ax1.set_title("Heading over time")

    ax1.plot(df["time"], df["smooth_rel_heading"])
    ax1.set_title("Heading over time")

    ax2.plot(df["rad_heading"], df["knots"])
    ax2.set_title("Polarized")

    plt.show()
