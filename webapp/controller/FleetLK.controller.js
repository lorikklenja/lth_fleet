sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
], (Controller, BusyIndicator) => {
    "use strict";

    return Controller.extend("fleetlk.controller.FleetLK", {
        onInit() {
            this.loadFleet();
        },

        loadFleet() {
            const oFleetJSONModel = new sap.ui.model.json.JSONModel();
            const oDataModel = this.getOwnerComponent().getModel();
            const sPath = "/FleetLK";

            BusyIndicator.show(0);
            oDataModel.read(sPath, {
                sorters: [new sap.ui.model.Sorter("Registration", false)],
                success: (oResponse) => {
                    oFleetJSONModel.setData(oResponse.results);
                    this.getView().setModel(oFleetJSONModel, "fleetDataModel");
                    BusyIndicator.hide();
                },
                error: () => BusyIndicator.hide()
            });
        },

        onRowPress(oEvent) {
            
        },
    });
});