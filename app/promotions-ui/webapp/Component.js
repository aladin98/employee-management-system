sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("my.company.hr.promotionsui.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);

                const oUriParams = new URLSearchParams(window.location.search);
                const sDemoUserFromUrl = oUriParams.get("demoUser");
                const sDemoUser = sDemoUserFromUrl || window.localStorage.getItem("demoUser");

                if (sDemoUser) {
                    window.localStorage.setItem("demoUser", sDemoUser);

                    const oModel = this.getModel();
                    if (oModel) {
                        oModel.changeHttpHeaders({
                            "x-demo-user": sDemoUser
                        });
                    }
                }
            }
        });
    }
);