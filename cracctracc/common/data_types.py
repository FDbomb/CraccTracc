# Module to hold common class definitions
import time
from typing import NamedTuple

import pandas as pd


class GPSPoint(NamedTuple):
    lat: float
    lon: float


class Mark:
    def __init__(self, name: str, lat: float, lon: float):
        self.name = name
        self.loc = GPSPoint(lat, lon)


class Gate:
    def __init__(self, type: str, lat: float, lon: float):
        self.type = type  # "start", "finish", "bottom"
        self.port = GPSPoint(lat, lon)
        self.starboard = GPSPoint(lat, lon)


class Boat:
    _id = 0

    def __init__(self, name: str):
        self.id = Boat._id
        Boat._id += 1

        self.name = name

        self.races_list: list[Race] = []


class Race:
    _id = 0

    def __init__(self, name: str, race_start: int, start_line: Gate, marks: list[Mark | Gate]):
        self.id = Race._id
        Race._id += 1

        self.name = name
        self.race_start = race_start
        self.start_line = start_line
        self.marks = marks

        self.entry_list: list[Boat] = []
        self.race_datas: list[RaceData] = []


class RaceData:
    _id = 0

    def __init__(self, boat: Boat, sample_rate: int, data: pd.DataFrame):
        self.id = RaceData._id
        RaceData._id += 1

        # self.data_format = format  # "csv, gpx", "vkx"  # think not relevant
        self.data_sample_rate = sample_rate  # Hz

        self.boat = boat

        self.data = data  # Proccessed data containing state variables

        self.legs: dict[int, pd.DataFrame] = {}  # save start and end time for legs + labels?

        """
        self.data format
            time (UNIX milisecs)
            lat (32 bit int, 10^-7 deg)
            lon (32 bit int, 10^-7 deg)
            cog (deg -180, 180)
            sog (m/s or knots?)

            twd (deg to true north, 0, 360)
            twa (deg from now, -180, 180)

        vkx data extras
            hdg (deg to true north, 0, 360)
            roll (deg)
            pitch (deg)
        """

        self.manoeuvres = pd.DataFrame()  # Manoeuvres

    def add_race(self, race: Race):
        self.race = race

    def add_boat(self, boat: Boat):
        self.boat = boat


# SAMPLE USAGE!
def sample_usage():
    # create a Boat instance
    boat1 = Boat("Boat 1")

    # create a Race instance
    race1 = Race("Race 1", int(time.time()), Gate("start", 33.0, 151.0), [Mark("Mark 1", 33.1, 151.1)])

    # create a RaceData instance
    gps_data1 = pd.DataFrame()
    data1 = RaceData(boat1, 5, gps_data1)

    # add the Boat instance to the Race instance's entry_list
    race1.entry_list.append(boat1)
    # add the Race instance to the Boat instance's races_list
    boat1.races_list.append(race1)

    # do things with data1 here
    data1 = data1
