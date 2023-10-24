# Module to parse VKX files and perform some calculations

import pandas as pd
from datetime import datetime
import numpy as np
import struct


def create_df(log, source):
    # create list to append data to, use this to build dataframe later
    df = []

    """
    vakaros - struct - description

    u1 - B - unsigned 8-bit integer 
    u2 - H - unsigned 16-bit integer
    u4 - I - unsigned 32-bit integer
    u8 - Q - unsigned 64-bit integer
    i1 - b - signed 8-bit integer
    i2 - h - signed 16-bit integer
    i4 - i - signed 32-bit integer
    f4 - f - 32-bit single precision floating point
    x4 - 4x - 32-bit bitfield
    s4 - 4s - 4-byte string
   s32 - 32s - 32-byte string
    """

    result = []

    row_key_fmt = struct.Struct("<B")
    format_strings = {
        int("FF", 16): struct.Struct("<B6x"),  # Page Header
        int("FE", 16): struct.Struct("<H"),  # Page Terminator
        int("02", 16): struct.Struct("<Qii7f"),  # Position, Velocity, and Orientation
        int("03", 16): struct.Struct("<Qfii"),  # Declination
        int("04", 16): struct.Struct("<QBi"),  # Race Timer Event
        int("05", 16): struct.Struct("<QBii"),  # Line Position - not right lat and long when tested!!!
        int("06", 16): struct.Struct("<QBBff"),  # Shift Angle
        int("08", 16): struct.Struct("<Q4xB"),  # Device Configuration
        int("0A", 16): struct.Struct("<Qff"),  # Wind Data
        int("01", 16): struct.Struct("<32x"),  # Internal Message
        int("07", 16): struct.Struct("<12x"),  # Internal Message
        int("0E", 16): struct.Struct("<16x"),  # Internal Message
        int("20", 16): struct.Struct("<13x"),  # Internal Message
    }

    """ 
    # TODO: this is the same as above, maybe more readable? neglible performance difference
    data = [
        ["FF", "<B6x"],  # Page Header
        ["FE", "<H"],  # Page Terminator
        ["02", "<Qii7f"],  # Position, Velocity, and Orientation
        ["03", "<Qfii"],  # Declination
        ["04", "<QBi"],  # Race Timer Event
        ["05", "<QBii"],  # Line Position
        ["06", "<QBBff"],  # Shift Angle
        ["08", "<Q4xB"],  # Device Configuration
        ["0A", "<Qff"],  # Wind Data
        ["01", "<32x"],  # Internal Message
        ["07", "<12x"],  # Internal Message
        ["0E", "<16x"],  # Internal Message
        ["20", "<13x"],  # Internal Message
    ]
    format_strings = {int(key, 16): struct.Struct(value) for key, value in data}
    """

    # can I unpack this so I dont have to keep the file open?
    #   ie data = f.read() and then next look read through data?
    with open(source, "rb") as f:
        while True:
            # read the row key to find what data we are working with
            row_key = f.read(row_key_fmt.size)
            if not row_key:
                break  # if we are at the end of the file

            # unpack row key - need this to find what packet we are working with
            [row_key] = row_key_fmt.unpack(row_key)

            # get the format string for the row key
            format_string = format_strings.get(row_key)

            # TODO: if the row key is not recognized, will need to raise error
            if format_string is None:
                log.debug(f"Unrecognized row key: {hex(row_key)}")
                continue

            # unpack the data using the format string
            data = format_string.unpack(f.read(format_string.size))

            # testing - Shift Angle data?
            # if row_key == int("08", 16):
            #    log.debug((hex(row_key), data))

            # add the row key and data to the result list
            result.append((hex(row_key), data))

    log.debug(result[100:110])

    # Create dataframe from list
    # df = pd.DataFrame(df, columns=["x", "y", "z"])

    # NOTE: this is the format of the Position, Velocity, and Orientation data
    # ('0x2', (  # row key
    # 1697854013769,  # time
    # -338022350,  # lat
    # 1512831650,  # lon
    # 4.424224376678467,  # cog
    # 4.166100978851318,  # sog
    # 15.40000057220459,  # altitude
    # 0.36210423707962036,  # quaternion w - Orientation in true NED (North, East, Down) frame
    # -0.3621673583984375,  # quaternion x
    # -0.12707969546318054,  # quaternion y
    # -0.8494473695755005))  # quaternion z

    return df


def test(log):
    df = create_df(log, "data/Sutech-Atlas2 10-21-2023.vkx")

    return df
