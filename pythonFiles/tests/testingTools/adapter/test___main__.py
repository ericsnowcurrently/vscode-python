import unittest

from adapter.__main__ import parse_args, main


class ParseDiscoverTests(unittest.TestCase):

    def test_default(self):
        tool, cmd, args = parse_args([
            'discover',
            '--tool', 'pytest',
            ])

        self.assertEqual(tool, 'pytest')
        self.assertEqual(cmd, 'discover')
        self.assertEqual(args, {})


class ParseRunTests(unittest.TestCase):

    def test_default(self):
        tool, cmd, args = parse_args([
            'run',
            '--tool', 'pytest',
            ])

        self.assertEqual(tool, 'pytest')
        self.assertEqual(cmd, 'run')
        self.assertEqual(args, {})


class ParseDebugTests(unittest.TestCase):

    def test_default(self):
        tool, cmd, args = parse_args([
            'debug',
            '--tool', 'pytest',
            ])

        self.assertEqual(tool, 'pytest')
        self.assertEqual(cmd, 'debug')
        self.assertEqual(args, {})


class MainTests(unittest.TestCase):

    tool = None
    tools = {}

    def set_tool(self, name):
        self.tools = {name: tool}
        return tool

    def test_discover(self):
        tool = StubTool('pytest')
        main('pytest', 'discover', {'spam': 'eggs'}, tools={'pytest': tool})

        self.assertEqual(tool.calls, [
            ('discover', {'spam': 'eggs'}),
            ])

    def test_run(self):
        tool = StubTool('pytest')
        main('pytest', 'run', {'spam': 'eggs'}, tools={'pytest': tool})

        self.assertEqual(tool.calls, [
            ('run', {'spam': 'eggs'}),
            ])

    def test_debug(self):
        tool = StubTool('pytest')
        main('pytest', 'debug', {'spam': 'eggs'}, tools={'pytest': tool})

        self.assertEqual(tool.calls, [
            ('debug', {'spam': 'eggs'}),
            ])


class StubTool(object):

    def __init__(self, name):
        self.name = name
        self.calls = []

    def discover(self, **kwargs):
        self.calls.append(('discover', kwargs))

    def run(self, **kwargs):
        self.calls.append(('run', kwargs))

    def debug(self, **kwargs):
        self.calls.append(('debug', kwargs))
