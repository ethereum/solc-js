// This function checks the standard JSON output for auxiliaryInputRequested,
// where smtlib2queries represent the queries created by the SMTChecker.
// The function runs an SMT solver on each query and adjusts the input for
// another run.
// Returns null if no solving is requested.
export function handleSMTQueries(inputJSON: any, outputJSON: any, solver?: any): any {
    const auxInputReq: any = outputJSON.auxiliaryInputRequested;
    if (!auxInputReq) {
        return null;
    }

    const queries: any = auxInputReq.smtlib2queries;
    if (!queries || Object.keys(queries).length === 0) {
        return null;
    }

    const responses: object = {};
    for (const query in queries) {
        responses[query] = solver(queries[query]);
    }

    // Note: all existing solved queries are replaced.
    // This assumes that all neccessary queries are quested above.
    inputJSON.auxiliaryInput = { smtlib2responses: responses };
    return inputJSON;
}

export function smtCallback(solver: any): any {
    return (query: string): any => {
        try {
            const result: string = solver(query);
            return { contents: result };
        } catch (err) {
            return { error: err };
        }
    };
}

