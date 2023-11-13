# Module to add wind data to dataframe

import numpy as np
import pandas as pd

# PLAN #
# one function to add fixed wind data
# one function to pull in wind data from BOM/WillyWeather/OpenWeather
# one function to estimate wind data (using the above function as input)


def add_twd(log, df, twd=0):
    """Add TWD to a dataframe."""
    df["twd"] = twd
    log.warning(f"TWD set statically at {twd} degrees!")

    return df
