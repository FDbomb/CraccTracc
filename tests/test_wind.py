import logging

import numpy as np
import pandas as pd

from cracctracc.modules import wind

# Create a mock logger
log = logging.getLogger()


def test_angular_interpolation():
    x = np.array([1, 2, 3, 4])
    xp = np.array([1, 2, 3, 4])
    fp = np.array([10, 20, 350, 10])  # values that cross from 0 to 360 degrees
    period = 360

    result = wind.angular_interpolation(x, xp, fp, period)
    expected = np.array([10, 20, 350, 10])

    np.testing.assert_array_equal(result, expected)


def test_filter_wind_data():
    # Create a mock DataFrame
    df = pd.DataFrame({"UTC": [1000000000000, 2000000000000, 3000000000000]})

    # Create mock response data
    resp_data = {
        "data": {
            "climateGraphs": {
                "wind-speed": {
                    "dataConfig": {
                        "series": {
                            "groups": [
                                {
                                    "points": [
                                        {"x": -2000000000, "y": 0, "direction": 0},
                                        {"x": 0, "y": 0, "direction": 0},
                                        {"x": 1000039600 - 1801, "y": 0, "direction": 0},
                                        {"x": 1000039600 - 1800, "y": 0, "direction": 0},
                                        {"x": 1000039600, "y": 10, "direction": 180},
                                        {"x": 2000039600, "y": 20, "direction": 270},
                                        {"x": 3000039600, "y": 30, "direction": 360},
                                        {"x": 3000039600 + 1800, "y": 40, "direction": 0},
                                        {"x": 3000039600 + 1801, "y": 0, "direction": 0},
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        }
    }

    result = wind.filter_wind_data(log, df, resp_data)
    expected = [
        (999998200000, 0, 0),
        (1000000000000, 5.4, 180),
        (2000000000000, 10.8, 270),
        (3000000000000, 16.2, 360),
        (3000001800000, 21.6, 0),
    ]

    np.testing.assert_allclose(result, expected)
