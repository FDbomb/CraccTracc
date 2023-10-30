# Module to parse GPX files and perform some calculations

from cracctracc.modules.gpx_parser import gpx_df
from cracctracc.modules.vkx_parser import vkx_df

# import pandas as pd
# from datetime import datetime
# import numpy as np


def sog2knots(log, df):
    # convert sog from m/s to knots
    df["sog"] = df["sog"] * 900 / 463

    return df


def add_twd(log, df, twd):
    """Add TWD to a dataframe."""
    # TODO: FIX THIS ASAP, IT'S A BIG PROBLEM
    #   this function really needs its whole own module. Either needs to be added from VKX file
    #   or calculated somehow from GPX file. Even maybe pull data from BOM is closer?
    #   Currently just setting it statically, see comments in manoeuvres>>fix_heading()
    df["twd"] = twd
    log.warning(f"TWD set statically at {twd} degrees!")

    return df


def fix_rounding(log, df):
    # Vakaros have floating point errors so need to round, GPX has no such issue
    # have chosen 4 decimal places, breaks with 5!

    sig_figs = 4
    df["sog"] = df["sog"].round(sig_figs)

    # VKX has extra columns -  leave this here for now, will parse GPX elevation at some point
    # if "alt" in df:
    #     df["alt"] = df["alt"].round(sig_figs)

    return df


def parse(log, source, source_ext):
    # MAIN SUPPORT FOR VKX!!!!!

    # chose a parser function based on source file type
    if source_ext == ".gpx":
        df = gpx_df(log, source)
    elif source_ext == ".vkx":
        df = vkx_df(log, source)

    # add speed, convert to deg etc
    # NOTE: drop first row of all formats to remove NaNs from diffs/shifting
    df = sog2knots(log, df)

    # add true wind
    df = add_twd(log, df, 150)  # TWD set statically here!!

    # fix rounding errors
    df = fix_rounding(log, df)

    # return df ready for manouvers
    return df
