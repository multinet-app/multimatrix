const puppeteer = require("puppeteer");

let page, browser;
const width = 1920;
const height = 1080;

beforeAll(async() => {
    browser = await puppeteer.launch({
        headless: true,
        args: [`--window-size=${width},${height}`],
        // slowMo: 100
    });
    page = await browser.newPage();
    await page.setViewport({ width, height });
});

afterAll(() => {
    browser.close();
});

describe("End to end", () => {
    describe("Visualization", () => {
        it("Clicking on node highlights row and column", async() => {

            // Arrange
            let node, value;
            await page.goto("http://127.0.0.1:8082/?workspace=test&graph=test");
            await page.waitForSelector(".cell");

            // Act + Assert
            // Should not be clicked when started
            node = await page.evaluate(() => document.querySelector("#topoRownodes-1").classList)
            expect(node[1]).toBe(undefined);

            node = await page.evaluate(() => document.querySelector("#topoColnodes-1").classList)
            expect(node[1]).toBe(undefined);

            // Should be clicked on click
            await page.click("#rowLabelnodes-1");
            await page.mouse.move(0, 0);
            node = await page.evaluate(() => document.querySelector("#topoRownodes-1").classList)
            expect(node[1]).toBe("clicked");

            node = await page.evaluate(() => document.querySelector("#topoColnodes-1").classList)
            expect(node[1]).toBe("clicked");

            // Should not be clicked after clicking again
            await page.click("#rowLabelnodes-1");
            await page.mouse.move(0, 0);
            node = await page.evaluate(() => document.querySelector("#topoRownodes-1").classList)
            expect(node[1]).toBe(undefined);

            node = await page.evaluate(() => document.querySelector("#topoColnodes-1").classList)
            expect(node[1]).toBe(undefined);

        });
    });
});




// describe("End to end") {
//     describe("Search panel") {

//     };
// };
// describe("End to end") {
//     describe("Config panel") {

//     };
// };