import { expect } from "chai";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        incorrectDir: "./test/data/incorrectDir.zip",
        unzipped: "./test/data/unzipped.txt",
        invalid_id:  "./test/data/invalid_id.zip",
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        chai.use(chaiAsPromised);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        // List<String> expected = new Linkedlist<>();
        // expected.add(id);
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("should reject to add a dataset where the given id is null", function () {
        const id: string = null;
        const futureResult: Promise<string[]> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to add a dataset where the content is null", function () {
        const futureResult: Promise<string[]> =
            insightFacade.addDataset("courses", null, InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to add a dataset whose id is undefined", function () {
        const id: string = undefined;
        const futureResult: Promise<string[]> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to add a dataset with invalid id that contains an underscore", function () {
        const id: string = "invalid_id";
        const futureResult: Promise<string[]> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to add a dataset whose id containing whitespace", function () {
        const id: string = " ";
        const futureResult: Promise<string[]> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject a dataset which is added twice", function () {
        const id: string = "courses";
        const futureResult2: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
        then((result: string[]) => insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses));
        return expect(futureResult2).to.be.rejectedWith(InsightError);
    });

    it("should reject to add a dataset which is not in the zip folder", function () {
        const id: string = "unzipped";
        const futureResult: Promise<string[]> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to add a dataset which is in incorrect course directory", function () {
        const id: string = "incorrectDir";
        const futureResult: Promise<string[]> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    // Unit tests for removeDataset
    it("should remove a valid dataset", function () {
        const id: string = "courses";
        const expected: string = id;
        const futureResult: Promise<string> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(
            (pre) => insightFacade.removeDataset(id));
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("should reject to remove an unavailable dataset", function () {
        const id1: string = "courses";
        const id2: string = "course";
        const futureResult: Promise<string> =
            insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses).then(
                (pre) => insightFacade.removeDataset(id2));
        return expect(futureResult).to.be.rejectedWith(NotFoundError);
    });

    it("should reject to remove a null dataset", function () {
        const id: string = null;
        const futureResult: Promise<string> =
            insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to remove a dataset whose id is undefined", function () {
        const id: string = undefined;
        const futureResult: Promise<string> =
            insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to remove a dataset with underscored id", function () {
        const id: string = "invalid_id";
        const futureResult: Promise<string> =
            insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should reject to remove a dataset with whitespace id", function () {
        const id: string = "  ";
        const futureResult: Promise<string> =
            insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("should produce valid dataset list", function () {
        const id: string = "courses";
        const expected: InsightDataset[] = [{id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612}];
        const futureResult: Promise<InsightDataset[]> =
            insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(
                () => insightFacade.listDatasets());
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("could produce empty dataset list", function () {
        const expected: InsightDataset[] = [];
        const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
        return expect(futureResult).to.eventually.deep.equal(expected);
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: {path: string, kind: InsightDatasetKind} } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * TODO For C1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<any[]> = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });

});
