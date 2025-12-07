/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["fleetlk/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
