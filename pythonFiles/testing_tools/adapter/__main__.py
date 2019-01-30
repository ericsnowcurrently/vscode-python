from __future__ import absolute_import

import argparse
import sys

from .tools import pytest, unittest_, nose
from .output_format import serialize_discovered, serialize_results


TOOLS = {
        'unittest': unittest_,
        'pytest': pytest,
        'nose': nose,
        }


def parse_args(
        argv=sys.argv[1:],
        prog=sys.argv[0],
        ):
    """
    Return the subcommand to run, along with its args.

    This defines the standard CLI for the different testing frameworks.
    """
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument('--tool', choices=sorted(TOOLS), required=True)

    parser = argparse.ArgumentParser(
            description='Run Python testing operations.',
            prog=prog,
            )
    subs = parser.add_subparsers(dest='cmd')

    discover = subs.add_parser('discover', parents=[common])

    run = subs.add_parser('run', parents=[common])

    debug = subs.add_parser('debug', parents=[common])

    # Parse the args!
    args = parser.parse_args(argv)
    ns = vars(args)

    cmd = ns.pop('cmd')
    if not cmd:
        parser.error('missing subcommand')
    tool = ns.pop('tool')

    return tool, cmd, ns


def main(tool, cmd, subargs, tools=TOOLS):
    tool = tools[tool]

    if cmd == 'discover':
        found = tool.discover(**subargs)
        print(serialize_discovered(found))
    elif cmd == 'run':
        results = tool.run(**subargs)
        print(serialize_results(results))
    elif cmd == 'debug':
        results = tool.debug(**subargs)
        print(serialize_results(results))
    else:
        raise Exception('unsupported cmd {!r}'.format(cmd))


if __name__ == '__main__':
    tool, cmd, subargs = parse_args()
    main(tool, cmd, subargs)
