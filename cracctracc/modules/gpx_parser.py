# Module to parse GPX files and perform some calculations

import xml.etree.ElementTree as ET
import pandas as pd
from geographiclib.geodesic import Geodesic
from datetime import datetime
import numpy as np


def create_df(log, source):
    # open GPX file using XML parser
    tree = ET.parse(source)
    root = tree.getroot()

    # debug
    # import pdb
    # pdb.set_trace()

    # create list to append data to, use this to build dataframe later
    df = []

    # populate df with data from GPX file (could calculate speed here for quicker execution, but worse readability)
    target_tag = "{http://www.topografix.com/GPX/1/1}trkpt"  # namespace - {http://www.topografix.com/GPX/1/1'}
    for point in root.iter(target_tag):
        # point = <Element '{http://www.topografix.com/GPX/1/1}trkpt' at 0x11c3ec7c8>
        # point.attrib = {'lat': '-33.801796138286590576171875', 'lon': '151.28050739876925945281982421875'}

        # time in UTC
        time = point.find("{http://www.topografix.com/GPX/1/1}time").text
        time = datetime.fromisoformat(time[:-1])  # need to strip trailing 'Z' for iso format

        # not sure on setting these to floats, seems sus but can't give a good reason why
        # well now it's using numpy.float128s so... dunno
        lat = np.float128(point.attrib["lat"])
        lon = np.float128(point.attrib["lon"])

        df.append({"time": time, "lat": lat, "lon": lon})
        # significant speed gains appending to list vs appending to dataframe (1.5s vs 25s)

    # make Pandas df to store data
    df = pd.DataFrame(df, columns=["time", "lat", "lon"])
    log.debug(f"{len(df)} trackpoints recorded")

    return df


def calc_distance(log, lat1, lon1, lat2, lon2):
    # convert lat long inputs to float (yes this sucks but idk what to do) using list comprehension
    # lat1, lon1, lat2, lon2 = [float(x) for x in [lat1, lon1, lat2, lon2]]
    # currently not using this as already floats

    # use WGS-84 ellipsoid = most globally accurate. Accurate to round-off and always converges
    g = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2)
    # g = {'lat1': XX, 'lon1': XX, 'lat2': XX, 'lon2': XX, 'a12': XX, 's12': 5.066904469936966, 'azi1': -35.80482359294056, 'azi2': -35.804805771546704}

    # gives [dist, heading]
    return [g["s12"], g["azi1"]]


def add_speed(log, df):
    # calculate time delta between points, and add to the dataframe
    delta = df["time"].diff()  # can fill but probs gonna drop first row so meh .fillna(pd.Timedelta('0'))
    df["delta"] = delta.dt.total_seconds()

    # use list comprehension to efficiently get lat/long data
    result = [
        calc_distance(log, lat1, lon1, lat2, lon2)
        for lat1, lon1, lat2, lon2 in zip(df["lat"].shift(), df["lon"].shift(), df["lat"], df["lon"])
    ]
    # result = [[dist, heading], [dist, heading], ..]
    df[["dist", "heading"]] = result
    df["rad_heading"] = np.rad2deg(df["heading"])

    # add speed
    df["m/s"] = df["dist"] / df["delta"]
    df["knots"] = df["m/s"] * 1.943844  # yes this in an approximation but meh fix it later

    # drop the first row (no useful data) and return
    # return df.iloc[10:]  # !!!!! Currently taking 10 off cause we have 1 hella sus value somewhere in there
    return df


def add_twa(log, df, twa):
    # Statically set currently, this entire function needs to be modified, see comments in manoeuvres>>fix_heading()
    df["true_wind_angle"] = twa
    log.warning(f"TWA set statically at {twa} degrees!")

    return df
