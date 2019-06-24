import os.path
import unittest

from tests import SCRIPTS_ROOT
from completion import JediCompletion, parse_args, main


JEDI = os.path.join(SCRIPTS_ROOT, 'lib', 'python')


class JediCompletionTests(unittest.TestCase):

    @unittest.expectedFailure
    def test_watch(self):
        raise NotImplementedError


class ParseArgsTests(unittest.TestCase):

    def test_no_args(self):
        jedi, prefix, modules, preview = parse_args('completion.py', [])

        self.assertEqual(jedi, JEDI)
        self.assertEqual(prefix, 'v')
        self.assertEqual(modules, '')
        self.assertFalse(preview)

    def test_one_arg(self):
        jedi, prefix, modules, preview = parse_args('completion.py', [
            'a,b,c',  # modules
            ])

        self.assertEqual(jedi, JEDI)
        self.assertEqual(prefix, 'v')
        self.assertEqual(modules, 'a,b,c')
        self.assertFalse(preview)

    def test_two_args(self):
        jedi, prefix, modules, preview = parse_args('completion.py', [
            'custom',
            '<jedi path>',  # jedi
            ])

        self.assertEqual(jedi, '<jedi path>')
        self.assertEqual(prefix, 'custom_v')
        self.assertEqual(modules, '')
        self.assertTrue(preview)

    def test_three_args(self):
        jedi, prefix, modules, preview = parse_args('completion.py', [
            'custom',
            '<jedi path>',  # jedi
            'a,b,c',  # modules
            ])

        self.assertEqual(jedi, '<jedi path>')
        self.assertEqual(prefix, 'custom_v')
        self.assertEqual(modules, 'a,b,c')
        self.assertTrue(preview)

    def test_extra_args_non_custom(self):
        jedi, prefix, modules, preview = parse_args('completion.py', [
            'a,b,c',  # modules
            '???',
            ])

        self.assertEqual(jedi, os.path.join(SCRIPTS_ROOT, 'lib', 'python'))
        self.assertEqual(prefix, 'v')
        self.assertEqual(modules, 'a,b,c')
        self.assertFalse(preview)

    def test_extra_args_custom(self):
        jedi, prefix, modules, preview = parse_args('completion.py', [
            'custom',
            '<jedi path>',  # jedi
            'a,b,c',  # modules
            '???',
            ])

        self.assertEqual(jedi, '<jedi path>')
        self.assertEqual(prefix, 'custom_v')
        self.assertEqual(modules, 'a,b,c')
        self.assertTrue(preview)


class MainTests(unittest.TestCase):

    _return_import_module = None
    _return_cache_directory = '<cache>'
    _return_jedi_version = '0.13.3'

    @property
    def calls(self):
        try:
            return self._calls
        except AttributeError:
            self._calls = []
            return self._calls

    def insert(self, index, pathentry):
        self.calls.append(('_sys_path.insert', (index, pathentry)))

    def pop(self, index):
        self.calls.append(('_sys_path.pop', (index,)))

    def _import_module(self, name):
        self.calls.append(('_import_module', (name,)))
        return self._return_import_module

    def _watch(self, **kwargs):
        self.calls.append(('_watch', kwargs))

    @property
    def settings(self):
        self.calls.append(('jedi.settings', ()))
        return self

    @property
    def cache_directory(self):
        self.calls.append(('jedi.settings.cache_directory', ()))
        return self._return_cache_directory

    @cache_directory.setter
    def cache_directory(self, value):
        self.calls.append(('jedi.settings.cache_directory', (value,)))

    def preload_module(self, *modules):
        self.calls.append(('jedi.preload_module', modules))

    @property
    def __version__(self):
        self.calls.append(('jedi.__version__', ()))
        return self._return_jedi_version

    def test_no_args(self):
        main(pathentry='<jedi path>',
             cacheprefix='v',
             modules='',
             preview=False,
             _sys_path=self,
             _import_module=self._import_module,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_sys_path.insert', (0, '<jedi path>')),
            ('_import_module', ('jedi',)),
            ('_sys_path.pop', (0,)),
            ('_watch', {'preview': False}),
            ])

    def test_modules_only(self):
        self._return_import_module = self

        main(pathentry='<jedi path>',
             cacheprefix='v',
             modules='a,b,c',
             preview=False,
             _sys_path=self,
             _import_module=self._import_module,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_sys_path.insert', (0, '<jedi path>')),
            ('_import_module', ('jedi',)),
            ('_sys_path.pop', (0,)),
            ('jedi.preload_module', ('a', 'b', 'c')),
            ('_watch', {'preview': False}),
            ])

    def test_custom_without_modules(self):
        self._return_import_module = self

        main(pathentry='<jedi path>',
             cacheprefix='custom_v',
             modules='',
             preview=True,
             _sys_path=self,
             _import_module=self._import_module,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_sys_path.insert', (0, '<jedi path>')),
            ('_import_module', ('jedi',)),
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', ()),
            ('jedi.__version__', ()),
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', (os.path.join('<cache>', 'custom_v0133'),)),
            ('_sys_path.pop', (0,)),
            ('_watch', {'preview': True}),
            ])

    def test_custom_with_modules(self):
        self._return_import_module = self

        main(pathentry='<jedi path>',
             cacheprefix='custom_v',
             modules='a,b,c',
             preview=True,
             _sys_path=self,
             _import_module=self._import_module,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_sys_path.insert', (0, '<jedi path>')),
            ('_import_module', ('jedi',)),
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', ()),
            ('jedi.__version__', ()),
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', (os.path.join('<cache>', 'custom_v0133'),)),
            ('_sys_path.pop', (0,)),
            ('jedi.preload_module', ('a', 'b', 'c')),
            ('_watch', {'preview': True}),
            ])
