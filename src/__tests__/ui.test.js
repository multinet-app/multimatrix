const d3 = require("d3")
window.d3 = d3

const ui = require("../js/ui");


describe("ui", () => {
    describe("searchFor", () => {
        it("Searching for node in empty list throws error", () => {
            // Arrange
            window.controller = {}
            window.controller.model = {}
            window.controller.model.graph = { nodes: [], links: [] }

            // Act + Assert
            outcome = ui.searchFor("someone")
            expect(outcome).toBe(-1)

        });

        it("Searching for node in a proper graph works as expected", () => {
            // Arrange
            window.controller = {}
            window.controller.view = {}
            window.controller.view.selectNeighborNodes = function() {}
            window.controller.model = {}
            window.controller.model.provenance = {}

            person1 = { "_key": 1, "id": "nodes/1", "name": "Test Testerson" }
            person2 = { "_key": 2, "id": "nodes/2", "name": "Jimmy Test" }
            link1 = { "_key": 115100, "id": "links/1", "source": "nodes/1", "target": "nodes/2" }
            window.controller.model.graph = {
                "nodes": [person1, person2],
                "links": [link1]
            }

            let clickedNodes = [];
            window.controller.model.getApplicationState = function() {
                return { "clicked": clickedNodes }
            }

            window.controller.model.provenance.applyAction = function(action) {
                clickedNodes = action.action().clicked
            }

            window.controller.view.labelVar = "name"


            // Act 
            outcome1 = ui.searchFor("Test Testerson")
            outcome2 = ui.searchFor("Jimmy Test")
            outcome3 = ui.searchFor("test testerson")
            outcome4 = ui.searchFor("JIMMY TEST")
            outcome5 = ui.searchFor("Not There")

            // Assert
            expect(outcome1).toBe(1)
            expect(outcome2).toBe(1)
            expect(outcome3).toBe(0)
            expect(outcome4).toBe(0)
            expect(outcome5).toBe(-1)
        });
    });
});