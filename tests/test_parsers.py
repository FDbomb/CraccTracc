import numpy as np
from cracctracc.modules.vkx_parser import quatern2euler


def test_quatern2euler():
    # Test case 1: zero rotation
    w, x, y, z = 1, 0, 0, 0
    expected = np.array([0, 0, 0])
    result = quatern2euler(w, x, y, z)
    np.testing.assert_allclose(result, expected)

    # Test case 2: 90 degree roll
    w, x, y, z = np.sqrt(2) / 2, np.sqrt(2) / 2, 0, 0
    expected = np.array([90, 0, 0])
    result = quatern2euler(w, x, y, z)
    np.testing.assert_allclose(result, expected)

    # Test case 3: 90 degree pitch
    w, x, y, z = np.sqrt(2) / 2, 0, np.sqrt(2) / 2, 0
    expected = np.array([0, 90, 0])
    result = quatern2euler(w, x, y, z)
    np.testing.assert_allclose(result, expected)

    # Test case 4: 90 degree yaw
    w, x, y, z = np.sqrt(2) / 2, 0, 0, np.sqrt(2) / 2
    expected = np.array([0, 0, 90])
    result = quatern2euler(w, x, y, z)
    np.testing.assert_allclose(result, expected)
