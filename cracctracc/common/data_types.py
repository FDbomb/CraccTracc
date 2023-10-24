# Module to hold common class definitions

import pandas as pd
from datetime import datetime
import numpy as np


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
            cog (rads)
            sog (m/s)

            altitude (m)
            time_delta (s)
            distance (m)

        """

        self.manoeuvres = pd.DataFrame()  # Manoeuvres

    def add_race(self, race):
        self.race = race

    def add_boat(self, boat):
        self.boat = boat

    def process_data(self):
        if self.data_format == "VKX":
            self.data = vkx(self.gps_data)
        elif self.data_format == "GPX":
            self.data = None  # PARSEGPX(self.gps_data)
        elif self.data_format == "CSV":
            self.data = None  # PARSECSV(self.gps_data)


# SAMPLE USAGE!
def sample_usage():
    # create a Race instance
    race1 = Race("Race 1", datetime.now(), [[0, 0], [1, 1]], [[75, 75], [25, 25]])

    # create a Boat instance
    boat1 = Boat("Boat 1")

    # create a RaceData instance
    data1 = RaceData(gps_data1, race1, boat1)

    # add the Boat instance to the Race instance's entry_list
    race1.entry_list.append(boat1)
    # add the Race instance to the Boat instance's races_list
    boat1.races_list.append(race1)
