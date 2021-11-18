import importlib.metadata
import os
import click
import logging

import xml.etree.ElementTree as ET
import pandas as pd
from geographiclib.geodesic import Geodesic
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np


__version__ = importlib.metadata.version("cracctracc")


def gpx_to_df(log, source):

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
    log.debug("%s trackpoints recorded" % len(df))

    return df


def calc_distance(lat1, lon1, lat2, lon2):

    # convert lat long inputs to float (yes this sucks but idk what to do) using list comprehension
    # lat1, lon1, lat2, lon2 = [float(x) for x in [lat1, lon1, lat2, lon2]]
    # currently not using this as already floats

    # use WGS-84 ellipsoid = most globally accurate. Accurate to round-off and always converges
    g = Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2)
    # g = {'lat1': XX, 'lon1': XX, 'lat2': XX, 'lon2': XX, 'a12': XX, 's12': 5.066904469936966, 'azi1': -35.80482359294056, 'azi2': -35.804805771546704}

    # gives [dist, heading]
    return [g["s12"], g["azi1"]]


def add_speed(df):

    # calculate time delta between points, and add to the dataframe
    delta = df["time"].diff()  # can fill but probs gonna drop first row so meh .fillna(pd.Timedelta('0'))
    df["delta"] = delta.dt.total_seconds()

    # use list comprehension to efficiently get lat/long data
    result = [
        calc_distance(lat1, lon1, lat2, lon2)
        for lat1, lon1, lat2, lon2 in zip(df["lat"].shift(), df["lon"].shift(), df["lat"], df["lon"])
    ]
    # result = [[dist, heading], [dist, heading], ..]
    df[["dist", "heading"]] = result
    df["rad_heading"] = df["heading"] * np.pi / 180

    # add speed
    df["m/s"] = df["dist"] / df["delta"]
    df["knots"] = df["m/s"] * 1.943844  # yes this in an approximation but meh fix it later

    # drop the first row (no useful data) and return
    return df.iloc[10:]  # !!!!! Currently taking 10 off cause we have 1 hella sus value somewhere in there


def plot(df):

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


# Setup click
@click.command()
@click.argument("gpx_track_file", type=click.File("r"))  # Add arg for ingress GPX track file
@click.option("--debug", "-d", help="Turn debug logging on", is_flag=True, default=False)  # Debug option switch
@click.option("--output-csv", "-o", help="Save CSV ouptut")  # CSV output
def main(gpx_track_file, debug, output_csv):
    """CraccTracc is a sailing VMG analysis tool that uses the GPX track generated by GNSS enabled smartwatches to generate VMG plots for manual analysis.

    GPX_TRACK_FILE is the path to the input GPX track file
    """
    # Setup logging
    log = logging.getLogger(__name__)
    console_handler = logging.StreamHandler()
    if debug:
        log.setLevel(logging.DEBUG)
        console_handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter(fmt="<%(levelname).4s> %(module)s>>%(funcName)s() :: %(message)s")
    else:
        log.setLevel(logging.INFO)
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(fmt="%(message)s")
    console_handler.setFormatter(formatter)
    log.addHandler(console_handler)

    log.info("CraccTracc %s\n" % __version__)
    log.debug("Debug enabled")

    # set the source file to analyse
    source = gpx_track_file.name
    source_base, source_ext = os.path.splitext(source)
    log.debug("Using %s as input data" % source)

    # save df from GPX data
    df = gpx_to_df(log, source)

    # uncomment to save/load df to pickle to load faster next time
    # 211118 (JLF) Deprecating this for later optimisation
    # df.to_pickle("%s.pkl" % source_base)
    # df.to_csv("%s.csv" % source_base)
    # df = pd.read_pickle('data/activity_3427215863.pkl')

    # add speed and plot
    df = add_speed(df)

    # Save metrics for external analysis
    # df.to_pickle("%s-metrics.pkl" % source_base)
    if output_csv:
        output_base, output_ext = os.path.splitext(output_csv)
        output_head, output_tail = os.path.split(output_base)
        # df.to_csv("%s/%s-metrics.csv" % output_head, output_tail)
        df.to_csv("%s-metrics.csv" % output_base)

    plot(df)
