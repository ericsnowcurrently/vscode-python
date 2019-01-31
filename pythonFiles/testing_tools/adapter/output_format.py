import json

'''
{
    summary: { // (type=TestSummary) *Note that all values are set to 0 on discovery, and are set to meaningful values only on running the tests.* 
        passed: number; 
        failures: number;
        errors: number;
        skipped: number;
    },
    testFiles: [ // (type=TestFile[])
        { // (type=TestFile) *Note this is a compound type as it is written today.*
            name: string;
            fullPath: string;
            functions: [
                { // (type=TestFunction)
                    name: string;
                    nameToRun: string;
                    status?: TestStatus; // (type=Enum=TestStatus) {Unknown,Discovering,Idle,Running,Fail,Error,Skipped,Pass}
                    passed?: boolean; // all remaining come from type=TestResult...
                    time: number;
                    line?: number;
                    file?: string;
                    message?: string;
                    traceback?: string;
                    functionsPassed?: number;
                    functionsFailed?: number;
                    functionsDidNotRun?: number;
                }
            ];
            suites: [ // (type=TestSuite[])
                { // (type=TestSuite)
                    name: string;
                    functions: [
                        { // (type=TestFunction)
                            name: string;
                            nameToRun: string;
                            status?: TestStatus; // (type=Enum=TestStatus) {Unknown,Discovering,Idle,Running,Fail,Error,Skipped,Pass}
                            passed?: boolean; // all remaining come from type=TestResult...
                            time: number;
                            line?: number;
                            file?: string;
                            message?: string;
                            traceback?: string;
                            functionsPassed?: number;
                            functionsFailed?: number;
                            functionsDidNotRun?: number;
                        }
                    ];
                    suites: TestSuite[]; // Note... because this contains itself, this is a recursive data structure that can by definition become infinite!
                    isUnitTest: Boolean;
                    isInstance: Boolean;
                    nameToRun: string;
                    xmlName: string;
                    status?: TestStatus; // (type=Enum=TestStatus) {Unknown,Discovering,Idle,Running,Fail,Error,Skipped,Pass}
                    passed?: boolean; // all remaining come from type=TestResult...
                    time: number;
                    line?: number;
                    file?: string;
                    message?: string;
                    traceback?: string;
                    functionsPassed?: number;
                    functionsFailed?: number;
                    functionsDidNotRun?: number;
                }
            ];
            nameToRun: string;
            xmlName: string;
            status?: TestStatus; // (type=Enum=TestStatus) {Unknown,Discovering,Idle,Running,Fail,Error,Skipped,Pass}
            errorsWhenDiscovering?: string;
            expanded?: Boolean; // from type=Node
            passed?: boolean; // all remaining come from type=TestResult...
            time: number;
            line?: number;
            file?: string;
            message?: string;
            traceback?: string;
            functionsPassed?: number;
            functionsFailed?: number;
            functionsDidNotRun?: number;
        }
    ]
    testFunctions: [ // (type=FlattenedTestFunction[])
        { // (type=FlattenedTestFunction)
            testFunction: TestFunction; // see (type=TestFunction) above
            parentTestSuite?: TestSuite; // see (type=TestSuite) above
            parentTestFile: TestFile; // see (type=TestFile) above
            xmlClassName: string;
        }
    ];
    testSuites: [ // (type=FlattenedTestSuite[])
        { // (type=FlattenedTestSuite)
            testSuite: TestSuite; // see (type=TestSuite) above
            parentTestSuite?: TestSuite; // see (type=TestSuite) above
            parentTestFile: TestFile; // see (type=TestFile) above
            xmlClassName: string;
        }
    ];
    testFolders: [ // (type=TestFolder[])
        { // (type=TestFolder)
            name: string;
            testFiles: TestFile[]; // See (type=TestFile) above
            nameToRun: string;
            status?: TestStatus; // (type=Enum=TestStatus) {Unknown,Discovering,Idle,Running,Fail,Error,Skipped,Pass}
            folders: TestFolder[]; // Self-referential type, can be infinitely recursive.
            passed?: boolean; // all remaining come from type=TestResult...
            time: number;
            line?: number;
            file?: string;
            message?: string;
            traceback?: string;
            functionsPassed?: number;
            functionsFailed?: number;
            functionsDidNotRun?: number;
        }
    ];
    rootTestFolders: TestFolder[]; // see (type=TestFolder[]) above
}
'''

def serialize_discovered(results):
    """Return a string representing the discovered tests.

    This will be consumed by the extension.
    """
    root = None
    files = []
    folders = []
    suites = []
    functions = []

    def on_folder(data):
        folders.append(data)

    def on_file(data):
        files.append(data)

    def on_suite(data, filedata):
        suites.append({
            'testSuite': data,
            #parentTestSuite
            'parentTestFile': filedata,
            'xmlClassName': data['name'],
            })

    def on_test(data, suitedata, filedata):
        functions.append({
            'testFunction': data,
            #'parentTestSuite': suitedata,
            'parentTestFile': filedata,
            #xmlClassName
            })

    root = serialize_discovered_folder(results.root, results.timestamp,
                                       on_folder, on_file, on_suite, on_test)
    data = {
        'summary': {},
        'testFiles': files,
        'testFunctions': functions,
        'testSuites': suites,
        'testFolders': folders,
        'rootTestFolders': [root],
        }
    return json.dumps(data)


def serialize_discovered_folder(folder, timestamp, on_folder, on_file, on_suite, on_test):
    ...


def serialize_discovered_file(file, timestamp, on_suite, on_test):
    ...


def serialize_discovered_suite(suite, timestamp, on_test):
    ...


def serialize_discovered_test(test, timestamp):
    data ={
            'name': test.qualname.rpartition('.')[-1],
            'time': timestamp,
            #nameToRun
            #status
            #passed
            #message
            #traceback
            #functionsPassed
            #functionsFailed
            #functionsDidNotRun
            }
    if test.filename:
        data['file'] = test.filename
    if test.lineno:
        data['line'] = test.lineno
    return data
