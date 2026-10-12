sap.ui.define([
  "sap/ui/core/UIComponent"
], function (UIComponent) {
  "use strict";

  return UIComponent.extend("homeui.Component", {
    metadata: {
      interfaces: ["sap.ui.core.IAsyncContentCreation"],
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      const oModel = this.getModel();
      const sDemoUser = window.localStorage.getItem("demoUser");

      if (oModel && sDemoUser) {
        oModel.changeHttpHeaders({
          "x-demo-user": sDemoUser
        });
      }
    }
  });
});