# Module to parse VKX files and perform some calculations

import struct

import numpy as np
import pandas as pd


def quatern2euler(w, x, y, z):
    """
    Convert quaternions to Euler angles (roll, pitch, yaw).
    NOTE: Written using Copilot and StackOverflow - not checked yet
        https://stackoverflow.com/questions/56207448/efficient-quaternions-to-euler-transformation

    Alternative method:
    from scipy.spatial.transform import Rotation
    rot = Rotation.from_quat([-0.03484,  0.68173,  0.03199, 0.73007])
    print(rot.as_euler('xyz', degrees=True))
    """
    # number of figures to round to, otherwise we get floating point errors
    sig_figs = 10

    # roll (x-axis rotation)
    sinr_cosp = 2.0 * (w * x + y * z)
    cosr_cosp = np.round(1.0 - 2.0 * (x * x + y * y), decimals=sig_figs) + 0  # add 0 to convert -0.0 to 0.0
    roll = np.arctan2(sinr_cosp, cosr_cosp)

    # pitch (y-axis rotation)
    sinp = 2.0 * (w * y - z * x)
    sinp = np.clip(sinp, a_min=-1.0, a_max=1.0)
    pitch = np.arcsin(sinp)

    # yaw (z-axis rotation)
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = np.round(1.0 - 2.0 * (y * y + z * z), decimals=sig_figs) + 0
    # this gives us angles in the range -180, 180
    yaw = np.arctan2(siny_cosp, cosy_cosp)

    return np.rad2deg([roll, pitch, yaw])


def unpack_vkx(log, source):
    # Format strings for unpacking data from Vakaaro VKX files
    row_key_fmt = struct.Struct("<B")
    format_strings = {
        int("FF", 16): struct.Struct("<B6x"),  # Page Header
        int("FE", 16): struct.Struct("<H"),  # Page Terminator
        int("02", 16): struct.Struct("<Qii7f"),  # Position, Velocity, and Orientation
        int("03", 16): struct.Struct("<Qfii"),  # Declination
        int("04", 16): struct.Struct("<QBi"),  # Race Timer Event
        int("05", 16): struct.Struct("<QBii"),  # Line Position - not right lat and lon when tested!!!
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

    # create lists to append data to, use this to build dataframe later
    pvo_results = []
    race_results = []
    wind_results = []

    # TODO: can I unpack this so I dont have to keep the file open?
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

            # TODO: if the row key is not recognized, will need to raise error rather than just log it
            if format_string is None:
                log.warning(f"Unrecognized row key: {hex(row_key)}")
                continue

            # unpack the data using the format string
            data = format_string.unpack(f.read(format_string.size))

            # TODO: remove this - just testing
            if row_key == int("05", 16):
                log.debug(f"TESTING: {hex(row_key)} - {data}")

            # add the unpacked data to the result list
            if row_key == int("02", 16):
                pvo_results.append(data)
            elif row_key in [int("04", 16), int("05", 16), int("06", 16)]:
                race_results.append(data)
            elif row_key == int("0A", 16):
                wind_results.append(data)

    return pvo_results, race_results, wind_results


def vkx_df(log, source):
    pvo_results, race_results, wind_results = unpack_vkx(log, source)
    df = pd.DataFrame(pvo_results, columns=["UTC", "lat", "lon", "sog", "cog", "alt", "Q_w", "Q_x", "Q_y", "Q_z"])

    # calculate the euler angles from the quaternions
    euler_angles = quatern2euler(df["Q_w"], df["Q_x"], df["Q_y"], df["Q_z"])
    df = df.assign(hdg=euler_angles[2], roll=euler_angles[0], pitch=euler_angles[1])
    df = df.drop(columns=["Q_w", "Q_x", "Q_y", "Q_z"])

    log.debug(f"Created DataFrame from VKX file: {source}")
    return df
