import os.path
import time


#############################
# helpers

class HasRepr(object):

    def __repr__(self):
        args = ', '.join('{}={!r}'.format(name, getattr(self, name))
                         for name in self.__init__.__code__.co_varnames[1:])
        return '{}({})'.format(
                self.__class__.__name__,
                args,
                )


class Compares(object):

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        for name in sorted(vars(self)):
            if getattr(self, name) != getattr(other, name):
                return False
        return True

    def __ne__(self, other):
        return not (self == other)


#############################
# top-level results

class DiscoveryResults(HasRepr, Compares):

    # TODO: Support multiple test roots?
    def __init__(self, root, timestamp=None):
        if not isinstance(root, TestFolder):
            root = TestFolder.from_dirname(root)

        self.root = root
        self.timestamp = timestamp or int(time.time())


#############################
# data

class TestFolder(HasRepr, Compares):

    @classmethod
    def from_dirname(cls, dirname):
        if os.path.isabs(dirname):
            qualname = os.path.basename(dirname)
        else:
            qualname = dirname.strip(os.path.sep).replace(os.path.sep, '.')
            dirname = os.path.abspath(dirname).rstrip(os.path.sep)
        return cls(dirname, qualname)

    def __init__(self, dirname, qualname, files=[], subfolders=[]):
        self.dirname = dirname
        self.qualname = qualname
        self.files = list(files) if files else []
        self.subfolders = list(subfolders) if subfolders else []

    def add_file(self, basename):
        if not basename.endswith('.py'):
            raise NotImplementedError('non-python files not supported')
        file = TestFile(
                os.path.join(self.dirname, basename),
                '{}.{}'.format(self.qualname, basename[:-3]),
                )
        self.files.append(file)
        return file

    def add_subfolder(self, basename):
        folder = TestFolder(
                os.path.join(self.dirname, basename),
                '{}.{}'.format(self.qualname, basename),
                )
        self.subfolders.append(folder)
        return folder

    def all_tests(self):
        """Return the list of all folders in the tree."""
        tests = []
        for file in self.files:
            tests.extend(file.all_tests())
        for sub in self.subfolders:
            tests.extend(sub.all_tests())
        return tests


class TestFile(HasRepr, Compares):

    def __init__(self, filename, qualname, suites=None, tests=None):
        self.filename = filename
        self.qualname = qualname
        self.suites = list(suites) if suites else []
        self.tests = list(tests) if tests else []

    def add_suite(self, name, lineno=None):
        suite = TestSuite(
                '{}.{}'.format(self.qualname, name),
                self.filename,
                lineno,
                )
        self.suites.append(suite)
        return suite

    def add_test(self, name, lineno=None):
        test = Test(
                '{}.{}'.format(self.qualname, name),
                self.filename,
                lineno,
                )
        self.tests.append(test)
        return test

    def all_tests(self):
        """Return the list of all tests in the file or its suites."""
        tests = list(self.tests or ())
        for suite in self.suites:
            tests.extend(suite.all_tests())
        return tests


class TestSuite(HasRepr, Compares):

    def __init__(self, qualname, filename=None, lineno=None,
                 tests=None, subsuites=None):
        if lineno and not filename:
            raise TypeError('missing filename')

        self.qualname = qualname
        self.filename = filename
        self.lineno = lineno
        self.tests = list(tests) if tests else []
        self.subsuites = list(subsuites) if subsuites else []

    def add_test(self, name, lineno=None):
        test = Test(
                '{}.{}'.format(self.qualname, name),
                self.filename,
                lineno,
                )
        self.tests.append(test)
        return test

    def add_subsuite(self, name, lineno=None):
        cls = self.__class__
        suite = cls(
                '{}.{}'.format(self.qualname, name),
                self.filename,
                lineno,
                )
        self.subsuites.append(suite)
        return suite

    def all_tests(self):
        """Return the list of all tests in the file or its suites."""
        tests = list(self.tests or ())
        for suite in self.subsuites:
            tests.extend(suite.all_tests())
        return tests


class Test(HasRepr, Compares):

    def __init__(self, qualname, filename=None, lineno=None):
        if lineno and not filename:
            raise TypeError('missing filename')

        self.qualname = qualname
        self.filename = filename
        self.lineno = lineno
