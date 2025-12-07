/*global QUnit*/

sap.ui.define([
	"fleetlk/controller/FleetLK.controller"
], function (Controller) {
	"use strict";

	QUnit.module("FleetLK Controller");

	QUnit.test("I should test the FleetLK controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
