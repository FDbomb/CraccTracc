# Module to find manoeuvres in GPX time series data
# Input: pandas dataframe w/ time, speed, heading
# Output: dataframe w/ type of manoeuvre, time of manoeuvre, length of manoeuvre

import matplotlib.pyplot as plt
import pandas as pd


def plott(df):

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


# given list of headings in geographiclib, convert to 360 clockwise from reference angle
def fix_heading(heading):
    # NOTE!!!!! - new module adds true wind column to df. This allows each point to have its own true
    #   wind which should be more accurate than one wind for the race and also, will allow this code
    #   to easily manage cleaning up winds. Maybe even this fix_heading function really would belong
    #   in that module

    # true wind angle
    true_wind = 150

    # convert heading to 0, 360 clockwise
    if heading < 0:
        heading = 360 - abs(heading)

    # center the heading to the wind angle
    heading = heading - true_wind

    # remove values past |180|, leaving bounds -180, 180
    # much much cleaner data visually, not much numerically
    # different tho
    if heading > 180:
        heading = -180 + abs(180 - heading)
    elif heading <= -180:
        heading = 180 - abs(180 + heading)

    return heading


def manoeuvres(log, df):

    # clean up heading with true wind
    #   realistically this should be done in gpx_paser.py
    #   or even better, seperate module to pull wind data from BOM and then clean

    #   Convention from geographiclib is azimuth is measured clockwise from N
    #   0deg, with E 90deg, W -90deg

    # need to shift headings to -180, 180 centered around the true wind direction
    df["rel_heading"] = df["heading"].map(fix_heading)

    # smooth out data, moving average over 5 points
    # doesn't actually do that much idk lol
    df["smooth_rel_heading"] = df["rel_heading"].rolling(5, center=True).mean()

    # apply point of sail map
    PoS_bounds = [0, 30, 90, 170, 180]
    PoS_labels = ["Manoeuvre", "Upwind", "Downwind", "Manoeuvre"]
    # x = pd.cut(df["smooth_rel_heading"].abs(), pd.IntervalIndex.from_breaks(PoS_bounds, closed="left"))
    df["PoS"] = pd.cut(
        df["smooth_rel_heading"].abs(), PoS_bounds, labels=PoS_labels, include_lowest=True, ordered=False
    )

    # apply tack map
    tack_bounds = [-180, 0, 180]
    tack_labels = ["Port", "Starboard"]
    df["tack"] = pd.cut(df["smooth_rel_heading"], tack_bounds, labels=tack_labels, include_lowest=True, ordered=False)

    # calculate manoeuvers from heading catagories
    #   store manoeuvers - time start, time exit?, p->s tack, s->p tack

    return df


if __name__ == "__main__":

    df = pd.read_pickle("data/activity_7737592803.pkl")
    df = manoeuvres(0, df)
    plott(df)
