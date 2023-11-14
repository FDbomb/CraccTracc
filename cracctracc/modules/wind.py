# Module to add wind data to dataframe

import json
from urllib.request import urlopen

import numpy as np

# import pandas as pd
# if we need to do more complex requests, use the 3rd party requests module


# PLAN #
# [x] one function to add fixed wind data
# [ ] one function to pull in wind data from BOM/WillyWeather/OpenWeather
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

    y = np.mod(np.interp(x, xp, np.unwrap(fp, period=period)), period)
    return y


def fixed_twd(log, df, twd=0):
    """Add TWD to a dataframe."""
    df["twd"] = twd
    log.warning(f"TWD set statically at {twd} degrees!")

    return df


def bom_twd(log, df):
    """Add TWD to a dataframe from WillyWeather/OpenWeatherMap data."""

    # get start time and end time
    date = "2023-10-28"
    # for willy weather data
    source = (
        "https://www.willyweather.com.au/climate/weather-stations/graphs.json?graph="
        "station:733,"
        f"startDate:{date},"
        f"endDate:{date},"
        "grain:hourly,"
        "series=order:4,id:wind-speed,type:climate,"
        "series=order:5,id:wind-direction,type:climate"
    )

    # query api
    res = urlopen(source)

    # parse data
    res_body = res.read()  # .decode()
    res_body = json.loads(res_body)

    # get the wind data as a list. first extract the data from the json
    wind_data = res_body["data"]["climateGraphs"]["wind-speed"]["dataConfig"]["series"]["groups"][0]["points"]
    # need to UTC convert to unix milisecs
    wind_data = [(point["x"] * 1000, point["y"], point["direction"]) for point in wind_data]
    # wind data = [(time, speed, direction), ...]

    log.debug(f"Wind data from {date}: {wind_data}")

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
    df["tws"] = np.interp(x, xp, fp)

    # add to dataframe
    return df


def estimated_twd(log, df):
    # using the bom twd and shift angles
    # try to calculate/estimate a closer approximation of true wind
    return df


def add_twd(log, df, twd=0):
    df = bom_twd(log, df)
    return df
