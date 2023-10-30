# Module to hold common class definitions

from datetime import datetime

import pandas as pd


class Race:
    def __init__(self, name, start_time, start_line, marks):
        self.name = name
        self.start_time = start_time
        self.start_line = start_line
        self.marks = marks

        self.entry_list = []


class Boat:
    def __init__(self, name):
        self.name = name

        self.races_list = []


class RaceData:
    def __init__(self, sample_rate, data):
        # self.data_format = format  # "csv, gpx", "vkx"  # think not relevant

        self.data_sample_rate = sample_rate  # Hz
        self.data = data  # Proccessed data containing state variables

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

    def add_race(self, race):
        self.race = race

    def add_boat(self, boat):
        self.boat = boat


# SAMPLE USAGE!
def sample_usage():
    # create a Race instance
    race1 = Race("Race 1", datetime.now(), [[0, 0], [1, 1]], [[75, 75], [25, 25]])

    # create a Boat instance
    boat1 = Boat("Boat 1")

    # create a RaceData instance
    gps_data1 = []
    data1 = RaceData(gps_data1, race1, boat1)

    # add the Boat instance to the Race instance's entry_list
    race1.entry_list.append(boat1)
    # add the Race instance to the Boat instance's races_list
    boat1.races_list.append(race1)

    # do things with data1 here
    data1 = data1
