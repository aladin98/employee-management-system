import cds from '@sap/cds';

export default cds.service.impl(async function () {
  const { Employees } = this.entities;

  this.after('READ', Employees, (each) => {
    const rows = Array.isArray(each) ? each : [each];
    for (const row of rows) {
      if (row) {
        row.fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
      }
    }
  });

  this.before(['CREATE', 'UPDATE'], Employees, (req) => {
    const data = req.data;
    if (data) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
  });
});