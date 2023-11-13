# Module to parse GPX files and perform some calculations

from cracctracc.modules.gpx_parser import gpx_df
from cracctracc.modules.vkx_parser import vkx_df


def sog2knots(log, df):
    # convert sog from m/s to knots
    df["sog"] = df["sog"] * 900 / 463

    return df


def add_twd(log, df, twd):
    """Add TWD to a dataframe."""
    # TODO: FIX THIS ASAP, IT'S A BIG PROBLEM
    #   this function really needs its whole own module. Either needs to be added from VKX file
    #   or calculated somehow from GPX file. Even maybe pull data from BOM is closer?
    #   Currently just setting it statically, see comments in manoeuvres>>fix_heading()
    df["twd"] = twd
    log.warning(f"TWD set statically at {twd} degrees!")

    return df


def fix_rounding(log, df):
    # Vakaros have floating point errors so need to round, GPX has no such issue
    # have chosen 4 decimal places as breaks with 5!

    sig_figs = 4
    df[["sog", "cog", "hdg"]] = df[["sog", "cog", "hdg"]].round(sig_figs)

    # VKX has extra columns - leave this here for now, will parse GPX elevation at some point
    if "alt" in df:
        df["alt"] = df["alt"].round(1)
        df[["roll", "pitch"]] = df[["roll", "pitch"]].round(sig_figs)

    return df


def trim_race(log, df, course_data, race_start, race_end):
    # Trim the race dataframe to the race only
    # race_start and race_end should be in UNIX miliseconds
    # The manually provided start and end times have priority, then extracted start and end times, and then the whole df

    # if we have both start and end times given, trim the df
    if race_start and race_end:
        # trim df to only include race data
        race_df = df[df["UTC"].between(race_start, race_end)]

    # if we only have one of the start or end times, extract the other from the course data
    vkx_race_start, vkx_race_end = 0, len(df)
    for item in course_data[4]:
        # unpack the race timer data into its components
        # if there are multiple race starts, this will only take the last one (as expected for general recalls)
        """
        UTC is UNIX timestamp in miliseconds
        CODE is 0: RESET, 1: START, 2: SYNC, 3: RACE START, 4: RACE END
        TIMER is race timer in seconds
        """
        utc, code, timer = item
        if code == 3:
            vkx_race_start = utc
        elif code == 4:
            vkx_race_end = utc

    # attempt to fill in missing start and end times with times extracted from VKX
    if race_start is None:
        race_start = vkx_race_start
    if race_end is None:
        race_end = vkx_race_end

    # if we no start time given or extracted, default to start of data
    if race_start == 0:
        log.warning("Extracting race start failed, defaulting to start of data")
        # TODO: insert logic to find start here
    # if we no end time given or extracted, default to end of data
    if vkx_race_end == len(df):
        log.warning("Extracting race end failed, defaulting to end of data")
        # TODO: insert logic to find end here
    elif vkx_race_start != 0:
        # in this case we have both start and end times either extracted or given
        log.debug("Extracted race start and end times")

    # TODO: make this function return the whole df as well as the trimmed df!
    race_df = df[df["UTC"].between(race_start, race_end)]
    return race_df


def parse(log, source, source_ext, race_start=None, race_end=None):
    # MAIN SUPPORT FOR VKX!!!!!

    log.debug(f"Attempting to extract data from {source}")

    # parser based on source file type
    if source_ext == ".gpx":
        df = gpx_df(log, source)
    elif source_ext == ".vkx":
        df, course_data = vkx_df(log, source)

    # log the successful creation of the df
    n = len(df)
    log.debug(f"{n} trackpoints recorded")

    # add speed, convert to deg etc
    df = sog2knots(log, df)

    # TODO: remove this section once true wind module is written
    if source_ext == ".gpx":
        twd = 150
    elif source_ext == ".vkx":
        twd = 33.75  # shifts between 22.5 and 45 degrees

    # add true wind
    df = add_twd(log, df, twd)  # TWD set statically here!!

    # fix rounding errors
    df = fix_rounding(log, df)

    # remove first row of GPX to remove NaNs
    if source_ext == ".gpx":
        df = df.loc[1:]

    # check if course_data exists
    if "course_data" in locals():
        # check that input start/end times are unix miliseconds format
        # they can still be right format but wrong values so more checks would be better
        if race_start and len(str(race_start)) != 13:
            raise ValueError("Race start time must be in UNIX miliseconds")
        if race_end and len(str(race_end)) != 13:
            raise ValueError("Race end time must be in UNIX miliseconds")

        df = trim_race(log, df, course_data, race_start, race_end)
        log.debug(f"Trimmed to {len(df)} trackpoints")

    return df
