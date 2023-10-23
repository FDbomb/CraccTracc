# Module to find manoeuvres in GPX time series data
# Input: pandas dataframe w/ time, speed, heading
# Output: dataframe w/ type of manoeuvre, time of manoeuvre, length of manoeuvre

import pandas as pd
import numpy as np


def fix_heading(heading, true_wind):
    """Convert a heading centered on True North to a heading centered on the true wind.

    Args:
        heading (float): The heading of the boat in regards to true North.
        true_wind (float): The true wind angle.

    Returns:
        float: The heading of the boat in regards to the true wind angle, between 180 and -180 degrees.

    Raises:
        None
    """

    # TODO: Make sense of this comment lol
    #   Convention from geographiclib is azimuth is measured clockwise from N 0deg, with E 90deg, W -90deg

    # TODO: Rename this function and database column to more technical term - True Wind Angle (TWA)!
    #   Rename current 'True Wind' to 'True Wind Direction' - TWD!

    # convert heading to 0, 360 clockwise
    if heading < 0:
        heading = 360 - abs(heading)

    # center the heading to the wind angle
    heading = heading - true_wind

    # remove values past |180|, leaving bounds -180, 180
    # much much cleaner data visually, not much difference numerically
    if heading > 180:
        heading = -180 + abs(180 - heading)
    elif heading <= -180:
        heading = 180 - abs(180 + heading)

    return heading


def smooth_headings(log, df):
    """Smooth the headings in a DataFrame.

    Args:
        log (logging.Logger): The common logger object.
        df (pandas.DataFrame): The DataFrame containing the headings.

    Returns:
        pandas.DataFrame: The DataFrame with smoothed headings as a new column.

    Raises:
        None
    """

    # TODO: This function is not yet good enough.
    # Need to test if smoothing is needed at all
    # If smoothing is needed, we should flatten the heading using [sin(heading), cos(heading)]
    # This way we will have a continuous function to smoothen, rather than -180,180 or 0,360
    # After smoothing with whatever smoothing function is deemed best, use sign(sin(heading))*arccos(cos(heading)),
    #   or arctan(sin(heading), cos(heading)) to obtain the new smoothened heading values

    # TODO: realistically this should be done in gpx_paser.py
    #   or even better, seperate module to pull wind data from BOM and then clean it up

    # smooth heading using exponential weighing
    df["sm_rad_heading"] = df["rad_heading"].ewm(alpha=0.8).mean()

    # shift the smoothened radian heading toward north by the wind angle, results in the heading relative to the wind
    df["sm_rad_heading"] = df["sm_rad_heading"] - np.deg2rad(df["true_wind_angle"])
    # take modulo to bring radians back to one rotation maximum (ie in [0, 2 * pi])
    df["sm_rad_heading"].mod(2 * np.pi)
    # convert the smoothen radian heading back to degrees [0,360]
    df["sm_rel_heading"] = np.degrees(df["sm_rad_heading"])
    # split the heading into -180,180 format
    df["sm_rel_heading"] = df.apply(lambda x: fix_heading(x["sm_rel_heading"], 0), axis=1)

    # drop the now uneeded columns
    df = df.drop("sm_rad_heading", axis=1)

    log.debug(f"Smoothened the heading data in the DataFrame")
    return df


def apply_PoS(log, df):
    """Apply a Point of Sail (PoS) and tack to a DataFrame.

    Args:
        log (logging.Logger): The common logger object.
        df (pandas.DataFrame): The DataFrame to apply the PoS and tack to.

    Returns:
        pandas.DataFrame: The DataFrame with the PoS and tack applied.

    Raises:
        None
    """

    # apply point of sail map
    PoS_bounds = [0, 30, 60, 95, 180]
    PoS_labels = ["Head to Wind", "Upwind", "Reach", "Downwind"]
    df["PoS"] = pd.cut(df["rel_heading"].abs(), PoS_bounds, labels=PoS_labels, include_lowest=True, ordered=False)

    # apply tack map
    tack_bounds = [-180, 0, 180]
    tack_labels = ["Port", "Starboard"]
    df["tack"] = pd.cut(df["rel_heading"], tack_bounds, labels=tack_labels, include_lowest=True, ordered=False)

    log.debug(f"Added points of sail and tack map to DataFrame")
    return df


def manoeuvres(log, df):
    """Identify manoeuvres in a DataFrame.

    Args:
        log (logging.Logger): The common logger object.
        df (pandas.DataFrame): The DataFrame to perform the analysis on.

    Returns:
        pandas.DataFrame: The DataFrame with manoeuvres identified.

    Raises:
        None
    """

    # shift headings to -180, 180 centered around the true wind direction
    df["rel_heading"] = df.apply(lambda x: fix_heading(x["heading"], x["true_wind_angle"]), axis=1)
    log.debug(f"Calculated the True Wind Angle (TWA)")

    # smooth headings data to remove noise
    # TODO: fix this implementation, currently not good enough. Hopefully 10Hz data is better
    # df = smooth_headings(log, df)

    # apply point of sail and tack maps
    df = apply_PoS(log, df)

    # find change in heading for each data point
    # not needed right now, analyse later? if its high for extended period that's bad, if low thats great
    df["rel_heading_change"] = df["rel_heading"].diff()

    # detect tacks and gybes
    # TODO: look for points around each tack/gybe, find start point and end point maybe by looking for change in heading

    # identify all tacks and gybes by tack change
    df["manoeuvre"] = df["tack"].shift() != df["tack"]

    # round up - check we have gone from a downwind TWA to an upwind TWA
    df["roundup"] = (df["rel_heading"].shift().abs() > 90) & (df["rel_heading"].abs() <= 90)

    # bear away - check we have gone from a upwind TWA to an downwind TWA
    df["bearaway"] = (df["rel_heading"].shift().abs() <= 90) & (df["rel_heading"].abs() > 90)

    return df


def manoeuvres_analysis(log, df):
    """Create a DataFrame of manoeuvres with analysis given a DataFrame.

    Args:
        log (logging.Logger): The common logger object.
        df (pandas.DataFrame): The DataFrame containing manoeuvres.

    Returns:
        pandas.DataFrame: A new DataFrame with manoeuvres analysis applied.

    Raises:
        None
    """

    # TODO: The idea with this function is to make a new dataframe with the manoeuvres data,
    #   then we can use this to store and analyse:
    #       the number of manoeuvres, how long each manoeuvre is, time start, time exit?, p->s tack, s->p tack, etc

    # Collect all manoeuvres into a new dataframe
    # mask = df["manoeuvre"].isin(["Tack", "Gybe"])
    # man_df = df[mask]
    man_df = df[df["manoeuvre"] == True]

    return man_df
