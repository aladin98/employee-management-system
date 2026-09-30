sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"my/company/hr/leaverequestsui/test/integration/pages/LeaveRequestsList.gen",
	"my/company/hr/leaverequestsui/test/integration/pages/LeaveRequestsObjectPage.gen"
], function (JourneyRunner, LeaveRequestsListGenerated, LeaveRequestsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('my/company/hr/leaverequestsui') + '/test/flp.html#app-preview',
        pages: {
			onTheLeaveRequestsListGenerated: LeaveRequestsListGenerated,
			onTheLeaveRequestsObjectPageGenerated: LeaveRequestsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

