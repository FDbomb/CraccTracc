# Module to parse GPX files and perform some calculations

import xml.etree.ElementTree as ET
import pandas as pd
from geographiclib.geodesic import Geodesic

from datetime import datetime
import numpy as np


def calc_distance(log, lat1, lon1, lat2, lon2):
    # convert lat long inputs to float (yes this sucks but idk what to do) using list comprehension
    # lat1, lon1, lat2, lon2 = [float(x) for x in [lat1, lon1, lat2, lon2]]
    # currently not using this as already floats

    # use WGS-84 ellipsoid = most globally accurate. Accurate to round-off and always converges
    g = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2)
    # g = {'lat1': XX, 'lon1': XX, 'lat2': XX, 'lon2': XX, 'a12': XX, 's12': 5.066904469936966,
    #   'azi1': -35.80482359294056, 'azi2': -35.804805771546704}

    # gives [dist, cog]
    return [g["s12"], g["azi1"]]


def calc_sog_cog(log, df):
    # calculate time delta between points, and add to the dataframe
    df["delta"] = df["time"].diff().fillna(0) / 1000
    # NOTE DT: df["delta"] = delta.dt.total_seconds()

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


def unpack_gpx(log, source):
    # open GPX file using XML parser
    tree = ET.parse(source)
    root = tree.getroot()

    # debug
    # import pdb
    # pdb.set_trace()

    # create list to append data to, use this to build dataframe later
    gps_data = []

    # populate df with data from GPX file (could calculate speed here for quicker execution, but worse readability)
    target_tag = "{http://www.topografix.com/GPX/1/1}trkpt"  # namespace - {http://www.topografix.com/GPX/1/1'}
    for point in root.iter(target_tag):
        # point = <Element '{http://www.topografix.com/GPX/1/1}trkpt' at 0x11c3ec7c8>
        # point.attrib = {'lat': '-33.801796138286590576171875', 'lon': '151.28050739876925945281982421875'}

        # time in UTC
        time = point.find("{http://www.topografix.com/GPX/1/1}time").text
        # TODO: fix this hacky way of getting time in UTC
        time = int(datetime.fromisoformat(time[:-1]).timestamp() * 1000)  # need to strip trailing 'Z' for iso format

        # TODO: not sure on setting these to floats, seems sus but can't give a good reason why
        # well now it's using numpy.float128s so... dunno
        lat = np.float128(point.attrib["lat"])
        lon = np.float128(point.attrib["lon"])

        gps_data.append([time, lat, lon])
        # significant speed gains appending to list vs appending to dataframe (1.5s vs 25s)

    # make Pandas df to store data
    df = pd.DataFrame(gps_data, columns=["time", "lat", "lon"])
    log.debug(f"{len(df)} trackpoints recorded")

    return df


def gpx_df(log, source):
    # make df from GPX data
    df = unpack_gpx(log, source)

    # calculate sog and cog
    df = calc_sog_cog(log, df)

    # TODO: clear this out
    #   this is just to make GPX data look like VKX data for now
    df["hdg"] = df["cog"]

    return df
