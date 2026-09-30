import cds from '@sap/cds';

export default cds.service.impl(async function () {
  const { Employees, LeaveRequests, LeaveApprovals, PromotionRequests } = this.entities;

  this.after('READ', Employees, async (result) => {
    const rows = Array.isArray(result) ? result : [result];
    if (!rows.length) return;

    for (const row of rows) {
      if (!row) continue;

      row.fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();

      if (row.manager_ID) {
        const manager = await SELECT.one
          .from(Employees)
          .columns('firstName', 'lastName')
          .where({ ID: row.manager_ID });

        if (manager) {
          row.managerName = `${manager.firstName || ''} ${manager.lastName || ''}`.trim();
        }
      }
    }
  });

  this.before(['CREATE', 'UPDATE'], Employees, (req) => {
    const data = req.data;
    if (data) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
  });

  this.before('CREATE', LeaveRequests, async (req) => {
    const data = req.data;

    data.status = 'SUBMITTED';
    data.statusCriticality = 2;
    data.submittedAt = new Date().toISOString();
    data.workflowLevel = 1;

    if (data.requester_ID) {
      const requester = await SELECT.one
        .from(Employees)
        .columns('manager_ID')
        .where({ ID: data.requester_ID });

      if (requester?.manager_ID) {
        data.currentApprover_ID = requester.manager_ID;
      }
    }
  });

  this.before(['CREATE', 'UPDATE'], PromotionRequests, async (req) => {
    const data = req.data;

    if (req.event === 'CREATE') {
      data.status = 'SUBMITTED';
      data.statusCriticality = 2;
      data.submittedAt = new Date().toISOString();
      data.workflowLevel = 1;

      if (data.requester_ID) {
        const requester = await SELECT.one
          .from(Employees)
          .columns('manager_ID')
          .where({ ID: data.requester_ID });

        if (requester?.manager_ID) {
          data.currentApprover_ID = requester.manager_ID;
        }
      }
    }

    if (data.employeeConcerned_ID) {
      const employee = await SELECT.one
        .from(Employees)
        .columns('jobTitle_ID', 'salary')
        .where({ ID: data.employeeConcerned_ID });

      if (employee) {
        data.currentJobTitle_ID = employee.jobTitle_ID;
        data.currentSalary = employee.salary;
      }
    }
  });

  this.on('approveLeaveRequest', async (req) => {
    const leaveRequestId = req.params[0].ID;

    await UPDATE(LeaveRequests)
      .set({
        status: 'APPROVED',
        statusCriticality: 3,
        finalDecisionAt: new Date().toISOString()
      })
      .where({ ID: leaveRequestId });

    const leaveRequest = await SELECT.one
      .from(LeaveRequests)
      .columns('ID', 'currentApprover_ID', 'workflowLevel')
      .where({ ID: leaveRequestId });

    await INSERT.into(LeaveApprovals).entries({
      ID: `LAP-${Date.now()}`,
      leaveRequest_ID: leaveRequestId,
      approver_ID: leaveRequest?.currentApprover_ID,
      approverRole: 'APPROVER',
      decision: 'APPROVED',
      comment: 'Approved',
      level: leaveRequest?.workflowLevel || 1,
      decidedAt: new Date().toISOString()
    });

    req.info('Leave request has been approved successfully');
  });

  this.on('rejectLeaveRequest', async (req) => {
    const leaveRequestId = req.params[0].ID;

    await UPDATE(LeaveRequests)
      .set({
        status: 'REJECTED',
        statusCriticality: 1,
        finalDecisionAt: new Date().toISOString()
      })
      .where({ ID: leaveRequestId });

    const leaveRequest = await SELECT.one
      .from(LeaveRequests)
      .columns('ID', 'currentApprover_ID', 'workflowLevel')
      .where({ ID: leaveRequestId });

    await INSERT.into(LeaveApprovals).entries({
      ID: `LAP-${Date.now()}`,
      leaveRequest_ID: leaveRequestId,
      approver_ID: leaveRequest?.currentApprover_ID,
      approverRole: 'APPROVER',
      decision: 'REJECTED',
      comment: 'Rejected',
      level: leaveRequest?.workflowLevel || 1,
      decidedAt: new Date().toISOString()
    });

    req.info('Leave request has been rejected successfully');
  });

  this.on('approvePromotionRequest', async (req) => {
    const promotionRequestId = req.params[0].ID;

    await UPDATE(PromotionRequests)
      .set({
        status: 'APPROVED',
        statusCriticality: 3,
        finalDecisionAt: new Date().toISOString()
      })
      .where({ ID: promotionRequestId });

    req.info('Promotion request has been approved successfully');
  });

  this.on('rejectPromotionRequest', async (req) => {
    const promotionRequestId = req.params[0].ID;

    await UPDATE(PromotionRequests)
      .set({
        status: 'REJECTED',
        statusCriticality: 1,
        finalDecisionAt: new Date().toISOString()
      })
      .where({ ID: promotionRequestId });

    req.info('Promotion request has been rejected successfully');
  });
});