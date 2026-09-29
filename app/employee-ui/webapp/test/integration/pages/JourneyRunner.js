sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"my/company/hr/employeeui/test/integration/pages/EmployeesList.gen",
	"my/company/hr/employeeui/test/integration/pages/EmployeesObjectPage.gen"
], function (JourneyRunner, EmployeesListGenerated, EmployeesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('my/company/hr/employeeui') + '/test/flp.html#app-preview',
        pages: {
			onTheEmployeesListGenerated: EmployeesListGenerated,
			onTheEmployeesObjectPageGenerated: EmployeesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

