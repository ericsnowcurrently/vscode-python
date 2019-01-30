import unittest

from tests.util import captured_stdout
from testing_tools.adapter.tools.pytest import discover, run, debug


class DiscoverTests(unittest.TestCase):

    def test_no_args(self):
        with captured_stdout():
            found = discover()

        self.assertIs(found, None)


class RunTests(unittest.TestCase):

    def test_no_args(self):
        with captured_stdout():
            results = run()

        self.assertIs(results, None)


class DebugTests(unittest.TestCase):

    def test_no_args(self):
        with captured_stdout():
            results = debug()

        self.assertIs(results, None)
