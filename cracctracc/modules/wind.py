# Module to add wind data to dataframe
from __future__ import annotations

import json
from typing import TYPE_CHECKING
from urllib.request import urlopen

import matplotlib.pyplot as plt
import numpy as np

# if we need to do more complex requests, use the 3rd party requests module

if TYPE_CHECKING:
    import logging

    import pandas as pd

# PLAN #
# [x] one function to add fixed wind data
# [x] one function to pull in wind data from BOM/WillyWeather/OpenWeather
# [ ] one function to estimate wind data (using the above function as input)


def angular_interpolation(x: np.ndarray, xp: np.ndarray, fp: np.ndarray, period: float = 360) -> np.ndarray:
    """
    One dimensional linear interpolation for monotonically increasing sample points where points first are unwrapped,
    secondly interpolated and finally bounded within the specified period.

    Args:
        x (np.ndarray): The x-coordinates at which to evaluate the interpolated values.
        xp (np.ndarray): The x-coordinates of the data points, must be increasing.
        fp (np.ndarray): The y-coordinates of the data points, same length as `xp` with range [0, 360].
        period (float): Size of the range over which the input wraps.

    Returns:
        np.ndarray: The interpolated values, same shape as `x`.

    Raises:
        None
    """
    # unwrap and interpolate values
    interp_vals = np.interp(x, xp, np.unwrap(fp, period=period))
    # wrap values back into the range [0, 360]
    interp_vals = np.mod(interp_vals, period)
    # convert to int
    interp_vals = interp_vals.astype(int)

    return interp_vals


def get_wind_data(log: logging.Logger, date: str) -> dict:
    """Get wind data from WillyWeather for a given date.

    Args:
        log (logging.Logger): Logger to log to.
        date (str): Date to get wind data for in the format "YYYY-MM-DD".

    Returns:
        dict: Wind data for the given date.

    Raises:
        None
    """

    file_path = f"data/wind/{date}.json"
    # check if the file already exists and load from there if possible
    # TODO: in production minor speedup by checking if the file exists first - LBYL style
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
            log.debug(f"Loaded wind data from {file_path}")
    # if the file doesn't exist, download the data
    except FileNotFoundError:
        source = "https://www.willyweather.com.au/climate/weather-stations/graphs.json"
        config = (
            "?graph="
            "station:733,"
            f"startDate:{date},"
            f"endDate:{date},"
            "grain:hourly,"
            "series=order:1,id:wind-speed,type:climate,"
            "series=order:2,id:wind-direction,type:climate"
        )
        # this endpoint of willyweather returns the wind speed and wind direction in 10 minute intervals
        #   for the whole date

        # query API
        res = urlopen(source + config)

        # parse data
        res_body = res.read().decode()
        data = json.loads(res_body)
        log.debug(f"Downloaded wind data from {source}")

        # save the data to a file for future use
        with open(file_path, "w") as f:
            json.dump(data, f)

    return data


def filter_wind_data(log: logging.Logger, df: pd.DataFrame, resp_data: dict) -> list[tuple[int, float, int]]:
    """Filter wind data from WillyWeather to only include the wind speed and direction.

    Args:
        log (logging.Logger): Logger to log to.
        df (pd.DataFrame): Dataframe with race data.
        data (dict): Wind data to filter.

    Returns:
        list: Filtered wind data in the format [(time (unix miliseconds), speed (knots), direction (degrees)), ...].

    Raises:
        None
    """

    # filter the data to only include the wind speed and direction
    # NOTE: there is more useful data to extract from here for future features
    resp_data = resp_data["data"]["climateGraphs"]["wind-speed"]["dataConfig"]["series"]["groups"][0]["points"]
    # wind_data = [{},{},...]

    # trim the wind data to the same period as the race plus 3 extra points on each side for interpolation
    dp_interval = 600000  # 10 minutes interval between data points
    extra_dps = 3  # extra data points we require
    extra_buffer = dp_interval * extra_dps
    race_start = df["UTC"].iloc[0] - extra_buffer
    race_end = df["UTC"].iloc[-1] + extra_buffer

    """ TODO: BIG DISCLAIMER: not sure how this will work with daylight savings. Should be fine."""
    timezone_offset = 1 * 60 * 60 * 11  # 11 hours in seconds

    wind_data = []
    for point in resp_data:
        # point = { x: unix seconds for AUS timezone, y: speed in m/s, direction: degrees, ...}
        time = (point["x"] - timezone_offset) * 1000  # multipy by 1000 to convert to miliseconds

        if race_start <= time <= race_end:
            tws = np.round(point["y"] / 1.852, 1)  # convert from km/h to knots and round
            twd = point["direction"]
            wind_data.append((time, tws, twd))

    # wind data = [(time, speed, direction), ...]
    log.debug(f"Filtered wind data to {len(wind_data)} points")
    return wind_data


def fixed_twd(log: logging.Logger, df: pd.DataFrame, twd: int = 0) -> pd.DataFrame:
    """Add a fixed TWD to a dataframe. Least useful twd method for its bad accuracy."""

    df["twd"] = twd

    log.warning(f"TWD set statically at {twd} degrees!")
    return df


def bom_twd(log: logging.Logger, df: pd.DataFrame) -> pd.DataFrame:
    """Add TWD to a dataframe from WillyWeather/OpenWeatherMap data."""

    # get start time and end time
    date = "2023-10-28"
    wind_data = get_wind_data(log, date)  # time this? see if can optimise / log too see
    wind_data = filter_wind_data(log, df, wind_data)

    # upsample to 10 min intervals? 20 min intervals? and then fill df with these values?
    # or interpolate for each point as we have here - doesn't seem to have perfomance issues?
    # TODO: decide on interval

    # interpolate wind direction for each point in df
    x = df["UTC"].to_numpy()
    xp = np.array([point[0] for point in wind_data])
    fp = np.array([point[2] for point in wind_data])
    df["twd"] = angular_interpolation(x, xp, fp, period=360)

    # interpolate wind speed for each point in df
    fp = np.array([point[1] for point in wind_data])
    df["tws"] = np.round(np.interp(x, xp, fp), 1)

    """
    # TODO: remove this once properly tested
    # plot heading vs time
    plt.scatter(xp, [point[2] for point in wind_data], label="WW twd")
    plt.plot(x, df["twd"], label="DF twd")
    plt.legend()
    plt.show()
    log.debug(f"{len(plt.get_fignums())} plots displayed")
    """

    return df


def estimated_twd(log: logging.Logger, df: pd.DataFrame) -> pd.DataFrame:
    # TODO: figure the logic for this function
    # using the bom twd and shift angles
    # try to calculate/estimate a closer approximation of true wind

    # to figure out the wind angle - try to minimise the difference between twa on starboard and port
    # like take the average angle on the port stint, and the average angle on the starboard stint
    # and then set twd to make those averages as equal as possible
    # wont work due to the wind shifts and generally should be sailing the lifted tack but idk might work

    return df


def add_twd(log: logging.Logger, df: pd.DataFrame, twd: int = 0) -> pd.DataFrame:
    # TODO: this should act as the main function and decide which twd method to call
    # right now just calls bom_method with hardcoded date

    df = bom_twd(log, df)

    return df
