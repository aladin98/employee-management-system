import cds from '@sap/cds';

export default cds.service.impl(async function () {
  const { Employees, LeaveRequests, LeaveApprovals, PromotionRequests, PromotionFeedbacks, Notifications } = this.entities;

  const createNotificationIfMissing = async ({
    recipient_ID,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityID
  }) => {
    if (!recipient_ID || !relatedEntityID) return;

    const existing = await SELECT.one
      .from(Notifications)
      .columns('ID')
      .where({
        type,
        relatedEntityType,
        relatedEntityID,
        recipient_ID
      });

    if (!existing) {
      await INSERT.into(Notifications).entries({
        ID: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient_ID,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityID,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  };

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

  this.after(['CREATE', 'UPDATE'], LeaveRequests, async (data) => {
    const rows = Array.isArray(data) ? data : [data];

    for (const row of rows) {
      if (row?.status === 'SUBMITTED' && row?.currentApprover_ID) {
        await createNotificationIfMissing({
          recipient_ID: row.currentApprover_ID,
          type: 'LEAVE_SUBMITTED',
          title: 'New Leave Request',
          message: `A new leave request ${row.ID} requires your approval`,
          relatedEntityType: 'LeaveRequest',
          relatedEntityID: row.ID
        });
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

  this.after(['CREATE', 'UPDATE'], PromotionRequests, async (data) => {
    const rows = Array.isArray(data) ? data : [data];

    for (const row of rows) {
      if (row?.status === 'SUBMITTED' && row?.currentApprover_ID) {
        await createNotificationIfMissing({
          recipient_ID: row.currentApprover_ID,
          type: 'PROMOTION_SUBMITTED',
          title: 'New Promotion Request',
          message: `A new promotion request ${row.ID} requires your approval`,
          relatedEntityType: 'PromotionRequest',
          relatedEntityID: row.ID
        });
      }
    }
  });

  this.before('CREATE', PromotionFeedbacks, async (req) => {
    const data = req.data;

    if (!data.createdAt) {
      data.createdAt = new Date().toISOString();
    }

    if (data.promotionRequest_ID) {
      await UPDATE(PromotionRequests)
        .set({
          status: 'IN_REVIEW',
          statusCriticality: 2
        })
        .where({ ID: data.promotionRequest_ID });
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
      .columns('ID', 'requester_ID', 'currentApprover_ID', 'workflowLevel')
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

    if (leaveRequest?.requester_ID) {
      await INSERT.into(Notifications).entries({
        ID: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient_ID: leaveRequest.requester_ID,
        type: 'LEAVE_APPROVED',
        title: 'Leave Request Approved',
        message: `Your leave request ${leaveRequestId} has been approved successfully`,
        relatedEntityType: 'LeaveRequest',
        relatedEntityID: leaveRequestId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

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
      .columns('ID', 'requester_ID', 'currentApprover_ID', 'workflowLevel')
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

    if (leaveRequest?.requester_ID) {
      await INSERT.into(Notifications).entries({
        ID: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient_ID: leaveRequest.requester_ID,
        type: 'LEAVE_REJECTED',
        title: 'Leave Request Rejected',
        message: `Your leave request ${leaveRequestId} has been rejected`,
        relatedEntityType: 'LeaveRequest',
        relatedEntityID: leaveRequestId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

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

    const promotionRequest = await SELECT.one
      .from(PromotionRequests)
      .columns('requester_ID')
      .where({ ID: promotionRequestId });

    if (promotionRequest?.requester_ID) {
      await INSERT.into(Notifications).entries({
        ID: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient_ID: promotionRequest.requester_ID,
        type: 'PROMOTION_APPROVED',
        title: 'Promotion Request Approved',
        message: `Your promotion request ${promotionRequestId} has been approved successfully`,
        relatedEntityType: 'PromotionRequest',
        relatedEntityID: promotionRequestId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

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

    const promotionRequest = await SELECT.one
      .from(PromotionRequests)
      .columns('requester_ID')
      .where({ ID: promotionRequestId });

    if (promotionRequest?.requester_ID) {
      await INSERT.into(Notifications).entries({
        ID: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient_ID: promotionRequest.requester_ID,
        type: 'PROMOTION_REJECTED',
        title: 'Promotion Request Rejected',
        message: `Your promotion request ${promotionRequestId} has been rejected`,
        relatedEntityType: 'PromotionRequest',
        relatedEntityID: promotionRequestId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    req.info('Promotion request has been rejected successfully');
  });
});