sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "fleetlk/formatter/Formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, JSONModel, BusyIndicator, Spreadsheet, MessageToast, Formatter, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("fleetlk.controller.FleetLK", {
        formatter: Formatter,
        onInit: function () {
            var oViewModel = new JSONModel({
                StatusCounts: {
                    "In Service": 0,
                    "Maintenance": 0,
                    "Grounded": 0
                }
            });
            this.getView().setModel(oViewModel, "fleetModel");

            this.loadFleet();
        },

        loadFleet: function () {
            const oFleetJSONModel = new JSONModel();
            const oDataModel = this.getOwnerComponent().getModel();
            const sPath = "/FleetLK";
            const that = this;

            BusyIndicator.show(0);
            oDataModel.read(sPath, {
                sorters: [new sap.ui.model.Sorter("Registration", false)],
                success: (oResponse) => {
                    oFleetJSONModel.setData(oResponse.results);
                    this.getView().setModel(oFleetJSONModel, "fleetDataModel");

                    that._loadStatusCounts(oResponse.results);
                    
                    BusyIndicator.hide();
                },
                error: () => BusyIndicator.hide()
            });
        },

        _loadStatusCounts: function (aFleetData) {
            const oViewModel = this.getView().getModel("fleetModel");
            const oCounts = {
                "In Service": 0,
                "Under Maintenance": 0,
                "Out of Service": 0,
                "Retired": 0
            };

            aFleetData.forEach(oItem => {
                const sStatus = oItem.Status;
                if (oCounts.hasOwnProperty(sStatus)) {
                    oCounts[sStatus]++;
                }
            });

            oViewModel.setProperty("/StatusCounts", oCounts);
        },

        onFilterFleet: function (oEvent) {
            const oTable = this.byId("fleetTable");
            const oBinding = oTable.getBinding("items");
            const sKey = oEvent.getParameter("key"); // Key is the status value (e.g., "Maintenance")
            let aFilter = [];

            // 1. Clear existing filters
            oBinding.filter(aFilter); 

            if (sKey !== "All") {
                // 2. Create filter based on the status key
                const oFilter = new Filter({
                    path: "Status", 
                    operator: FilterOperator.EQ,
                    value1: sKey
                });
                aFilter.push(oFilter);
            }

            // 3. Apply the new filter to the JSON Model binding
            oBinding.filter(aFilter);
        },

        onRowPress(oEvent) {
            const oSelectedItem = oEvent.getSource();
            const oContext = oSelectedItem.getBindingContext("fleetDataModel");
            const uuid = oContext.getProperty("UUID");

            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("PartDetails", { UUID: uuid });
        },

        onAddNewRecord: function () {
            if (!this.oDialog) {
                this.loadFragment({
                    name: "fleetlk.fragments.CreateFleet",
                }).then(
                    function (oDialog) {
                        this.oDialog = oDialog;
                        this.oDialog.open();
                    }.bind(this)
                );
            } else {
                this.oDialog.open();
            }
        },

        onCancelRecord: function () {
            this.oDialog.close();
        },

        onCreateNewRecord: function () {

            var registration = this.getView().byId("registrationIDInput").getValue();
            var model = this.getView().byId("modelIDInput").getValue();
            var status = this.getView().byId("statusIDInput").getSelectedItem().getText();

            if (!registration || !model) {
                MessageToast.show("Registration and Model are required!");
                return;
            }

            var mParams = {
                Registration : registration,
                Model : model, 
                Status : status
            };

            const oDataModel = this.getOwnerComponent().getModel();
            this.oDialog.setBusy(true);

            oDataModel.callFunction("/create_fleet", {
                method: "POST",
                urlParameters: mParams,
                success: () => {
                    this.oDialog.setBusy(false);
                    MessageToast.show("Fleet Created Succesfully");
                    this.oDialog.close();
                    this.loadFleet();
                },
                error: (oError) => {
                    console.log(oError);
                }
            });
        },
        editFleetRecord: function () {
            const oTable = this.byId("fleetTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                MessageToast.show("Please select a fleet first.");
                return;
            }

            const oFleetModel = oSelectedItem.getBindingContext("fleetDataModel");

            if (!this._editDialog) {
                this.loadFragment({
                    name: "fleetlk.fragments.EditFleet"
                }).then(
                    function (oDialog) {
                        this._editDialog = oDialog;

                        this._editDialog.setBindingContext(oFleetModel, "fleetDataModel");

                        this._editDialog.open();
                    }.bind(this)
                );
            } else {
                this._editDialog.open();
            }
        },

        onSaveEditRecord: function() {
            const oDataModel = this.getOwnerComponent().getModel();
            const oCtx = this._editDialog.getBindingContext("fleetDataModel");
            const oUpdatedData = oCtx.getObject();
            const sPath = `/FleetLK(UUID=guid'${oUpdatedData.UUID}',IsActiveEntity=true)`;
            const mParamsToUpdate = {
                Registration: oUpdatedData.Registration,
                Model: oUpdatedData.Model,
                Status: oUpdatedData.Status
            };
            
            this._editDialog.setBusy(true);
            oDataModel.update(sPath, mParamsToUpdate, {
                success: () => {
                    this._editDialog.setBusy(false);
                    this._editDialog.close();
                    MessageToast.show("Fleet Updated Successfully");
                    this._loadFlights();
                },
                error: (oError) => {
                    this._editDialog.setBusy(false);
                    MessageToast.show("Error updating fleet");
                }
            });
        },

        onCancelEditRecord: function () {
            this._editDialog.close();
        },

        onExport() {
            const oModel = this.getView().getModel("fleetDataModel");
            const aData = oModel.getData();

            if (!aData || !aData.length) {
                MessageToast.show("No data available to export.");
                return;
            }

            const aColumns = [
                { label: "Airplane registration", property: "Registration" },
                { label: "Airplane model", property: "Model" },
                { label: "Total Flight Hours", property: "TotalHours" },
                { label: "Last Inspection", property: "LastInspection" },
                { label: "Status", property: "Status" }
            ];

            const oSettings = {
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: "Fleet.xlsx"
            };

            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().then(() => {
                MessageToast.show("Excel file exported successfully!");
            }).finally(() => oSheet.destroy());
        },
    });
});