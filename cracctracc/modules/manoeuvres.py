# Module to find manoeuvres in GPX time series data
# Input: pandas dataframe w/ time, speed, heading
# Output: dataframe w/ type of manoeuvre, time of manoeuvre, length of manoeuvre

import pandas as pd
import numpy as np


def hdg2twa(hdg, twd):
    """Convert a heading to TWA given the TWD.

    Args:
        heading (float): The heading or course over ground of the boat in regards to true North.
        true_wind (float): The True Wind Direction.

    Returns:
        float: The True Wind Angle of the boat, between 180 and -180 degrees.

    Raises:
        None
    """

    # TODO: Make sense of this comment lol
    #   Convention from geographiclib is azimuth is measured clockwise from N 0deg, with E 90deg, W -90deg

    # TODO: Rename this function and database column to more technical term - True Wind Angle (TWA)!
    #   Rename current 'True Wind' to 'True Wind Direction' - TWD!

    # convert heading to 0, 360 clockwise
    if hdg < 0:
        hdg = 360 - abs(hdg)

    # center the heading to the wind angle
    twa = hdg - twd

    # remove values past |180|, leaving bounds -180, 180
    # much much cleaner data visually, not much difference numerically
    if twa > 180:
        twa = -180 + abs(180 - twa)
    elif twa <= -180:
        twa = 180 - abs(180 + twa)

    return twa


def apply_PoS(log, df):
    """Apply a Point of Sail (PoS) and tack to a DataFrame.

    Args:
        log (logging.Logger): The common logger object.
        df (pandas.DataFrame): A DataFrame to containing TWA data.

    Returns:
        pandas.DataFrame: The DataFrame with the PoS and tack applied.

    Raises:
        None
    """

    # apply point of sail map
    PoS_bounds = [0, 30, 60, 95, 180]
    PoS_labels = ["Head to Wind", "Upwind", "Reach", "Downwind"]
    df["PoS"] = pd.cut(df["twa"].abs(), PoS_bounds, labels=PoS_labels, include_lowest=True, ordered=False)

    # apply tack map
    tack_bounds = [-180, 0, 180]
    tack_labels = ["Port", "Starboard"]
    df["tack"] = pd.cut(df["twa"], tack_bounds, labels=tack_labels, include_lowest=True, ordered=False)

    log.debug("Added points of sail and tack map to DataFrame")
    return df


def identify_manoeuvres(log, df):
    """Identify manoeuvres in a DataFrame.

    Args:
        log (logging.Logger): The common logger object.
        df (pandas.DataFrame): A DataFrame with tack and twa data.

    Returns:
        pandas.DataFrame: The DataFrame with manoeuvres identified.

    Raises:
        None
    """

    # TODO: look for points around each tack/gybe, find start point and end point maybe by looking for change in heading

    # define the conditions and values for each case
    conditions = [
        # find tacks and gybes using change in tack and TWA
        (df["tack"].shift() != df["tack"]) & (df["twa"].abs() <= 90),
        (df["tack"].shift() != df["tack"]) & (df["twa"].abs() > 90),
        # round up - check we have gone from a downwind TWA to an upwind TWA
        (df["twa"].shift().abs() > 90) & (df["twa"].abs() <= 90),
        # bear away - check we have gone from a upwind TWA to an downwind TWA
        (df["twa"].shift().abs() <= 90) & (df["twa"].abs() > 90),
    ]
    values = ["tack", "gybe", "roundup", "bearaway"]

    # apply the conditions and values using numpy.select
    df["manoeuvre"] = np.select(conditions, values, default=np.nan)

    return df


def manoeuvres(log, df):
    """Proccess DataFrame to identify manoeuvres.

    Args:
        log (logging.Logger): The common logger object.
        df (pandas.DataFrame): The DataFrame to perform the analysis on.

    Returns:
        pandas.DataFrame: The DataFrame with manoeuvres identified.

    Raises:
        None
    """

    # shift headings to -180, 180 centered around the true wind direction
    df["twa"] = df.apply(lambda x: hdg2twa(x["hdg"], x["twd"]), axis=1)
    log.debug("Calculated the True Wind Angle (TWA)")

    # apply point of sail and tack maps
    df = apply_PoS(log, df)

    # find change in heading for each data point
    # not needed right now, analyse later? if its high for extended period that's bad, if low thats great
    # df["twa_change"] = df["twa"].diff()

    # detect manouevres
    df = identify_manoeuvres(log, df)

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
    mask = df["manoeuvre"].isin(["tack", "gybe", "roundup", "bearaway"])
    man_df = df[mask]

    return man_df
