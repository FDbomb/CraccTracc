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
    ax1.plot(df["lat"], df["lon"])
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
