# Module to parse GPX files and perform some calculations
from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime
from typing import TYPE_CHECKING

import pandas as pd
from geographiclib.geodesic import Geodesic

if TYPE_CHECKING:
    from logging import Logger


def calc_distance(log: Logger, lat1: float, lon1: float, lat2: float, lon2: float) -> tuple[float, float]:
    # lat long inputs need to be floats for geographiclib

    # use WGS-84 ellipsoid = most globally accurate. Accurate to round-off and always converges
    g: dict[str, float] = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2)  # type: ignore
    # g = {'lat1': XX, 'lon1': XX, 'lat2': XX, 'lon2': XX, 'a12': XX, 's12': 5.066904469936966,
    #   'azi1': -35.80482359294056, 'azi2': -35.804805771546704}

    assert g["s12"] is float
    assert g["azi1"] is float

    # gives (dist, cog)
    return g["s12"], g["azi1"]


def calc_sog_cog(log: Logger, df: pd.DataFrame) -> pd.DataFrame:
    # calculate time delta between points, and add to the dataframe
    df["delta"] = df["UTC"].diff().fillna(0) / 1000

    # use list comprehension to efficiently get lat/long data
    result = [
        calc_distance(log, lat1, lon1, lat2, lon2)
        for lat1, lon1, lat2, lon2 in zip(df["lat"].shift(), df["lon"].shift(), df["lat"], df["lon"])
    ]

    # result = [[dist, heading], [dist, heading], ..]
    df[["dist", "cog"]] = result

    # calculate speed over ground
    df["sog"] = df["dist"] / df["delta"]
    df = df.drop(columns=["dist", "delta"])

    return df


def unpack_gpx(log: Logger, source: str) -> list[tuple[int, float, float]]:
    # open GPX file using XML parser
    tree = ET.parse(source)
    root = tree.getroot()

    # create list to append data to, use this to build dataframe later
    gps_data: list[tuple[int, float, float]] = []

    # populate df with GPS from GPX file
    target_tag = "{http://www.topografix.com/GPX/1/1}trkpt"  # namespace - {http://www.topografix.com/GPX/1/1'}
    for point in root.iter(target_tag):
        # point = <Element '{http://www.topografix.com/GPX/1/1}trkpt' at 0x11c3ec7c8>
        # point.attrib = {'lat': '-33.801796138286590576171875', 'lon': '151.28050739876925945281982421875'}

        # time in UTC
        element = point.find("{http://www.topografix.com/GPX/1/1}time")

        # attempt to get the time from the element, if it exists
        time = 0
        if element:
            time_str = element.text
            if time_str:
                # need to strip trailing 'Z' for iso format
                time = int(datetime.fromisoformat(time_str[:-1]).timestamp() * 1000)

        lat = float(point.attrib["lat"])
        lon = float(point.attrib["lon"])

        # check that the time was properly extracted, raise error if not
        if time == 0:
            log.warning(f"Time not found for point at {lat}, {lon}")
            raise ValueError

        # significant speed gains appending to list vs appending to dataframe (1.5s vs 25s)
        gps_data.append((time, lat, lon))

    return gps_data


def gpx_df(log: Logger, source: str) -> pd.DataFrame:
    # make df from GPX data
    gps_data = unpack_gpx(log, source)
    df = pd.DataFrame(gps_data, columns=["UTC", "lat", "lon"])

    # calculate sog and cog
    df = calc_sog_cog(log, df)

    # TODO: clear this out eventually, for GPX data will just have basic analysis
    #   this is just to make GPX data look like VKX data for now
    df["hdg"] = df["cog"]

    return df
