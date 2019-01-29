import unittest

from testing_tools.adapter.tools.unittest_ import discover, run, debug


class DiscoverTests(unittest.TestCase):

    def test_no_args(self):
        found = discover()

        self.assertIs(found, None)


class RunTests(unittest.TestCase):

    def test_no_args(self):
        results = run()

        self.assertIs(results, None)


class DebugTests(unittest.TestCase):

    def test_no_args(self):
        results = debug()

        self.assertIs(results, None)
