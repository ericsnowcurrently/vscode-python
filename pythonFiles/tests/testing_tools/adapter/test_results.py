import os.path
import unittest

from testing_tools.adapter.results import (
        DiscoveryResults, TestFolder, TestFile, TestSuite, Test
        )


class DiscoveryResultsTests(unittest.TestCase):

    def test_init_basic(self):
        root = TestFolder('/x/y', 'x.y')
        results = DiscoveryResults(root)

        self.assertIs(results.root, root)
        self.assertIsInstance(results.timestamp, int)
        self.assertGreater(results.timestamp, 0)

    def test_init_full(self):
        root = TestFolder('/x/y', 'x.y')
        results = DiscoveryResults(root, 10)

        self.assertIs(results.root, root)
        self.assertEqual(results.timestamp, 10)

    def test_init_root_str(self):
        root = os.path.sep + os.path.join('x', 'y')
        results = DiscoveryResults(root)

        self.assertEqual(results.root, TestFolder(root, 'y'))

    def test_repr(self):
        root = TestFolder('/x/y', 'x.y')
        results = DiscoveryResults(root, 10)
        result = repr(results)

        self.assertEqual(result,
                         "DiscoveryResults(root=TestFolder(dirname='/x/y', qualname='x.y', files=[], subfolders=[]), timestamp=10)")


class TestFolderTests(unittest.TestCase):

    def test_from_dirname_relative(self):
        reldir = os.path.join('x', 'y', 'z')
        folder = TestFolder.from_dirname(reldir)

        self.assertEqual(folder, TestFolder(os.path.abspath(reldir), 'x.y.z'))

    def test_from_dirname_absolute(self):
        dirname = os.path.sep + os.path.join('x', 'y', 'z')
        folder = TestFolder.from_dirname(dirname)

        self.assertEqual(folder, TestFolder(dirname, 'z'))

    def test_init_basic(self):
        folder = TestFolder('/x/y', 'x.y')

        self.assertEqual(folder.dirname, '/x/y')
        self.assertEqual(folder.qualname, 'x.y')
        self.assertEqual(folder.files, [])
        self.assertEqual(folder.subfolders, [])

    def test_init_prepopulate(self):
        files = ['z.py']
        subfolders = ['sub']
        folder = TestFolder('/x/y', 'x.y', files, subfolders)

        self.assertEqual(folder.files, files)
        self.assertIsNot(folder.files, files)
        self.assertEqual(folder.subfolders, subfolders)
        self.assertIsNot(folder.subfolders, subfolders)

    def test_repr(self):
        folder = TestFolder('/x/y', 'x.y')
        result = repr(folder)

        self.assertEqual(result,
                         "TestFolder(dirname='/x/y', qualname='x.y', files=[], subfolders=[])")

    def test_add_file(self):
        folder = TestFolder('/x/y', 'x.y')
        file1 = folder.add_file('z.py')
        file2 = folder.add_file('w.py')

        self.assertEqual(folder.files, [file1, file2])
        self.assertIs(folder.files[0], file1)
        self.assertIs(folder.files[1], file2)
        self.assertEqual(file1, TestFile('/x/y/z.py', 'x.y.z'))
        self.assertEqual(file2, TestFile('/x/y/w.py', 'x.y.w'))

    def test_add_subfolder(self):
        folder = TestFolder('/x/y', 'x.y')
        sub1 = folder.add_subfolder('z')
        sub2 = folder.add_subfolder('w')

        self.assertEqual(folder.subfolders, [sub1, sub2])
        self.assertIs(folder.subfolders[0], sub1)
        self.assertIs(folder.subfolders[1], sub2)
        self.assertEqual(sub1, TestFolder('/x/y/z', 'x.y.z'))
        self.assertEqual(sub2, TestFolder('/x/y/w', 'x.y.w'))

    def test_all_tests(self):
        folder = TestFolder('/x/y', 'x.y')
        file1 = folder.add_file('z.py')
        test1 = file1.add_test('test_spam', 15)
        suite1 = file1.add_suite('ATests', 30)
        test2 = suite1.add_test('test_ham', 35)
        suite2 = suite1.add_subsuite('SubTests', 45)
        test3 = suite2.add_test('test_spam', 47)
        suite3 = file1.add_suite('BTests', 70)
        test4 = suite3.add_test('test_ham', 72)
        test5 = file1.add_test('test_eggs', 100)
        sub = folder.add_subfolder('sub')
        file2 = sub.add_file('w.py')
        suite4 = file2.add_suite('CTests', 10)
        test6 = suite4.add_test('test_x', 15)
        tests = folder.all_tests()

        self.assertEqual(tests, [
            test1,
            test5,
            test2,
            test3,
            test4,
            test6,
            ])


class TestFileTests(unittest.TestCase):

    def test_init_basic(self):
        file = TestFile('/x/y/z.py', 'x.y.z')

        self.assertIs(file.filename, '/x/y/z.py')
        self.assertEqual(file.qualname, 'x.y.z')
        self.assertEqual(file.suites, [])
        self.assertEqual(file.tests, [])

    def test_init_prepopulate(self):
        suites = ['SubTests']
        tests = ['test_a']
        file = TestFile('/x/y/z.py', 'x.y.z', suites, tests)

        self.assertEqual(file.suites, suites)
        self.assertIsNot(file.suites, suites)
        self.assertEqual(file.tests, tests)
        self.assertIsNot(file.tests, tests)

    def test_repr(self):
        file = TestFile('/x/y/z.py', 'x.y.z')
        result = repr(file)

        self.assertEqual(result,
                         "TestFile(filename='/x/y/z.py', qualname='x.y.z', suites=[], tests=[])")

    def test_add_suite(self):
        file = TestFile('/x/y/z.py', 'x.y.z')
        before = list(file.suites)
        suite1 = file.add_suite('ATests', 10)
        suite2 = file.add_suite('BTests', 40)
        after = list(file.suites)

        self.assertEqual(before, [])
        self.assertEqual(after, [suite1, suite2])
        self.assertIs(after[0], suite1)
        self.assertIs(after[1], suite2)
        self.assertEqual(suite1,
                         TestSuite('x.y.z.ATests', '/x/y/z.py', 10))
        self.assertEqual(suite2,
                         TestSuite('x.y.z.BTests', '/x/y/z.py', 40))

    def test_add_test(self):
        file = TestFile('/x/y/z.py', 'x.y.z')
        before = list(file.tests)
        test1 = file.add_test('test_spam', 15)
        test2 = file.add_test('test_eggs', 25)
        after = list(file.tests)

        self.assertEqual(before, [])
        self.assertEqual(after, [test1, test2])
        self.assertIs(after[0], test1)
        self.assertIs(after[1], test2)
        self.assertEqual(test1,
                         Test('x.y.z.test_spam', '/x/y/z.py', 15))
        self.assertEqual(test2,
                         Test('x.y.z.test_eggs', '/x/y/z.py', 25))

    def test_all_tests(self):
        file = TestFile('/x/y/z.py', 'x.y.z')
        test1 = file.add_test('test_spam', 15)
        suite1 = file.add_suite('ATests', 30)
        test2 = suite1.add_test('test_ham', 35)
        suite2 = suite1.add_subsuite('SubTests', 45)
        test3 = suite2.add_test('test_spam', 47)
        suite3 = file.add_suite('BTests', 70)
        test4 = suite3.add_test('test_ham', 72)
        test5 = file.add_test('test_eggs', 100)
        tests = file.all_tests()

        self.assertEqual(tests, [
            test1,
            test5,
            test2,
            test3,
            test4,
            ])


class TestSuiteTests(unittest.TestCase):

    def test_init_basic(self):
        suite = TestSuite('x.y.z.ATests')

        self.assertEqual(suite.qualname, 'x.y.z.ATests')
        self.assertIs(suite.filename, None)
        self.assertIs(suite.lineno, None)
        self.assertEqual(suite.tests, [])
        self.assertEqual(suite.subsuites, [])

    def test_init_full(self):
        suite = TestSuite('x.y.z.ATests', '/x/y/z.py', 5)

        self.assertEqual(suite.qualname, 'x.y.z.ATests')
        self.assertEqual(suite.filename, '/x/y/z.py')
        self.assertEqual(suite.lineno, 5)
        self.assertEqual(suite.tests, [])
        self.assertEqual(suite.subsuites, [])

    def test_init_prepopulate(self):
        tests = ['test_a']
        subsuites = ['SubTests']
        suite = TestSuite('x.y.z.ATests', tests=tests, subsuites=subsuites)

        self.assertEqual(suite.tests, tests)
        self.assertIsNot(suite.tests, tests)
        self.assertEqual(suite.subsuites, subsuites)
        self.assertIsNot(suite.subsuites, subsuites)

    def test_repr(self):
        suite = TestSuite('x.y.z.ATests', '/x/y/z.py', 5)
        result = repr(suite)

        self.assertEqual(result,
                         "TestSuite(qualname='x.y.z.ATests', filename='/x/y/z.py', lineno=5, tests=[], subsuites=[])")

    def test_add_test(self):
        suite = TestSuite('x.y.z.ATests', '/x/y/z.py')
        before = list(suite.tests)
        test1 = suite.add_test('test_spam', 15)
        test2 = suite.add_test('test_eggs', 25)
        after = list(suite.tests)

        self.assertEqual(before, [])
        self.assertEqual(after, [test1, test2])
        self.assertIs(after[0], test1)
        self.assertIs(after[1], test2)
        self.assertEqual(test1,
                         Test('x.y.z.ATests.test_spam', '/x/y/z.py', 15))
        self.assertEqual(test2,
                         Test('x.y.z.ATests.test_eggs', '/x/y/z.py', 25))

    def test_add_suite(self):
        suite = TestSuite('x.y.z.ATests', '/x/y/z.py')
        before = list(suite.subsuites)
        sub1 = suite.add_subsuite('Sub1Tests', 10)
        sub2 = suite.add_subsuite('Sub2Tests', 40)
        after = list(suite.subsuites)

        self.assertEqual(before, [])
        self.assertEqual(after, [sub1, sub2])
        self.assertIs(after[0], sub1)
        self.assertIs(after[1], sub2)
        self.assertEqual(sub1,
                         TestSuite('x.y.z.ATests.Sub1Tests', '/x/y/z.py', 10))
        self.assertEqual(sub2,
                         TestSuite('x.y.z.ATests.Sub2Tests', '/x/y/z.py', 40))

    def test_all_tests(self):
        suite = TestSuite('x.y.z.ATests', '/x/y/z.py')
        test1 = suite.add_test('test_spam', 15)
        sub1 = suite.add_subsuite('Sub1Tests', 30)
        test2 = sub1.add_test('test_ham', 35)
        sub2 = suite.add_subsuite('Sub2Tests', 70)
        test3 = sub2.add_test('test_ham', 72)
        test4 = suite.add_test('test_eggs', 100)
        tests = suite.all_tests()

        self.assertEqual(tests, [
            test1,
            test4,
            test2,
            test3,
            ])


class TestTests(unittest.TestCase):

    def test_init_basic(self):
        test = Test('x.y.z.ATests.test_a')

        self.assertEqual(test.qualname, 'x.y.z.ATests.test_a')
        self.assertIs(test.filename, None)
        self.assertIs(test.lineno, None)

    def test_init_full(self):
        test = Test('x.y.z.ATests.test_a', '/x/y/z.py', 10)

        self.assertEqual(test.qualname, 'x.y.z.ATests.test_a')
        self.assertEqual(test.filename, '/x/y/z.py')
        self.assertEqual(test.lineno, 10)

    def test_init_missing_filename(self):
        with self.assertRaises(TypeError):
            Test('x.y.z.ATests.test_a', '', 10)

    def test_repr(self):
        test = Test('x.y.z.ATests.test_a', '/x/y/z.py', 10)
        result = repr(test)

        self.assertEqual(result,
                         "Test(qualname='x.y.z.ATests.test_a', filename='/x/y/z.py', lineno=10)")
