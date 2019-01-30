import contextlib
try:
    from io import StringIO
except ImportError:
    from StringIO import StringIO
import sys


if sys.version_info >= (3, 5):
    @contextlib.contextmanager
    def captured_stdout():
        out = StringIO()
        with contextlib.redirect_stdout(out):
            yield out
else:
    @contextlib.contextmanager
    def captured_stdout():
        out = StringIO()
        orig = sys.stdout
        sys.stdout = out
        try:
            yield out
        finally:
            sys.stdout = orig
