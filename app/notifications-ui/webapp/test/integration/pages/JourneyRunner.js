sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"my/company/hr/notificationsui/test/integration/pages/NotificationsList.gen",
	"my/company/hr/notificationsui/test/integration/pages/NotificationsObjectPage.gen"
], function (JourneyRunner, NotificationsListGenerated, NotificationsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('my/company/hr/notificationsui') + '/test/flp.html#app-preview',
        pages: {
			onTheNotificationsListGenerated: NotificationsListGenerated,
			onTheNotificationsObjectPageGenerated: NotificationsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

