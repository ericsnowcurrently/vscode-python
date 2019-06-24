# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import os.path


TESTS_ROOT = os.path.dirname(__file__)
SCRIPTS_ROOT = os.path.dirname(TESTS_ROOT)
PROJECT_ROOT = os.path.dirname(SCRIPTS_ROOT)

# Clean up the namespace.
del os
