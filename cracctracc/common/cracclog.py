# Common module used for testing and additional CLI programs

import logging


def init_logger(debug_flag):
    log = logging.getLogger(__name__)
    console_handler = logging.StreamHandler()
    if debug_flag:
        log.setLevel(logging.DEBUG)
        console_handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter(fmt="<%(levelname).4s> %(module)s>>%(funcName)s()\t :: %(message)s")
    else:
        log.setLevel(logging.INFO)
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(fmt="%(message)s")
    console_handler.setFormatter(formatter)
    log.addHandler(console_handler)

    log.debug("Logger initialised as {}".format(__name__))

    return log
