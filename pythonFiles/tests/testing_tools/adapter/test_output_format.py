import unittest

from testing_tools.adapter.output_format import (
        serialize_discovered, serialize_results,
        )


class DiscoveredTests(unittest.TestCase):

    def test_none_found(self):
        output = serialize_discovered([])

        self.assertEqual(output, '<TBD>')

    def test_one_found(self):
        output = serialize_discovered([
            'one',
            ])

        self.assertEqual(output, '<TBD>')

    def test_several_found(self):
        output = serialize_discovered([
            'one',
            'two',
            'three',
            ])

        self.assertEqual(output, '<TBD>')


class ResultsTests(unittest.TestCase):

    def test_none_found(self):
        output = serialize_results([])

        self.assertEqual(output, '<TBD>')

    def test_one_found(self):
        output = serialize_results([
            'one',
            ])

        self.assertEqual(output, '<TBD>')

    def test_several_found(self):
        output = serialize_results([
            'one',
            'two',
            'three',
            ])

        self.assertEqual(output, '<TBD>')
