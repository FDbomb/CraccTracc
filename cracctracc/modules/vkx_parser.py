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

    row_key_fmt = struct.Struct("<B")
    page_header_fmt = struct.Struct("<B6x")
    page_terminator_fmt = struct.Struct("<H")
    position_data_fmt = struct.Struct("<Qii7f")
    """
    declination = 
    race_event = 
    line_position = 
    shift_angle = 
    device_config = 
    wind_data =
    # internal_messages = 
    """

    result = []

    # can I unpack this so I dont have to keep the file open?
    #   ie data = f.read() and then next look read through data?
    with open(source, "rb") as f:
        while True:
            # read the row key to find what data we are working with
            row_key = f.read(row_key_fmt.size)

            # check file is empty
            if not row_key:
                break

            # unpack row key - need this to find what packet we are working with
            [row_key] = row_key_fmt.unpack(row_key)
            log.debug(f"Unpacked {row_key} row key")

            # unpack data based on row key
            if row_key == 255:
                result.append("Page Header")
                result.append(page_header_fmt.unpack(f.read(page_header_fmt.size)))
                log.debug(f"Woo hoo unpacked Page Header")
            elif row_key == 254:
                result.append("Page Terminator")
                result.append(page_terminator_fmt.unpack(f.read(page_terminator_fmt.size)))
                log.debug(f"Woo hoo unpacked Page Terminator")
            elif row_key == 2:
                result.append("Position Data")
                result.append(position_data_fmt.unpack(f.read(position_data_fmt.size)))
                log.debug(f"Woo hoo unpacked Position Data")

    log.debug(result)

    # Create dataframe from list
    # df = pd.DataFrame(df, columns=["x", "y", "z"])

    return df


def test(log):
    df = create_df(log, "data/Sutech-Atlas2 10-21-2023.vkx")

    return df
