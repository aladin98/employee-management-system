import cds from '@sap/cds';

export default cds.service.impl(async function () {
  const {
    Employees,
    LeaveRequests,
    LeaveApprovals,
    PromotionRequests,
    PromotionFeedbacks,
    Notifications
  } = this.entities;

  const ROLE = {
    EMPLOYEE: 'R_EMP',
    MANAGER: 'R_MGR',
    DIRECTOR: 'R_DIR',
    RH: 'R_RH',
    DRH: 'R_DRH'
  };

  const generateShortId = async (entity, prefix, length = 10) => {
    for (let i = 0; i < 100; i++) {
      const randomPartLength = length - prefix.length;
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 2 + randomPartLength)
        .toUpperCase()
        .padEnd(randomPartLength, '0');

      const id = `${prefix}${randomPart}`.substring(0, length);

      const existing = await SELECT.one.from(entity).columns('ID').where({ ID: id });
      if (!existing) return id;
    }

    throw new Error(`Failed to generate unique ID for prefix ${prefix}`);
  };

  const createNotification = async ({
    recipient_ID,
    type,
    title,
    message,
    relatedEntityType,
    relatedEntityID
  }) => {
    if (!recipient_ID || !relatedEntityID) return;

    const notificationId = await generateShortId(Notifications, 'N', 10);

    await INSERT.into(Notifications).entries({
      ID: notificationId,
      recipient_ID,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityID,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  };

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
        recipient_ID,
        type,
        relatedEntityType,
        relatedEntityID
      });

    if (!existing) {
      await createNotification({
        recipient_ID,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityID
      });
    }
  };

  const getRoleLabel = (roleId) => {
    switch (roleId) {
      case ROLE.EMPLOYEE: return 'EMPLOYEE';
      case ROLE.MANAGER: return 'MANAGER';
      case ROLE.DIRECTOR: return 'DIRECTOR';
      case ROLE.RH: return 'RH';
      case ROLE.DRH: return 'DRH';
      default: return 'UNKNOWN';
    }
  };

  const getLoggedInEmployee = async (req) => {
    const userEmail =
      req.user?.attr?.email ||
      req.user?.email ||
      req.user?.id;

    if (!userEmail) {
      req.error(401, 'Unable to identify logged-in user');
      return null;
    }

    const employee = await SELECT.one
      .from(Employees)
      .columns('ID', 'email', 'role_ID', 'manager_ID', 'firstName', 'lastName')
      .where({ email: userEmail });

    if (!employee) {
      req.error(403, `No employee profile found for user ${userEmail}`);
      return null;
    }

    return employee;
  };

  const getLoggedInEmployeeSafe = async (req) => {
    const userEmail =
      req.user?.attr?.email ||
      req.user?.email ||
      req.user?.id;

    if (!userEmail) return null;

    return await SELECT.one
      .from(Employees)
      .columns('ID', 'email', 'role_ID', 'manager_ID')
      .where({ email: userEmail });
  };

  const getEmployeeById = async (employeeId) => {
    if (!employeeId) return null;

    return await SELECT.one
      .from(Employees)
      .columns('ID', 'email', 'role_ID', 'manager_ID', 'firstName', 'lastName', 'isActive')
      .where({ ID: employeeId });
  };

  const getRHApprover = async () => {
    return await SELECT.one
      .from(Employees)
      .columns('ID', 'email', 'role_ID', 'manager_ID', 'firstName', 'lastName', 'isActive')
      .where({ role_ID: ROLE.RH, isActive: true });
  };

  const getDRHApprover = async () => {
    return await SELECT.one
      .from(Employees)
      .columns('ID', 'email', 'role_ID', 'manager_ID', 'firstName', 'lastName', 'isActive')
      .where({ role_ID: ROLE.DRH, isActive: true });
  };

  const getRHOrDRHApprover = async () => {
    const rh = await getRHApprover();
    if (rh) return rh;

    return await getDRHApprover();
  };

  const validateCurrentApprover = async (
    req,
    entity,
    requestId,
    requestLabel,
    allowedStatuses = ['SUBMITTED']
  ) => {
    const loggedInEmployee = await getLoggedInEmployee(req);
    if (!loggedInEmployee) return null;

    const requestRecord = await SELECT.one
      .from(entity)
      .columns('ID', 'status', 'currentApprover_ID', 'workflowLevel', 'requester_ID')
      .where({ ID: requestId });

    if (!requestRecord) {
      req.error(404, `${requestLabel} not found`);
      return null;
    }

    if (!allowedStatuses.includes(requestRecord.status)) {
      req.error(400, `${requestLabel} cannot be processed because its status is ${requestRecord.status}`);
      return null;
    }

    if (!requestRecord.currentApprover_ID) {
      req.error(400, `${requestLabel} has no current approver assigned`);
      return null;
    }

    if (requestRecord.currentApprover_ID !== loggedInEmployee.ID) {
      req.error(403, `You are not authorized to process this ${requestLabel.toLowerCase()}`);
      return null;
    }

    return { loggedInEmployee, requestRecord };
  };

  const createPromotionFeedback = async ({
    promotionRequest_ID,
    author_ID,
    authorRole,
    feedbackText,
    recommendation
  }) => {
    await INSERT.into(PromotionFeedbacks).entries({
      ID: cds.utils.uuid(),
      promotionRequest_ID,
      author_ID,
      authorRole,
      feedbackText,
      recommendation,
      createdAt: new Date().toISOString()
    });
  };

  const getInitialPromotionApprover = async (requester_ID) => {
    const requester = await getEmployeeById(requester_ID);
    if (!requester) return { error: 'Requester not found' };

    if (requester.role_ID === ROLE.EMPLOYEE) {
      const manager = await getEmployeeById(requester.manager_ID);
      if (!manager) return { error: 'Manager approver not found for employee requester' };
      return { approver: manager, workflowLevel: 1 };
    }

    if (requester.role_ID === ROLE.MANAGER) {
      const director = await getEmployeeById(requester.manager_ID);
      if (!director) return { error: 'Director approver not found for manager requester' };
      return { approver: director, workflowLevel: 1 };
    }

    if (requester.role_ID === ROLE.DIRECTOR || requester.role_ID === ROLE.RH) {
      const drh = await getDRHApprover();
      if (!drh) return { error: 'DRH approver not found' };
      return { approver: drh, workflowLevel: 1 };
    }

    if (requester.role_ID === ROLE.DRH) {
      return { approver: requester, workflowLevel: 1 };
    }

    return { error: 'Unsupported requester role for promotion workflow' };
  };

  const getNextPromotionStep = async (requestRecord) => {
    const requester = await getEmployeeById(requestRecord.requester_ID);
    if (!requester) return { error: 'Requester not found' };

    const currentLevel = requestRecord.workflowLevel || 1;

    if (requester.role_ID === ROLE.EMPLOYEE) {
      if (currentLevel === 1) {
        const manager = await getEmployeeById(requester.manager_ID);
        const director = manager?.manager_ID ? await getEmployeeById(manager.manager_ID) : null;

        if (!director) return { error: 'Director approver not found for employee requester' };

        return {
          final: false,
          nextApprover: director,
          nextLevel: 2
        };
      }

      if (currentLevel === 2) {
        const hrApprover = await getRHOrDRHApprover();
        if (!hrApprover) return { error: 'RH/DRH approver not found for employee requester' };

        return {
          final: false,
          nextApprover: hrApprover,
          nextLevel: 3
        };
      }

      if (currentLevel === 3) {
        return { final: true };
      }
    }

    if (requester.role_ID === ROLE.MANAGER) {
      if (currentLevel === 1) {
        const hrApprover = await getRHOrDRHApprover();
        if (!hrApprover) return { error: 'RH/DRH approver not found for manager requester' };

        return {
          final: false,
          nextApprover: hrApprover,
          nextLevel: 2
        };
      }

      if (currentLevel === 2) {
        return { final: true };
      }
    }

    if (requester.role_ID === ROLE.DIRECTOR || requester.role_ID === ROLE.RH) {
      if (currentLevel === 1) {
        return { final: true };
      }
    }

    if (requester.role_ID === ROLE.DRH) {
      if (currentLevel === 1) {
        return { final: true };
      }
    }

    return { error: 'No promotion workflow rule found for this requester role/level' };
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

  this.after('READ', LeaveRequests, async (result, req) => {
    const rows = Array.isArray(result) ? result : [result];
    if (!rows.length) return;

    const loggedInEmployee = await getLoggedInEmployeeSafe(req);

    for (const row of rows) {
      if (!row) continue;

      const isCurrentApprover =
        loggedInEmployee &&
        row.currentApprover_ID &&
        loggedInEmployee.ID === row.currentApprover_ID;

      const isActionableStatus = row.status === 'SUBMITTED';

      row.canApprove = !!(isCurrentApprover && isActionableStatus);
      row.canReject = !!(isCurrentApprover && isActionableStatus);
    }
  });

  this.after('READ', PromotionRequests, async (result, req) => {
    const rows = Array.isArray(result) ? result : [result];
    if (!rows.length) return;

    const loggedInEmployee = await getLoggedInEmployeeSafe(req);

    for (const row of rows) {
      if (!row) continue;

      const isCurrentApprover =
        loggedInEmployee &&
        row.currentApprover_ID &&
        loggedInEmployee.ID === row.currentApprover_ID;

      const isActionableStatus =
        row.status === 'SUBMITTED' || row.status === 'IN_REVIEW';

      row.canApprove = !!(isCurrentApprover && isActionableStatus);
      row.canReject = !!(isCurrentApprover && isActionableStatus);
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

    if (!data.ID) {
      data.ID = await generateShortId(LeaveRequests, 'LR', 10);
    }

    data.status = 'SUBMITTED';
    data.statusCriticality = 2;
    data.submittedAt = new Date().toISOString();
    data.workflowLevel = 1;

    if (data.requester_ID) {
      const requester = await SELECT.one
        .from(Employees)
        .columns('ID', 'role_ID', 'manager_ID')
        .where({ ID: data.requester_ID });

      if (!requester) {
        req.error(400, 'Leave requester not found');
        return;
      }

      let approver = null;

      if (requester.role_ID === ROLE.EMPLOYEE) {
        approver = await getEmployeeById(requester.manager_ID);
        if (!approver) {
          req.error(400, 'Manager approver not found for employee requester');
          return;
        }
      } else if (requester.role_ID === ROLE.MANAGER) {
        approver = await getEmployeeById(requester.manager_ID);
        if (!approver) {
          req.error(400, 'Director approver not found for manager requester');
          return;
        }
      } else if (requester.role_ID === ROLE.DIRECTOR || requester.role_ID === ROLE.RH) {
        approver = await getDRHApprover();
        if (!approver) {
          req.error(400, 'DRH approver not found');
          return;
        }
      } else if (requester.role_ID === ROLE.DRH) {
        approver = requester;
      } else {
        req.error(400, 'Unsupported requester role for leave workflow');
        return;
      }

      data.currentApprover_ID = approver.ID;
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

  this.before('CREATE', PromotionRequests, async (req) => {
    const data = req.data;

    if (!data.ID) {
      data.ID = await generateShortId(PromotionRequests, 'PR', 10);
    }

    data.status = 'SUBMITTED';
    data.statusCriticality = 2;
    data.submittedAt = new Date().toISOString();
    data.workflowLevel = 1;

    if (data.requester_ID) {
      const initialRoute = await getInitialPromotionApprover(data.requester_ID);

      if (initialRoute?.error) {
        req.error(400, initialRoute.error);
        return;
      }

      data.currentApprover_ID = initialRoute.approver?.ID;
      data.workflowLevel = initialRoute.workflowLevel;
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
      if (
        row?.currentApprover_ID &&
        (row?.status === 'SUBMITTED' || row?.status === 'IN_REVIEW')
      ) {
        await createNotificationIfMissing({
          recipient_ID: row.currentApprover_ID,
          type: 'PROMOTION_SUBMITTED',
          title: 'Promotion Request Requires Action',
          message: `Promotion request ${row.ID} requires your approval/validation`,
          relatedEntityType: 'PromotionRequest',
          relatedEntityID: row.ID
        });
      }
    }
  });

  this.before('CREATE', PromotionFeedbacks, async (req) => {
    const data = req.data;

    if (!data.ID) {
      data.ID = cds.utils.uuid();
    }

    if (!data.createdAt) {
      data.createdAt = new Date().toISOString();
    }
  });

  this.on('approveLeaveRequest', async (req) => {
    const leaveRequestId = req.params[0].ID;

    const validation = await validateCurrentApprover(
      req,
      LeaveRequests,
      leaveRequestId,
      'Leave request',
      ['SUBMITTED']
    );
    if (!validation) return;

    const { loggedInEmployee, requestRecord } = validation;

    await UPDATE(LeaveRequests)
      .set({
        status: 'APPROVED',
        statusCriticality: 3,
        finalDecisionAt: new Date().toISOString()
      })
      .where({ ID: leaveRequestId });

    const approvalId = await generateShortId(LeaveApprovals, 'LA', 10);

    await INSERT.into(LeaveApprovals).entries({
      ID: approvalId,
      leaveRequest_ID: leaveRequestId,
      approver_ID: requestRecord.currentApprover_ID,
      approverRole: getRoleLabel(loggedInEmployee.role_ID),
      decision: 'APPROVED',
      comment: 'Approved',
      level: requestRecord.workflowLevel || 1,
      decidedAt: new Date().toISOString()
    });

    if (requestRecord?.requester_ID) {
      await createNotification({
        recipient_ID: requestRecord.requester_ID,
        type: 'LEAVE_APPROVED',
        title: 'Leave Request Approved',
        message: `Your leave request ${leaveRequestId} has been approved successfully`,
        relatedEntityType: 'LeaveRequest',
        relatedEntityID: leaveRequestId
      });
    }

    req.info('Leave request has been approved successfully');
  });

  this.on('rejectLeaveRequest', async (req) => {
    const leaveRequestId = req.params[0].ID;

    const validation = await validateCurrentApprover(
      req,
      LeaveRequests,
      leaveRequestId,
      'Leave request',
      ['SUBMITTED']
    );
    if (!validation) return;

    const { loggedInEmployee, requestRecord } = validation;

    await UPDATE(LeaveRequests)
      .set({
        status: 'REJECTED',
        statusCriticality: 1,
        finalDecisionAt: new Date().toISOString()
      })
      .where({ ID: leaveRequestId });

    const approvalId = await generateShortId(LeaveApprovals, 'LA', 10);

    await INSERT.into(LeaveApprovals).entries({
      ID: approvalId,
      leaveRequest_ID: leaveRequestId,
      approver_ID: requestRecord.currentApprover_ID,
      approverRole: getRoleLabel(loggedInEmployee.role_ID),
      decision: 'REJECTED',
      comment: 'Rejected',
      level: requestRecord.workflowLevel || 1,
      decidedAt: new Date().toISOString()
    });

    if (requestRecord?.requester_ID) {
      await createNotification({
        recipient_ID: requestRecord.requester_ID,
        type: 'LEAVE_REJECTED',
        title: 'Leave Request Rejected',
        message: `Your leave request ${leaveRequestId} has been rejected`,
        relatedEntityType: 'LeaveRequest',
        relatedEntityID: leaveRequestId
      });
    }

    req.info('Leave request has been rejected successfully');
  });

  this.on('approvePromotionRequest', async (req) => {
    const promotionRequestId = req.params[0].ID;

    const validation = await validateCurrentApprover(
      req,
      PromotionRequests,
      promotionRequestId,
      'Promotion request',
      ['SUBMITTED', 'IN_REVIEW']
    );
    if (!validation) return;

    const { loggedInEmployee, requestRecord } = validation;

    await createPromotionFeedback({
      promotionRequest_ID: promotionRequestId,
      author_ID: loggedInEmployee.ID,
      authorRole: getRoleLabel(loggedInEmployee.role_ID),
      feedbackText: 'Approved',
      recommendation: 'APPROVED'
    });

    const nextStep = await getNextPromotionStep(requestRecord);

    if (nextStep?.error) {
      req.error(400, nextStep.error);
      return;
    }

    if (nextStep.final) {
      await UPDATE(PromotionRequests)
        .set({
          status: 'APPROVED',
          statusCriticality: 3,
          finalDecisionAt: new Date().toISOString(),
          currentApprover_ID: null
        })
        .where({ ID: promotionRequestId });

      if (requestRecord?.requester_ID) {
        await createNotification({
          recipient_ID: requestRecord.requester_ID,
          type: 'PROMOTION_APPROVED',
          title: 'Promotion Request Approved',
          message: `Your promotion request ${promotionRequestId} has been approved successfully`,
          relatedEntityType: 'PromotionRequest',
          relatedEntityID: promotionRequestId
        });
      }

      req.info('Promotion request has been approved successfully');
      return;
    }

    await UPDATE(PromotionRequests)
      .set({
        status: 'IN_REVIEW',
        statusCriticality: 2,
        workflowLevel: nextStep.nextLevel,
        currentApprover_ID: nextStep.nextApprover.ID
      })
      .where({ ID: promotionRequestId });

    await createNotificationIfMissing({
      recipient_ID: nextStep.nextApprover.ID,
      type: 'PROMOTION_SUBMITTED',
      title: 'Promotion Request Requires Action',
      message: `Promotion request ${promotionRequestId} requires your approval/validation`,
      relatedEntityType: 'PromotionRequest',
      relatedEntityID: promotionRequestId
    });

    const nextApproverName = `${nextStep.nextApprover.firstName || ''} ${nextStep.nextApprover.lastName || ''}`.trim();
    req.info(`Promotion request forwarded to ${nextApproverName}`);
  });

  this.on('rejectPromotionRequest', async (req) => {
    const promotionRequestId = req.params[0].ID;

    const validation = await validateCurrentApprover(
      req,
      PromotionRequests,
      promotionRequestId,
      'Promotion request',
      ['SUBMITTED', 'IN_REVIEW']
    );
    if (!validation) return;

    const { loggedInEmployee, requestRecord } = validation;

    await createPromotionFeedback({
      promotionRequest_ID: promotionRequestId,
      author_ID: loggedInEmployee.ID,
      authorRole: getRoleLabel(loggedInEmployee.role_ID),
      feedbackText: 'Rejected',
      recommendation: 'REJECTED'
    });

    await UPDATE(PromotionRequests)
      .set({
        status: 'REJECTED',
        statusCriticality: 1,
        finalDecisionAt: new Date().toISOString(),
        currentApprover_ID: null
      })
      .where({ ID: promotionRequestId });

    if (requestRecord?.requester_ID) {
      await createNotification({
        recipient_ID: requestRecord.requester_ID,
        type: 'PROMOTION_REJECTED',
        title: 'Promotion Request Rejected',
        message: `Your promotion request ${promotionRequestId} has been rejected`,
        relatedEntityType: 'PromotionRequest',
        relatedEntityID: promotionRequestId
      });
    }

    req.info('Promotion request has been rejected successfully');
  });

  this.on('getDashboardStats', async () => {
    const employeesResult = await SELECT.one
      .from(Employees)
      .columns`count(*) as count`;

    const leaveResult = await SELECT.one
      .from(LeaveRequests)
      .columns`count(*) as count`
      .where({ status: 'SUBMITTED' });

    const promotionResult = await SELECT.one
      .from(PromotionRequests)
      .columns`count(*) as count`
      .where(`status = 'SUBMITTED' or status = 'IN_REVIEW'`);

    const notificationResult = await SELECT.one
      .from(Notifications)
      .columns`count(*) as count`
      .where({ isRead: false });

    return {
      employees: Number(employeesResult?.count || 0),
      leaveRequests: Number(leaveResult?.count || 0),
      promotions: Number(promotionResult?.count || 0),
      notifications: Number(notificationResult?.count || 0)
    };
  });
});