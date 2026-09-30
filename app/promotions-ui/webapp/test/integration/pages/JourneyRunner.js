sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"my/company/hr/promotionsui/test/integration/pages/PromotionRequestsList.gen",
	"my/company/hr/promotionsui/test/integration/pages/PromotionRequestsObjectPage.gen"
], function (JourneyRunner, PromotionRequestsListGenerated, PromotionRequestsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('my/company/hr/promotionsui') + '/test/flp.html#app-preview',
        pages: {
			onThePromotionRequestsListGenerated: PromotionRequestsListGenerated,
			onThePromotionRequestsObjectPageGenerated: PromotionRequestsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

