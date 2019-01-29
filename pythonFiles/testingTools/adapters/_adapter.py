import argparse
import sys


def parse_args(
        argv=sys.argv[1:],
        prog=sys.argv[0],
        ):
    """
    Return the subcommand to run, along with its args.

    This defines the standard CLI for the different testing frameworks.
    """
    parser = argparse.ArgumentParser(
            prog=prog,
            )
    subs = parser.add_subparsers(dest='cmd')

    discover = subs.add_parser('discover')

    run = subs.add_parser('run')

    debug = subs.add_parser('debug')

    # Parse the args!
    args = parser.parse_args(argv)
    ns = vars(args)

    cmd = ns.pop('cmd')

    return cmd, ns
