import os.path
import unittest

from tests import SCRIPTS_ROOT
from completion import (
        parse_args, main, set_up_jedi, get_jedi,
        JediCompletion
        )


JEDI = os.path.join(SCRIPTS_ROOT, 'lib', 'python')


class TestBase(unittest.TestCase):

    @property
    def calls(self):
        try:
            return self._calls
        except AttributeError:
            self._calls = []
            return self._calls


class JediCompletionTests(TestBase):

    @unittest.expectedFailure
    def test_watch(self):
        raise NotImplementedError


class GetJediTests(TestBase):

    _return_import_module = None

    def insert(self, index, pathentry):
        self.calls.append(('_sys_path.insert', (index, pathentry)))

    def pop(self, index):
        self.calls.append(('_sys_path.pop', (index,)))

    def _import_module(self, name):
        self.calls.append(('_import_module', (name,)))
        return self._return_import_module

    def test_default(self):
        expected = self._return_import_module = object()

        jedi = get_jedi(_sys_path=self,
                        _import_module=self._import_module,
                        )

        self.assertIs(jedi, expected)
        self.assertEqual(self.calls, [
            ('_sys_path.insert', (0, JEDI)),
            ('_import_module', ('jedi',)),
            ('_sys_path.pop', (0,)),
            ])

    def test_custom(self):
        expected = self._return_import_module = object()

        jedi = get_jedi(pathentry='<jedi path>',
                        _sys_path=self,
                        _import_module=self._import_module,
                        )

        self.assertIs(jedi, expected)
        self.assertEqual(self.calls, [
            ('_sys_path.insert', (0, '<jedi path>')),
            ('_import_module', ('jedi',)),
            ('_sys_path.pop', (0,)),
            ])


class SetUpJediTests(TestBase):

    _return_cache_directory = '<cache>'
    _return_jedi_version = '0.13.3'

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
        jedi = self._return_import_module = object()

        set_up_jedi(jedi,
                    modules='',
                    preview=False,
                    )

        self.assertEqual(self.calls, [])

    def test_modules_only(self):
        jedi = self._return_import_module = self

        set_up_jedi(jedi,
                    modules='a,b,c',
                    preview=False,
                    )

        self.assertEqual(self.calls, [
            ('jedi.preload_module', ('a', 'b', 'c')),
            ])

    def test_custom_without_modules(self):
        jedi = self._return_import_module = self

        set_up_jedi(jedi,
                    modules='',
                    preview=True,
                    )

        self.assertEqual(self.calls, [
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', ()),
            ('jedi.__version__', ()),
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', (os.path.join('<cache>', 'custom_v0133'),)),
            ])

    def test_custom_with_modules(self):
        jedi = self._return_import_module = self

        set_up_jedi(jedi,
                    modules='a,b,c',
                    preview=True,
                    )

        self.assertEqual(self.calls, [
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', ()),
            ('jedi.__version__', ()),
            ('jedi.settings', ()),
            ('jedi.settings.cache_directory', (os.path.join('<cache>', 'custom_v0133'),)),
            ('jedi.preload_module', ('a', 'b', 'c')),
            ])


class ParseArgsTests(TestBase):

    def test_no_args(self):
        jedi, modules, preview = parse_args('completion.py', [])

        self.assertEqual(jedi, JEDI)
        self.assertEqual(modules, '')
        self.assertFalse(preview)

    def test_one_arg(self):
        jedi, modules, preview = parse_args('completion.py', [
            'a,b,c',  # modules
            ])

        self.assertEqual(jedi, JEDI)
        self.assertEqual(modules, 'a,b,c')
        self.assertFalse(preview)

    def test_two_args(self):
        jedi, modules, preview = parse_args('completion.py', [
            'custom',
            '<jedi path>',  # jedi
            ])

        self.assertEqual(jedi, '<jedi path>')
        self.assertEqual(modules, '')
        self.assertTrue(preview)

    def test_three_args(self):
        jedi, modules, preview = parse_args('completion.py', [
            'custom',
            '<jedi path>',  # jedi
            'a,b,c',  # modules
            ])

        self.assertEqual(jedi, '<jedi path>')
        self.assertEqual(modules, 'a,b,c')
        self.assertTrue(preview)

    def test_extra_args_non_custom(self):
        jedi, modules, preview = parse_args('completion.py', [
            'a,b,c',  # modules
            '???',
            ])

        self.assertEqual(jedi, os.path.join(SCRIPTS_ROOT, 'lib', 'python'))
        self.assertEqual(modules, 'a,b,c')
        self.assertFalse(preview)

    def test_extra_args_custom(self):
        jedi, modules, preview = parse_args('completion.py', [
            'custom',
            '<jedi path>',  # jedi
            'a,b,c',  # modules
            '???',
            ])

        self.assertEqual(jedi, '<jedi path>')
        self.assertEqual(modules, 'a,b,c')
        self.assertTrue(preview)


class MainTests(TestBase):

    _return_get_jedi = None

    def _get_jedi(self, pathentry):
        self.calls.append(('_get_jedi', (pathentry,)))
        return self._return_get_jedi

    def _set_up_jedi(self, jedi, modules, preview):
        self.calls.append(('_set_up_jedi', (jedi, modules, preview)))

    def _watch(self, jedi, **kwargs):
        self.calls.append(('_watch', (jedi,), kwargs))

    def test_no_args(self):
        expected = self._return_get_jedi = object()

        main(pathentry='<jedi path>',
             modules='',
             preview=False,
             _get_jedi=self._get_jedi,
             _set_up_jedi=self._set_up_jedi,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_get_jedi', ('<jedi path>',)),
            ('_set_up_jedi', (expected, '', False)),
            ('_watch', (expected,), {'preview': False}),
            ])

    def test_modules_only(self):
        expected = self._return_get_jedi = self

        main(pathentry='<jedi path>',
             modules='a,b,c',
             preview=False,
             _get_jedi=self._get_jedi,
             _set_up_jedi=self._set_up_jedi,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_get_jedi', ('<jedi path>',)),
            ('_set_up_jedi', (expected, 'a,b,c', False)),
            ('_watch', (expected,), {'preview': False}),
            ])

    def test_custom_without_modules(self):
        expected = self._return_get_jedi = self

        main(pathentry='<jedi path>',
             modules='',
             preview=True,
             _get_jedi=self._get_jedi,
             _set_up_jedi=self._set_up_jedi,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_get_jedi', ('<jedi path>',)),
            ('_set_up_jedi', (expected, '', True)),
            ('_watch', (expected,), {'preview': True}),
            ])

    def test_custom_with_modules(self):
        expected = self._return_get_jedi = self

        main(pathentry='<jedi path>',
             modules='a,b,c',
             preview=True,
             _get_jedi=self._get_jedi,
             _set_up_jedi=self._set_up_jedi,
             _watch=self._watch,
             )

        self.assertEqual(self.calls, [
            ('_get_jedi', ('<jedi path>',)),
            ('_set_up_jedi', (expected, 'a,b,c', True)),
            ('_watch', (expected,), {'preview': True}),
            ])
