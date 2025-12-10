sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator",
    "sap/ui/export/Spreadsheet",
    "fleetlk/formatter/Formatter",
    "sap/m/MessageBox"
], (Controller, MessageToast, BusyIndicator, Spreadsheet, Formatter, MessageBox) => {
    "use strict";

    return Controller.extend("fleetlk.controller.PartDetails", {
        formatter: Formatter,
        onInit: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("PartDetails").attachPatternMatched(this._onObjectMatched, this);  
        },

        _onObjectMatched: function (oEvent) {
            this._uuid = oEvent.getParameter("arguments").UUID;
            this._loadPartDetails();
        },

        _loadPartDetails() {
            const uuid = this._uuid;
            const oView = this.getView();
            const oDataModel = this.getOwnerComponent().getModel();
            const oJSONModel = new sap.ui.model.json.JSONModel();

            BusyIndicator.show(0);

            oDataModel.read("/FleetLK(UUID=guid'" + uuid + "',IsActiveEntity=true)", {
                urlParameters: {
                    "$expand": "to_PartsLK"
                },
                success: (oResponse) => {
                    oJSONModel.setData(oResponse);
                    oView.setModel(oJSONModel, "partsDetailsModel");
                    BusyIndicator.hide();
                },
                error: (oError) => {
                    console.error("Error loading details:", oError);
                    MessageToast.show("Failed to load parts details.");
                    BusyIndicator.hide();
                }
            });
        },

        onCreateNewRecord: function () {

            var partName = this.getView().byId("partNameIDInput").getValue();
            var inspection_due = this.getView().byId("inspection_due").getDateValue();
            var condition = this.getView().byId("conditionIDInput").getSelectedItem().getText();

            if (!partName || !condition) {
                MessageToast.show("Part Name and Inspection Due are required!");
                return;
            }

            const partsmodel = this.getView().getModel('partsDetailsModel').getData();
            const uuid = partsmodel.UUID;

            var mParams = {
                ParentUuid : uuid,
                PartName : partName,
                ConditionText: condition,
                InspectionDue: inspection_due.toISOString().slice(0, 10)
            };

            const oDataModel = this.getOwnerComponent().getModel();
            this.oDialog.setBusy(true);

            oDataModel.callFunction("/create_parts", {            
                method: "POST",
                urlParameters: mParams,
                success: () => {
                    this.oDialog.setBusy(false);
                    MessageToast.show("Part Created Successfully");
                    this.oDialog.close();
                    this._loadPartDetails();
                },
                error: (oError) => {
                    this.oDialog.setBusy(false);
                    console.error("Error creating part:", oError);
                    MessageToast.show("Failed to create part.");
                }
            }
            
            );
        },

        onAddNewRecord: function () {
            if (!this.oDialog) {
                this.loadFragment({
                    name: "fleetlk.fragments.CreatePart",
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

        editPartRecord: function () {
            const oTable = this.byId("partsDetailsTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                MessageToast.show("Please select a part first.");
                return;
            }

            const oFleetModel = oSelectedItem.getBindingContext("partsDetailsModel");

            if (!this._ParteditDialog) {
                this.loadFragment({
                    name: "fleetlk.fragments.EditPart"
                }).then(
                    function (oDialog) {
                        this._ParteditDialog = oDialog;

                        this._ParteditDialog.setBindingContext(oFleetModel, "partsDetailsModel");

                        this._ParteditDialog.open();
                    }.bind(this)
                );
            } else {
                this._ParteditDialog.open();
            }
        },

        onSaveEditRecord: function() {
            const oDataModel = this.getOwnerComponent().getModel();
            const oCtx = this._ParteditDialog.getBindingContext("partsDetailsModel");
            const oUpdatedData = oCtx.getObject();
            const sPath = `/PartsLK(Uuid=guid'${oUpdatedData.Uuid}',ParentUuid=guid'${this._uuid}',IsActiveEntity=true)`;
            const mParamsToUpdate = {
                PartName: oUpdatedData.PartName,
                ConditionText: oUpdatedData.ConditionText
            };
            
            this._ParteditDialog.setBusy(true);
            oDataModel.update(sPath, mParamsToUpdate, {
                success: () => {
                    this._ParteditDialog.setBusy(false);
                    this._ParteditDialog.close();
                    MessageToast.show("Part Updated Successfully");
                    this._loadFlights();
                },
                error: (oError) => {
                    this._ParteditDialog.setBusy(false);
                    MessageToast.show("Error updating part");
                }
            });
        },

        onDeletePart: function (oEvent) {
            MessageBox.confirm("Delete this part?", {
                onClose: (action) => {
                    if (action === "OK") {
                        const oDataModel = this.getOwnerComponent().getModel();
                        const oItem = oEvent.getSource().getParent(); 
                        const oCtx = oItem.getBindingContext("partsDetailsModel");
                        const partuuid = oCtx.getProperty("Uuid")
                        const ParentUuid = oCtx.getProperty("ParentUuid");
                        const sPath = `/PartsLK(Uuid=guid'${partuuid}',ParentUuid=guid'${ParentUuid}',IsActiveEntity=true)`;
                        
                        oDataModel.remove(sPath, {
                            success: () => {
                                MessageToast.show("Part Deleted Successfully");
                                this._loadPartDetails();
                            },
                            error: (error) => {
                                MessageToast.show("Error deleting part");
                            }
                        });
                    }
                }
            });
        },

        onCancelRecord: function () {
            this.oDialog.close();
        },

        onCancelEditRecord: function () {
            this._ParteditDialog.close();
        },

        onBack: function () {
            const oHistory = sap.ui.core.routing.History.getInstance();
            const sPrevious = oHistory.getPreviousHash();

            if (sPrevious !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteFleetLK");
            }
        },

        onExportExcel: function () {
            var oModel = this.getView().getModel("partsDetailsModel");
            var aData = oModel.getProperty("/to_PartsLK/results");

            var aColumns = [
                {
                    label: "Part Name",
                    property: "PartName",
                    type: "string"
                },
                {
                    label: "Condition",
                    property: "ConditionText",
                    type: "string"
                },
                {
                    label: "Inspection Due",
                    property: "InspectionDue",
                    type: "string"
                }
            ];

            var oSettings = {
                workbook: { columns: aColumns },
                dataSource: aData,
                fileName: "Parts_Details.xlsx"
            };

            var oSpreadsheet = Spreadsheet(oSettings);
            oSpreadsheet.build().finally(function() {
                oSpreadsheet.destroy();
            });
        },

        onDeleteDetail: function (oEvent) {
            const oDataModel = this.getOwnerComponent().getModel();
            const oItem = oEvent.getSource().getParent(); 
            const oCtx = oItem.getBindingContext("flightDetailsModel");

            const sConnid = oCtx.getProperty("Connid");
            const sCarrid = oCtx.getProperty("Carrid");
            
            var mParams = {
                Carrid : sCarrid, 
                Connid : sConnid
            };
            MessageBox.confirm("Delete this flight?", {
                onClose: (action) => {
                    if (action === "OK") {
                        oDataModel.callFunction("/deleteFlightDetail", {
                            method: "POST",
                            urlParameters: mParams,
                            success: (oResponse) => {
                                MessageToast.show("Connection Deleted Succesfully");
                                this._loadFlightsDetails();
                            },
                            error: (oError) => {
                                console.log(oError);
                            }
                        });
                    }
                }
            });
        },

    });
});