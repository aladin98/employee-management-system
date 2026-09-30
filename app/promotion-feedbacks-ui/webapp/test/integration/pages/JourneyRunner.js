sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"my/company/hr/promotionfeedbacksui/test/integration/pages/PromotionFeedbacksList.gen",
	"my/company/hr/promotionfeedbacksui/test/integration/pages/PromotionFeedbacksObjectPage.gen"
], function (JourneyRunner, PromotionFeedbacksListGenerated, PromotionFeedbacksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('my/company/hr/promotionfeedbacksui') + '/test/flp.html#app-preview',
        pages: {
			onThePromotionFeedbacksListGenerated: PromotionFeedbacksListGenerated,
			onThePromotionFeedbacksObjectPageGenerated: PromotionFeedbacksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

