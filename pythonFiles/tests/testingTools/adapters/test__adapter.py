import unittest

from adapters._adapter import parse_args


class ParseDiscoverTests(unittest.TestCase):

    def test_default(self):
        cmd, args = parse_args(['discover'])

        self.assertEqual(cmd, 'discover')
        self.assertEqual(args, {})


class ParseRunTests(unittest.TestCase):

    def test_default(self):
        cmd, args = parse_args(['run'])

        self.assertEqual(cmd, 'run')
        self.assertEqual(args, {})


class ParseDebugTests(unittest.TestCase):

    def test_default(self):
        cmd, args = parse_args(['debug'])

        self.assertEqual(cmd, 'debug')
        self.assertEqual(args, {})
