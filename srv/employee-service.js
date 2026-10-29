import 'dotenv/config';
import cds from '@sap/cds';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

export default cds.service.impl(async function () {
  const {
  Employees,
  Departments,
  JobTitles,
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

  const sendResetPasswordEmail = async (toEmail, resetLink) => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset</h2>
          <p>You requested to reset your password.</p>
          <p>Click the link below to set a new password:</p>
          <p>
            <a href="${resetLink}" target="_blank">
              Reset your password
            </a>
          </p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `
    });

    console.log('Reset password email sent:', info.messageId);

    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
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

  const toODataV2Date = (dateString) => {
    if (!dateString) return null;
    const timestamp = new Date(dateString).getTime();
    return `/Date(${timestamp})/`;
  };

  const toODataV2DateTime = (isoString) => {
    if (!isoString) return null;
    const timestamp = new Date(isoString).getTime();
    return `/Date(${timestamp}+0000)/`;
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
      req.headers?.['x-demo-user'] ||
      process.env.LOCAL_TEST_USER ||
      req.user?.attr?.email ||
      req.user?.email ||
      req.user?.id ||
      null;

    if (!userEmail || userEmail === 'anonymous') {
      req.error(403, 'No logged-in user email found');
      return null;
    }

    const employees = await getEmployeesFromS4();
    const employee = employees.find(e => e.email === userEmail) || null;

    if (!employee) {
      req.error(403, `No employee profile found for user ${userEmail}`);
      return null;
    }

    return employee;
  };

  const getLoggedInEmployeeSafe = async (req) => {
    const userEmail =
      req.headers?.['x-demo-user'] ||
      process.env.LOCAL_TEST_USER ||
      req.user?.attr?.email ||
      req.user?.email ||
      req.user?.id ||
      null;

    if (!userEmail || userEmail === 'anonymous') {
      return null;
    }

    const employees = await getEmployeesFromS4();
    return employees.find(e => e.email === userEmail) || null;
  };

  const getEmployeeById = async (employeeId) => {
    if (!employeeId) return null;

    const employees = await getEmployeesFromS4();
    return employees.find(e => e.ID === employeeId) || null;
  };

  const getRHApprover = async () => {
    const employees = await getEmployeesFromS4();
    return employees.find(e => e.role_ID === ROLE.RH && e.isActive) || null;
  };

  const getDRHApprover = async () => {
    const employees = await getEmployeesFromS4();
    return employees.find(e => e.role_ID === ROLE.DRH && e.isActive) || null;
  };

  const getRHOrDRHApprover = async () => {
    const rh = await getRHApprover();
    if (rh) return rh;

    return await getDRHApprover();
  };

  const ensureHRAdminForEmployeeMaintenance = async (req) => {
    const loggedInEmployee = await getLoggedInEmployee(req);
    if (!loggedInEmployee) return null;

    const allowedRoles = [ROLE.RH, ROLE.DRH];

    if (!allowedRoles.includes(loggedInEmployee.role_ID)) {
      req.error(403, 'Only RH or DRH can create, update, or delete employees');
      return null;
    }

    return loggedInEmployee;
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

    let requestRecord = null;

    if (entity === LeaveRequests) {
      const leaveRequests = await fetchLeaveRequestsFromS4();
      requestRecord = leaveRequests.find(r => r.ID === requestId) || null;
    } else if (entity === PromotionRequests) {
      const promotionRequests = await fetchPromotionRequestsFromS4();
      requestRecord = promotionRequests.find(r => r.ID === requestId) || null;
    } else {
      requestRecord = await SELECT.one
        .from(entity)
        .columns('ID', 'status', 'currentApprover_ID', 'workflowLevel', 'requester_ID')
        .where({ ID: requestId });
    }

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

  const getCurrentUserEmail = (req) => {
    return (
      req.headers?.['x-demo-user'] ||
      process.env.LOCAL_TEST_USER ||
      req.user?.attr?.email ||
      req.user?.email ||
      req.user?.id ||
      null
    );
  };

  const getDefaultProfileEmployee = async () => {
    const employees = await fetchEmployeesFromS4();
    return employees.find(e => e.email === (process.env.LOCAL_TEST_USER || '')) || employees[0] || null;
  };

  const callS4 = async ({ path, method = 'GET', data = null }) => {
  const baseUrl = process.env.S4_BASE_URL;
  const username = process.env.S4_USERNAME;
  const password = process.env.S4_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error('Missing S4 environment variables');
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  });

  const text = await response.text();

  if (!response.ok) {
      throw new Error(`S4 call failed: ${response.status} ${response.statusText} - ${text}`);
  }

    return text ? JSON.parse(text) : {};
};

  const parseS4Date = (value) => {
    if (!value) return null;

    if (typeof value === 'string' && value.startsWith('/Date(')) {
      const millis = Number(value.replace('/Date(', '').replace(')/', '').split('+')[0]);
      return new Date(millis).toISOString().split('T')[0];
    }

    if (typeof value === 'string') {
      return value.substring(0, 10);
    }

    return null;
  };

  const parseS4DateTime = (value) => {
    if (!value) return null;

    if (typeof value === 'string' && value.startsWith('/Date(')) {
      const millis = Number(value.replace('/Date(', '').replace(')/', '').split('+')[0]);
      return new Date(millis).toISOString();
    }

    if (typeof value === 'string') {
      return value;
    }

    return null;
  };

  const fetchPasswordResetsFromS4 = async () => {
  const result = await callS4({
    path: '/sap/opu/odata/sap/YY1_PASSWORDRESET_CDS/YY1_PASSWORDRESET?$format=json'
  });

  const rows = result?.d?.results || [];

  return rows.map(row => ({
    ID: row.ResetID,
    email: row.Email,
    token: row.Token,
    expiresAt: row.ExpiresAt,
    used: row.Used,
    sapUuid: row.SAP_UUID
  }));
};

  const createS4PasswordReset = async ({
  email,
  token,
  expiresAt
}) => {
  const payload = {
    ResetID: `PR${Date.now().toString().slice(-8)}`,
    Email: email,
    Token: token,
    ExpiresAt: expiresAt,
    Used: false
  };

  return await createS4({
    servicePath: '/sap/opu/odata/sap/YY1_PASSWORDRESET_CDS',
    entitySet: 'YY1_PASSWORDRESET',
    data: payload
  });
};

const updateS4PasswordResetByToken = async (token, updates) => {
  const resets = await fetchPasswordResetsFromS4();
  const target = resets.find(r => r.token === token);

  if (!target?.sapUuid) {
    throw new Error(`S4 Password Reset token not found for token ${token}`);
  }

  const entityPath = `YY1_PASSWORDRESET(guid'${target.sapUuid}')`;

  return await updateS4({
    servicePath: '/sap/opu/odata/sap/YY1_PASSWORDRESET_CDS',
    entityPath,
    data: updates,
    method: 'PATCH'
  });
};

const updateS4UserCredentialPasswordByEmail = async (email, newPassword) => {
  const result = await callS4({
    path: '/sap/opu/odata/sap/YY1_USERCREDENTIAL_CDS/YY1_USERCREDENTIAL?$format=json'
  });

  const rows = result?.d?.results || [];
  const target = rows.find(
    row => row.Email?.trim().toLowerCase() === email.trim().toLowerCase()
  );

  if (!target?.SAP_UUID) {
    throw new Error(`S4 User Credential not found for email ${email}`);
  }

  const entityPath = `YY1_USERCREDENTIAL(guid'${target.SAP_UUID}')`;

  return await updateS4({
    servicePath: '/sap/opu/odata/sap/YY1_USERCREDENTIAL_CDS',
    entityPath,
    data: {
      Password: newPassword
    },
    method: 'PATCH'
  });
};

  const fetchDepartmentsFromS4 = async () => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_DEPARTMENT_CDS/YY1_DEPARTMENT?$format=json'
    });

    const rows = result?.d?.results || [];

    return rows.map(row => ({
      ID: row.DepartmentID,
      name: row.DepartmentName,
      location: row.Location
    }));
  };

  const fetchJobTitlesFromS4 = async () => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_JOBTITLE_CDS/YY1_JOBTITLE?$format=json'
    });

    const rows = result?.d?.results || [];

    return rows.map(row => ({
      ID: row.JobTitleID,
      title: row.Title,
      description: row.Description
    }));
  };

  const fetchEmployeesFromS4 = async () => {
    const [employeesResult, departments, jobTitles, roles] = await Promise.all([
      callS4({
        path: '/sap/opu/odata/sap/YY1_EMPLOYEE_CDS/YY1_EMPLOYEE?$format=json'
      }),
      fetchDepartmentsFromS4(),
      fetchJobTitlesFromS4(),
      SELECT.from('my.company.hr.Roles').columns('ID', 'name', 'description')
    ]);

    const rows = employeesResult?.d?.results || [];

    const departmentMap = new Map(departments.map(d => [d.ID, d]));
    const jobTitleMap = new Map(jobTitles.map(j => [j.ID, j]));
    const roleMap = new Map(roles.map(r => [r.ID, r]));
    console.log('Loaded local roles:', roles);
    
    const employees = rows.map(row => ({
      ID: row.EmployeeID,
      firstName: row.FirstName,
      lastName: row.LastName,
      fullName: row.FullName,
      email: row.Email,
      phone: row.Phone,
      hireDate: parseS4Date(row.HireDate),
      salary: row.Salary_V != null ? Number(row.Salary_V) : null,
      isActive: row.IsActive,
      country: row.Country,
      department_ID: row.DepartmentID,
      role_ID: row.RoleID,
      jobTitle_ID: row.JobTitleID,
      manager_ID: row.ManagerID || null
    }));

    const employeeMap = new Map(employees.map(e => [e.ID, e]));

    for (const emp of employees) {
      emp.department = emp.department_ID ? departmentMap.get(emp.department_ID) || null : null;
      emp.jobTitle = emp.jobTitle_ID ? jobTitleMap.get(emp.jobTitle_ID) || null : null;
      emp.role = emp.role_ID ? roleMap.get(emp.role_ID) || { ID: emp.role_ID, name: emp.role_ID } : null;

      if (emp.manager_ID) {
        const manager = employeeMap.get(emp.manager_ID);
        emp.manager = manager
          ? {
              ID: manager.ID,
              fullName: manager.fullName,
              IsActiveEntity: true
            }
          : null;
      } else {
        emp.manager = null;
      }

      emp.IsActiveEntity = true;
      emp.HasActiveEntity = false;
      emp.HasDraftEntity = false;
    }

    return employees;
  };

  const getEmployeesFromS4 = async () => {
    return await fetchEmployeesFromS4();
  };

  const fetchLeaveRequestsFromS4 = async () => {
    const [result, employees] = await Promise.all([
      callS4({
        path: '/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS/YY1_LEAVEREQUEST?$format=json'
      }),
      fetchEmployeesFromS4()
    ]);

    const rows = result?.d?.results || [];
    const employeeMap = new Map(employees.map(e => [e.ID, e]));

    const leaveRequests = rows.map(row => ({
      ID: row.LeaveRequestID,
      requester_ID: row.RequesterID,
      startDate: parseS4Date(row.StartDate),
      endDate: parseS4Date(row.EndDate),
      reason: row.Reason,
      status: row.Status,
      statusCriticality: row.StatusCriticality != null ? Number(row.StatusCriticality) : null,
      workflowLevel: row.WorkflowLevel != null ? Number(row.WorkflowLevel) : null,
      currentApprover_ID: row.CurrentApproverID || null,
      submittedAt: parseS4DateTime(row.SubmittedAt),
      finalDecisionAt: parseS4DateTime(row.FinalDecisionAt),
      IsActiveEntity: true,
      HasActiveEntity: false,
      HasDraftEntity: false
    }));

    for (const req of leaveRequests) {
      req.requester = req.requester_ID ? employeeMap.get(req.requester_ID) || null : null;
      req.currentApprover = req.currentApprover_ID ? employeeMap.get(req.currentApprover_ID) || null : null;
    }

    return leaveRequests;
  };

  const fetchPromotionRequestsFromS4 = async () => {
    const [result, employees, jobTitles] = await Promise.all([
      callS4({
        path: '/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS/YY1_PROMOTIONREQUEST?$format=json'
      }),
      fetchEmployeesFromS4(),
      fetchJobTitlesFromS4()
    ]);

    const rows = result?.d?.results || [];

    const employeeMap = new Map(employees.map(e => [e.ID, e]));
    const jobTitleMap = new Map(jobTitles.map(j => [j.ID, j]));

    const promotionRequests = rows.map(row => ({
      ID: row.PromotionRequestID,
      requester_ID: row.RequesterID,
      employeeConcerned_ID: row.EmployeeConcernedID,
      currentJobTitle_ID: row.CurrentJobTitleID || null,
      requestedJobTitle_ID: row.RequestedJobTitleID || null,
      currentSalary: row.CurrentSalary_V != null ? Number(row.CurrentSalary_V) : null,
      requestedSalary: row.RequestedSalary_V != null ? Number(row.RequestedSalary_V) : null,
      justification: row.Justification,
      status: row.Status,
      statusCriticality: row.StatusCriticality != null ? Number(row.StatusCriticality) : null,
      workflowLevel: row.WorkflowLevel != null ? Number(row.WorkflowLevel) : null,
      currentApprover_ID: row.CurrentApproverID || null,
      submittedAt: parseS4DateTime(row.SubmittedAt),
      finalDecisionAt: parseS4DateTime(row.FinalDecisionAt),
      IsActiveEntity: true,
      HasActiveEntity: false,
      HasDraftEntity: false
    }));

    for (const req of promotionRequests) {
      req.requester = req.requester_ID ? employeeMap.get(req.requester_ID) || null : null;
      req.employeeConcerned = req.employeeConcerned_ID ? employeeMap.get(req.employeeConcerned_ID) || null : null;
      req.currentJobTitle = req.currentJobTitle_ID ? jobTitleMap.get(req.currentJobTitle_ID) || null : null;
      req.requestedJobTitle = req.requestedJobTitle_ID ? jobTitleMap.get(req.requestedJobTitle_ID) || null : null;
      req.currentApprover = req.currentApprover_ID ? employeeMap.get(req.currentApprover_ID) || null : null;
    }

    return promotionRequests;
  };

  const fetchUserCredentialsFromS4 = async () => {
  const result = await callS4({
    path: '/sap/opu/odata/sap/YY1_USERCREDENTIAL_CDS/YY1_USERCREDENTIAL?$format=json'
  });

  const rows = result?.d?.results || [];

  return rows.map(row => ({
    email: row.Email,
    password: row.Password,
    employeeID: row.EmployeeID,
    isActive: row.IsActive
  }));
};

  const createS4 = async ({ servicePath, entitySet, data }) => {
    const baseUrl = process.env.S4_BASE_URL;
    const username = process.env.S4_USERNAME;
    const password = process.env.S4_PASSWORD;

    if (!baseUrl || !username || !password) {
      throw new Error('Missing S4 environment variables');
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const tokenResponse = await fetch(`${baseUrl}${servicePath}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': 'Fetch'
      }
    });

    const csrfToken = tokenResponse.headers.get('x-csrf-token');

    const rawCookies = tokenResponse.headers.raw()['set-cookie'] || [];
    const cookieHeader = rawCookies
      .map(cookie => cookie.split(';')[0])
      .join('; ');

    if (!tokenResponse.ok || !csrfToken) {
      const tokenErrorText = await tokenResponse.text();
      throw new Error(`Failed to fetch CSRF token: ${tokenResponse.status} ${tokenResponse.statusText} - ${tokenErrorText}`);
    }

    const createResponse = await fetch(`${baseUrl}${servicePath}/${entitySet}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader
      },
      body: JSON.stringify(data)
    });

    const text = await createResponse.text();

    if (!createResponse.ok) {
      throw new Error(`S4 create failed: ${createResponse.status} ${createResponse.statusText} - ${text}`);
    }

    return text ? JSON.parse(text) : {};
  };

  const updateS4 = async ({ servicePath, entityPath, data, method = 'PATCH' }) => {
    const baseUrl = process.env.S4_BASE_URL;
    const username = process.env.S4_USERNAME;
    const password = process.env.S4_PASSWORD;

    if (!baseUrl || !username || !password) {
      throw new Error('Missing S4 environment variables');
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const tokenResponse = await fetch(`${baseUrl}${servicePath}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': 'Fetch'
      }
    });

    const csrfToken = tokenResponse.headers.get('x-csrf-token');
    const rawCookies = tokenResponse.headers.raw()['set-cookie'] || [];
    const cookieHeader = rawCookies
      .map(cookie => cookie.split(';')[0])
      .join('; ');

    if (!tokenResponse.ok || !csrfToken) {
      const tokenErrorText = await tokenResponse.text();
      throw new Error(`Failed to fetch CSRF token for update: ${tokenResponse.status} ${tokenResponse.statusText} - ${tokenErrorText}`);
    }

    const updateResponse = await fetch(`${baseUrl}${servicePath}/${entityPath}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader,
        'If-Match': '*'
      },
      body: JSON.stringify(data)
    });

    const text = await updateResponse.text();

    if (!updateResponse.ok) {
      throw new Error(`S4 update failed: ${updateResponse.status} ${updateResponse.statusText} - ${text}`);
    }

    return text ? JSON.parse(text) : {};
  };

  const updateS4LeaveRequestStatus = async (leaveRequestId, updates) => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS/YY1_LEAVEREQUEST'
    });

    const rows = result?.d?.results || [];
    const target = rows.find(row => row.LeaveRequestID === leaveRequestId);

    if (!target?.SAP_UUID) {
      throw new Error(`S4 Leave Request not found for LeaveRequestID ${leaveRequestId}`);
    }

    const entityPath = `YY1_LEAVEREQUEST(guid'${target.SAP_UUID}')`;

    return await updateS4({
      servicePath: '/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS',
      entityPath,
      data: updates,
      method: 'PATCH'
    });
  };

  const deleteS4LeaveRequestById = async (leaveRequestId) => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS/YY1_LEAVEREQUEST?$format=json'
    });

    const rows = result?.d?.results || [];
    const target = rows.find(row => row.LeaveRequestID === leaveRequestId);

    if (!target?.SAP_UUID) {
      throw new Error(`S4 Leave Request not found for LeaveRequestID ${leaveRequestId}`);
    }

    const entityPath = `YY1_LEAVEREQUEST(guid'${target.SAP_UUID}')`;

    const baseUrl = process.env.S4_BASE_URL;
    const username = process.env.S4_USERNAME;
    const password = process.env.S4_PASSWORD;

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const tokenResponse = await fetch(`${baseUrl}/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': 'Fetch'
      }
    });

    const csrfToken = tokenResponse.headers.get('x-csrf-token');
    const rawCookies = tokenResponse.headers.raw()['set-cookie'] || [];
    const cookieHeader = rawCookies.map(cookie => cookie.split(';')[0]).join('; ');

    if (!tokenResponse.ok || !csrfToken) {
      const tokenErrorText = await tokenResponse.text();
      throw new Error(`Failed to fetch CSRF token for leave delete: ${tokenResponse.status} ${tokenResponse.statusText} - ${tokenErrorText}`);
    }

    const deleteResponse = await fetch(`${baseUrl}/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS/${entityPath}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader,
        'If-Match': '*'
      }
    });

    const text = await deleteResponse.text();

    if (!deleteResponse.ok) {
      throw new Error(`S4 leave delete failed: ${deleteResponse.status} ${deleteResponse.statusText} - ${text}`);
    }

    return true;
  };

  const updateS4EmployeeById = async (employeeId, updates) => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_EMPLOYEE_CDS/YY1_EMPLOYEE?$format=json'
    });

    const rows = result?.d?.results || [];
    const target = rows.find(row => row.EmployeeID === employeeId);

    if (!target?.SAP_UUID) {
      throw new Error(`S4 Employee not found for EmployeeID ${employeeId}`);
    }

    const entityPath = `YY1_EMPLOYEE(guid'${target.SAP_UUID}')`;

    console.log('S4 Employee PATCH entityPath:', entityPath);
    console.log('S4 Employee PATCH updates:', updates);
    return await updateS4({
      servicePath: '/sap/opu/odata/sap/YY1_EMPLOYEE_CDS',
      entityPath,
      data: updates,
      method: 'PATCH'
    });
  };

  const deleteS4EmployeeById = async (employeeId) => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_EMPLOYEE_CDS/YY1_EMPLOYEE?$format=json'
    });

    const rows = result?.d?.results || [];
    const target = rows.find(row => row.EmployeeID === employeeId);

    if (!target?.SAP_UUID) {
      throw new Error(`S4 Employee not found for EmployeeID ${employeeId}`);
    }

    const entityPath = `YY1_EMPLOYEE(guid'${target.SAP_UUID}')`;

    const baseUrl = process.env.S4_BASE_URL;
    const username = process.env.S4_USERNAME;
    const password = process.env.S4_PASSWORD;

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const tokenResponse = await fetch(`${baseUrl}/sap/opu/odata/sap/YY1_EMPLOYEE_CDS`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': 'Fetch'
      }
    });

    const csrfToken = tokenResponse.headers.get('x-csrf-token');
    const rawCookies = tokenResponse.headers.raw()['set-cookie'] || [];
    const cookieHeader = rawCookies.map(cookie => cookie.split(';')[0]).join('; ');

    if (!tokenResponse.ok || !csrfToken) {
      const tokenErrorText = await tokenResponse.text();
      throw new Error(`Failed to fetch CSRF token for delete: ${tokenResponse.status} ${tokenResponse.statusText} - ${tokenErrorText}`);
    }

    const deleteResponse = await fetch(`${baseUrl}/sap/opu/odata/sap/YY1_EMPLOYEE_CDS/${entityPath}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader,
        'If-Match': '*'
      }
    });

    const text = await deleteResponse.text();

    if (!deleteResponse.ok) {
      throw new Error(`S4 delete failed: ${deleteResponse.status} ${deleteResponse.statusText} - ${text}`);
    }

    return true;
  };

  const updateS4PromotionRequestById = async (promotionRequestId, updates) => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS/YY1_PROMOTIONREQUEST?$format=json'
    });

    const rows = result?.d?.results || [];
    const target = rows.find(row => row.PromotionRequestID === promotionRequestId);

    if (!target?.SAP_UUID) {
      throw new Error(`S4 Promotion Request not found for PromotionRequestID ${promotionRequestId}`);
    }

    const entityPath = `YY1_PROMOTIONREQUEST(guid'${target.SAP_UUID}')`;

    console.log('S4 Promotion PATCH entityPath:', entityPath);
    console.log('S4 Promotion PATCH updates:', updates);
    return await updateS4({
      servicePath: '/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS',
      entityPath,
      data: updates,
      method: 'PATCH'
    });
  };

  const deleteS4PromotionRequestById = async (promotionRequestId) => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS/YY1_PROMOTIONREQUEST?$format=json'
    });

    const rows = result?.d?.results || [];
    const target = rows.find(row => row.PromotionRequestID === promotionRequestId);

    if (!target?.SAP_UUID) {
      throw new Error(`S4 Promotion Request not found for PromotionRequestID ${promotionRequestId}`);
    }

    const entityPath = `YY1_PROMOTIONREQUEST(guid'${target.SAP_UUID}')`;

    const baseUrl = process.env.S4_BASE_URL;
    const username = process.env.S4_USERNAME;
    const password = process.env.S4_PASSWORD;

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const tokenResponse = await fetch(`${baseUrl}/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': 'Fetch'
      }
    });

    const csrfToken = tokenResponse.headers.get('x-csrf-token');
    const rawCookies = tokenResponse.headers.raw()['set-cookie'] || [];
    const cookieHeader = rawCookies.map(cookie => cookie.split(';')[0]).join('; ');

    if (!tokenResponse.ok || !csrfToken) {
      const tokenErrorText = await tokenResponse.text();
      throw new Error(`Failed to fetch CSRF token for promotion delete: ${tokenResponse.status} ${tokenResponse.statusText} - ${tokenErrorText}`);
    }

    const deleteResponse = await fetch(`${baseUrl}/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS/${entityPath}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'x-csrf-token': csrfToken,
        Cookie: cookieHeader,
        'If-Match': '*'
      }
    });

    const text = await deleteResponse.text();

    if (!deleteResponse.ok) {
      throw new Error(`S4 promotion delete failed: ${deleteResponse.status} ${deleteResponse.statusText} - ${text}`);
    }

    return true;
  };

  const createS4PromotionFeedback = async ({
    promotionRequest_ID,
    author_ID,
    authorRole,
    feedbackText,
    recommendation
  }) => {
    const payload = {
      PromotionFeedbackID: `PF${Date.now().toString().slice(-8)}`,
      PromotionRequestID: promotionRequest_ID,
      AuthorID: author_ID,
      AuthorRole: authorRole,
      FeedbackText: feedbackText,
      Recommendation: recommendation,
      CreatedAt: new Date().toISOString()
    };

    return await createS4({
      servicePath: '/sap/opu/odata/sap/YY1_PROMOTIONFEEDBACK_CDS',
      entitySet: 'YY1_PROMOTIONFEEDBACK',
      data: payload
    });
  };

  this.on('login', async (req) => {
  const { email, password } = req.data || {};

  if (!email || !password) {
    req.error(400, 'Email and password are required');
    return;
  }

  const credentials = await fetchUserCredentialsFromS4();
  const credential = credentials.find(
    c => c.email === email && c.isActive
  );

  if (!credential) {
    return {
      success: false,
      message: 'User not found or inactive',
      email: '',
      employeeID: '',
      fullName: ''
    };
  }

  if (credential.password !== password) {
    return {
      success: false,
      message: 'Invalid password',
      email: '',
      employeeID: '',
      fullName: ''
    };
  }

  const employee = await getEmployeeById(credential.employeeID);

  if (!employee) {
    return {
      success: false,
      message: 'Linked employee not found in S/4',
      email: '',
      employeeID: '',
      fullName: ''
    };
  }

  return {
    success: true,
    message: 'Login successful',
    email: employee.email || email,
    employeeID: employee.ID,
    fullName: employee.fullName || ''
  };
});

this.on('forgotPassword', async (req) => {
  const { email } = req.data || {};

  if (!email) {
    req.error(400, 'Email is required');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const credentials = await fetchUserCredentialsFromS4();
  const credential = credentials.find(
    c => c.email?.trim().toLowerCase() === normalizedEmail && c.isActive
  );

  if (!credential) {
    return 'No active account found for this email';
  }

  const token = cds.utils.uuid();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  await createS4PasswordReset({
    email: credential.email,
    token,
    expiresAt
  });

  const appBaseUrl = process.env.APP_BASE_URL || `${req._.req.protocol}://${req._.req.headers.host}`;
  const resetLink = `${appBaseUrl}/home-ui/webapp/index.html?token=${encodeURIComponent(token)}`;

  try {
    await sendResetPasswordEmail(credential.email, resetLink);
    console.log(`Password reset link for ${credential.email}: ${resetLink}`);
    return `Password reset email sent to ${credential.email}`;
  } catch (error) {
    console.error('Failed to send reset password email:', error);
    req.error(500, 'Unable to send reset password email');
    return;
  }
});

this.on('resetPassword', async (req) => {
  const { token, newPassword } = req.data || {};

  if (!token || !newPassword) {
    req.error(400, 'Token and new password are required');
    return;
  }

  const resets = await fetchPasswordResetsFromS4();
  const resetRecord = resets.find(r => r.token === token);

  if (!resetRecord) {
    return 'Invalid reset token';
  }

  if (resetRecord.used) {
    return 'This reset token has already been used';
  }

  const expiresAt = new Date(resetRecord.expiresAt);
  if (expiresAt.getTime() < Date.now()) {
    return 'This reset token has expired';
  }

  await updateS4UserCredentialPasswordByEmail(resetRecord.email, newPassword);

  await updateS4PasswordResetByToken(token, {
    Used: true
  });

  return 'Password reset successfully';
});

  this.on('READ', Departments, async () => {
    return await fetchDepartmentsFromS4();
  });

  this.on('READ', JobTitles, async () => {
    return await fetchJobTitlesFromS4();
  });

  this.on('READ', Employees, async (req) => {
    const employees = await fetchEmployeesFromS4();

    const where = req.query?.SELECT?.from?.ref?.[0]?.where;
    if (!where) return employees;

    const idIndex = where.findIndex(
      x => x && x.ref && x.ref[0] === 'ID'
    );

    if (idIndex >= 0) {
      const idValue = where[idIndex + 2]?.val;
      if (idValue) {
        return employees.filter(e => e.ID === idValue);
      }
    }

    return employees;
  });

  this.on('READ', LeaveRequests, async (req) => {
    const leaveRequests = await fetchLeaveRequestsFromS4();

    const where = req.query?.SELECT?.from?.ref?.[0]?.where;
    if (!where) return leaveRequests;

    const idIndex = where.findIndex(
      x => x && x.ref && x.ref[0] === 'ID'
    );

    if (idIndex >= 0) {
      const idValue = where[idIndex + 2]?.val;
      if (idValue) {
        return leaveRequests.filter(r => r.ID === idValue);
      }
    }

    return leaveRequests;
  });

  this.on('READ', PromotionRequests, async (req) => {
    const promotionRequests = await fetchPromotionRequestsFromS4();

    const where = req.query?.SELECT?.from?.ref?.[0]?.where;
    if (!where) return promotionRequests;

    const idIndex = where.findIndex(
      x => x && x.ref && x.ref[0] === 'ID'
    );

    if (idIndex >= 0) {
      const idValue = where[idIndex + 2]?.val;
      if (idValue) {
        return promotionRequests.filter(r => r.ID === idValue);
      }
    }

    return promotionRequests;
  });

  this.after('READ', Employees, async (result) => {
  const rows = Array.isArray(result) ? result : [result];
  if (!rows.length) return;

  for (const row of rows) {
    if (!row) continue;
    row.fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
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

  this.before('CREATE', Employees, async (req) => {
    const allowed = await ensureHRAdminForEmployeeMaintenance(req);
    if (!allowed) return;

    const data = req.data;
    if (data) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
  });

  this.before('UPDATE', Employees, async (req) => {
    const allowed = await ensureHRAdminForEmployeeMaintenance(req);
    if (!allowed) return;

    const data = req.data;
    if (data) {
      data.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
  });

  this.before('DELETE', Employees, async (req) => {
    const allowed = await ensureHRAdminForEmployeeMaintenance(req);
    if (!allowed) return;
  });

  this.on('CREATE', Employees, async (req) => {
    const data = req.data;

    const payload = {
      EmployeeID: data.ID,
      FirstName: data.firstName || "",
      LastName: data.lastName || "",
      FullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
      Email: data.email || "",
      Phone: data.phone || "",
      HireDate: toODataV2Date(data.hireDate),
      Salary_V: data.salary != null ? Number(data.salary).toFixed(3) : "0.000",
      Salary_C: "TND",
      Country: data.country || "",
      DepartmentID: data.department_ID || "",
      RoleID: data.role_ID || "",
      JobTitleID: data.jobTitle_ID || "",
      ManagerID: data.manager_ID || "",
      IsActive: data.isActive !== false
    };

    await createS4({
      servicePath: '/sap/opu/odata/sap/YY1_EMPLOYEE_CDS',
      entitySet: 'YY1_EMPLOYEE',
      data: payload
    });

    return {
      ...data,
      fullName: payload.FullName
    };
  });

  this.on('UPDATE', Employees, async (req) => {
    const data = req.data;
    const employeeId = data.ID || req.params?.[0]?.ID;

    if (!employeeId) {
      req.error(400, 'Missing Employee ID for update');
      return;
    }

    const updates = {};

    if (data.firstName !== undefined) updates.FirstName = data.firstName;
    if (data.lastName !== undefined) updates.LastName = data.lastName;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      updates.FullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
    }
    if (data.email !== undefined) updates.Email = data.email;
    if (data.phone !== undefined) updates.Phone = data.phone;
    if (data.hireDate !== undefined) updates.HireDate = toODataV2Date(data.hireDate);
    if (data.salary !== undefined) updates.Salary_V = Number(data.salary).toFixed(3);
    updates.Salary_C = "TND";
    if (data.country !== undefined) updates.Country = data.country;
    if (data.department_ID !== undefined) updates.DepartmentID = data.department_ID;
    if (data.role_ID !== undefined) updates.RoleID = data.role_ID;
    if (data.jobTitle_ID !== undefined) updates.JobTitleID = data.jobTitle_ID;
    if (data.manager_ID !== undefined) updates.ManagerID = data.manager_ID || "";
    if (data.isActive !== undefined) updates.IsActive = data.isActive;

    await updateS4EmployeeById(employeeId, updates);

    return {
      ...data,
      ID: employeeId,
      fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim()
    };
  });

  this.on('DELETE', Employees, async (req) => {
    const employeeId = req.data?.ID || req.params?.[0]?.ID;

    if (!employeeId) {
      req.error(400, 'Missing Employee ID for delete');
      return;
    }

    await deleteS4EmployeeById(employeeId);
    return true;
  });
  
  this.before('CREATE', LeaveRequests, async (req) => {
    const data = req.data;

    if (!data.requester_ID) {
      const loggedInEmployee = await getLoggedInEmployee(req);
      if (!loggedInEmployee) return;
      data.requester_ID = loggedInEmployee.ID;
    }

    if (!data.ID) {
      data.ID = `LR${Date.now().toString().slice(-8)}`;
    }

    data.status = 'SUBMITTED';
    data.statusCriticality = 2;
    data.submittedAt = new Date().toISOString();
    data.workflowLevel = 1;

    if (data.requester_ID) {
      const requester = await getEmployeeById(data.requester_ID);

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

  this.before('UPDATE', LeaveRequests, async (req) => {
    const loggedInEmployee = await getLoggedInEmployee(req);
    if (!loggedInEmployee) return;

    const leaveRequestId = req.data?.ID || req.params?.[0]?.ID;
    if (!leaveRequestId) {
      req.error(400, 'Missing Leave Request ID for update');
      return;
    }

    const leaveRequests = await fetchLeaveRequestsFromS4();
    const leaveRequest = leaveRequests.find(r => r.ID === leaveRequestId);

    if (!leaveRequest) {
      req.error(404, 'Leave request not found');
      return;
    }

    const isRequester = leaveRequest.requester_ID === loggedInEmployee.ID;
    const isHRAdmin = [ROLE.RH, ROLE.DRH].includes(loggedInEmployee.role_ID);

    if (!isRequester && !isHRAdmin) {
      req.error(403, 'Only the requester, RH, or DRH can update this leave request');
      return;
    }
  });

  this.before('DELETE', LeaveRequests, async (req) => {
    const loggedInEmployee = await getLoggedInEmployee(req);
    if (!loggedInEmployee) return;

    const leaveRequestId = req.data?.ID || req.params?.[0]?.ID;
    if (!leaveRequestId) {
      req.error(400, 'Missing Leave Request ID for delete');
      return;
    }

    const leaveRequests = await fetchLeaveRequestsFromS4();
    const leaveRequest = leaveRequests.find(r => r.ID === leaveRequestId);

    if (!leaveRequest) {
      req.error(404, 'Leave request not found');
      return;
    }

    const isRequester = leaveRequest.requester_ID === loggedInEmployee.ID;
    const isHRAdmin = [ROLE.RH, ROLE.DRH].includes(loggedInEmployee.role_ID);

    if (!isRequester && !isHRAdmin) {
      req.error(403, 'Only the requester, RH, or DRH can delete this leave request');
      return;
    }
  });

  this.on('UPDATE', LeaveRequests, async (req) => {
    const data = req.data;
    const leaveRequestId = data.ID || req.params?.[0]?.ID;

    if (!leaveRequestId) {
      req.error(400, 'Missing Leave Request ID for update');
      return;
    }

    const updates = {};

    if (data.requester_ID !== undefined) updates.RequesterID = data.requester_ID;
    if (data.startDate !== undefined) updates.StartDate = toODataV2Date(data.startDate);
    if (data.endDate !== undefined) updates.EndDate = toODataV2Date(data.endDate);
    if (data.reason !== undefined) updates.Reason = data.reason;
    if (data.status !== undefined) updates.Status = data.status;
    if (data.statusCriticality !== undefined) updates.StatusCriticality = Number(data.statusCriticality).toFixed(2);
    if (data.workflowLevel !== undefined) updates.WorkflowLevel = Number(data.workflowLevel).toFixed(2);
    if (data.currentApprover_ID !== undefined) updates.CurrentApproverID = data.currentApprover_ID || '';
    if (data.submittedAt !== undefined) updates.SubmittedAt = toODataV2DateTime(data.submittedAt);
    if (data.finalDecisionAt !== undefined) {
      updates.FinalDecisionAt = data.finalDecisionAt ? toODataV2DateTime(data.finalDecisionAt) : null;
    }

    await updateS4LeaveRequestStatus(leaveRequestId, updates);

    return {
      ...data,
      ID: leaveRequestId
    };
  });

  this.on('DELETE', LeaveRequests, async (req) => {
    const leaveRequestId = req.data?.ID || req.params?.[0]?.ID;

    if (!leaveRequestId) {
      req.error(400, 'Missing Leave Request ID for delete');
      return;
    }

    await deleteS4LeaveRequestById(leaveRequestId);
    return true;
  });

  this.on('CREATE', LeaveRequests, async (req, next) => {
    const data = req.data;

    const s4Payload = {
      LeaveRequestID: data.ID,
      RequesterID: data.requester_ID,
      StartDate: toODataV2Date(data.startDate),
      EndDate: toODataV2Date(data.endDate),
      Reason: data.reason || '',
      Status: data.status || 'SUBMITTED',
      StatusCriticality: String(Number(data.statusCriticality || 2).toFixed(2)),
      WorkflowLevel: String(Number(data.workflowLevel || 1).toFixed(2)),
      CurrentApproverID: data.currentApprover_ID || '',
      SubmittedAt: toODataV2DateTime(data.submittedAt),
      FinalDecisionAt: data.finalDecisionAt ? toODataV2DateTime(data.finalDecisionAt) : null
    };

    await createS4({
      servicePath: '/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS',
      entitySet: 'YY1_LEAVEREQUEST',
      data: s4Payload
    });

    const result = await next();
    return result;
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
    if (!data.requester_ID) {
      const loggedInEmployee = await getLoggedInEmployee(req);
      if (!loggedInEmployee) return;
      data.requester_ID = loggedInEmployee.ID;
    }
    
    if (!data.ID) {
     data.ID = `PR${Date.now().toString().slice(-8)}`;
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
      const employee = await getEmployeeById(data.employeeConcerned_ID);

      if (employee) {
        data.currentJobTitle_ID = employee.jobTitle_ID;
        data.currentSalary = employee.salary;
      }
    }
  });

  this.before('UPDATE', PromotionRequests, async (req) => {
    const loggedInEmployee = await getLoggedInEmployee(req);
    if (!loggedInEmployee) return;

    const promotionRequestId = req.data?.ID || req.params?.[0]?.ID;
    if (!promotionRequestId) {
      req.error(400, 'Missing Promotion Request ID for update');
      return;
    }

    const promotionRequests = await fetchPromotionRequestsFromS4();
    const promotionRequest = promotionRequests.find(r => r.ID === promotionRequestId);

    if (!promotionRequest) {
      req.error(404, 'Promotion request not found');
      return;
    }

    const isRequester = promotionRequest.requester_ID === loggedInEmployee.ID;
    const isHRAdmin = [ROLE.RH, ROLE.DRH].includes(loggedInEmployee.role_ID);

    if (!isRequester && !isHRAdmin) {
      req.error(403, 'Only the requester, RH, or DRH can update this promotion request');
      return;
    }
  });
  this.before('DELETE', PromotionRequests, async (req) => {
    const loggedInEmployee = await getLoggedInEmployee(req);
    if (!loggedInEmployee) return;

    const promotionRequestId = req.data?.ID || req.params?.[0]?.ID;
    if (!promotionRequestId) {
      req.error(400, 'Missing Promotion Request ID for delete');
      return;
    }

    const promotionRequests = await fetchPromotionRequestsFromS4();
    const promotionRequest = promotionRequests.find(r => r.ID === promotionRequestId);

    if (!promotionRequest) {
      req.error(404, 'Promotion request not found');
      return;
    }

    const isRequester = promotionRequest.requester_ID === loggedInEmployee.ID;
    const isHRAdmin = [ROLE.RH, ROLE.DRH].includes(loggedInEmployee.role_ID);

    if (!isRequester && !isHRAdmin) {
      req.error(403, 'Only the requester, RH, or DRH can delete this promotion request');
      return;
    }
  });

  this.on('CREATE', PromotionRequests, async (req, next) => {
    const data = req.data;

    const s4Payload = {
      PromotionRequestID: data.ID,
      RequesterID: data.requester_ID,
      EmployeeConcernedID: data.employeeConcerned_ID,
      CurrentJobTitleID: data.currentJobTitle_ID || '',
      RequestedJobTitleID: data.requestedJobTitle_ID || '',
      CurrentSalary_V: data.currentSalary != null ? Number(data.currentSalary).toFixed(3) : '0.000',
      CurrentSalary_C: 'TND',
      RequestedSalary_V: data.requestedSalary != null ? Number(data.requestedSalary).toFixed(3) : '0.000',
      RequestedSalary_C: 'TND',
      Justification: data.justification || '',
      Status: data.status || 'SUBMITTED',
      StatusCriticality: Number(data.statusCriticality || 2).toFixed(2),
      WorkflowLevel: Number(data.workflowLevel || 1).toFixed(2),
      CurrentApproverID: data.currentApprover_ID || '',
      SubmittedAt: new Date(data.submittedAt).toISOString(),
      FinalDecisionAt: data.finalDecisionAt ? new Date(data.finalDecisionAt).toISOString() : null
    };

    await createS4({
      servicePath: '/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS',
      entitySet: 'YY1_PROMOTIONREQUEST',
      data: s4Payload
    });

    const result = await next();
    return result;
  });

  this.on('UPDATE', PromotionRequests, async (req) => {
    const data = req.data;
    const promotionRequestId = data.ID || req.params?.[0]?.ID;

    if (!promotionRequestId) {
      req.error(400, 'Missing Promotion Request ID for update');
      return;
    }

    const updates = {};

    if (data.requester_ID !== undefined) updates.RequesterID = data.requester_ID;
    if (data.employeeConcerned_ID !== undefined) updates.EmployeeConcernedID = data.employeeConcerned_ID;
    if (data.currentJobTitle_ID !== undefined) updates.CurrentJobTitleID = data.currentJobTitle_ID || '';
    if (data.requestedJobTitle_ID !== undefined) updates.RequestedJobTitleID = data.requestedJobTitle_ID || '';
    if (data.currentSalary !== undefined) updates.CurrentSalary_V = Number(data.currentSalary).toFixed(3);
    updates.CurrentSalary_C = 'TND';
    if (data.requestedSalary !== undefined) updates.RequestedSalary_V = Number(data.requestedSalary).toFixed(3);
    updates.RequestedSalary_C = 'TND';
    if (data.justification !== undefined) updates.Justification = data.justification;
    if (data.status !== undefined) updates.Status = data.status;
    if (data.statusCriticality !== undefined) updates.StatusCriticality = Number(data.statusCriticality).toFixed(2);
    if (data.workflowLevel !== undefined) updates.WorkflowLevel = Number(data.workflowLevel).toFixed(2);
    if (data.currentApprover_ID !== undefined) updates.CurrentApproverID = data.currentApprover_ID || '';
    if (data.submittedAt !== undefined) updates.SubmittedAt = new Date(data.submittedAt).toISOString();
    if (data.finalDecisionAt !== undefined) {
      updates.FinalDecisionAt = data.finalDecisionAt ? new Date(data.finalDecisionAt).toISOString() : null;
    }

    await updateS4PromotionRequestById(promotionRequestId, updates);

    return {
      ...data,
      ID: promotionRequestId
    };
  });

  this.on('DELETE', PromotionRequests, async (req) => {
    const promotionRequestId = req.data?.ID || req.params?.[0]?.ID;

    if (!promotionRequestId) {
      req.error(400, 'Missing Promotion Request ID for delete');
      return;
    }

    await deleteS4PromotionRequestById(promotionRequestId);
    return true;
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

    await updateS4LeaveRequestStatus(leaveRequestId, {
      Status: 'APPROVED',
      StatusCriticality: '3.00',
      FinalDecisionAt: new Date().toISOString()
    });

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
    
      await updateS4LeaveRequestStatus(leaveRequestId, {
      Status: 'REJECTED',
      StatusCriticality: '1.00',
      FinalDecisionAt: new Date().toISOString()
    });

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

  await createS4PromotionFeedback({
    promotionRequest_ID: promotionRequestId,
    author_ID: loggedInEmployee.ID,
    authorRole: getRoleLabel(loggedInEmployee.role_ID),
    feedbackText: 'Approved',
    recommendation: 'APPROVED'
  });

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
    const finalDecisionAt = new Date().toISOString();

    await updateS4PromotionRequestById(promotionRequestId, {
      Status: 'APPROVED',
      StatusCriticality: '3.00',
      FinalDecisionAt: finalDecisionAt,
      CurrentApproverID: ''
    });

    const promotionRequests = await fetchPromotionRequestsFromS4();
    const fullPromotionRequest =
      promotionRequests.find(r => r.ID === promotionRequestId) || null;

    if (!fullPromotionRequest) {
      req.error(404, 'Promotion request not found after S/4 approval update');
      return;
    }

    if (fullPromotionRequest.employeeConcerned_ID) {
      await updateS4EmployeeById(fullPromotionRequest.employeeConcerned_ID, {
        JobTitleID: fullPromotionRequest.requestedJobTitle_ID || '',
        Salary_V:
          fullPromotionRequest.requestedSalary != null
            ? Number(fullPromotionRequest.requestedSalary).toFixed(3)
            : '0.000',
        Salary_C: 'TND'
      });
    }

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

  await updateS4PromotionRequestById(promotionRequestId, {
    Status: 'IN_REVIEW',
    StatusCriticality: '2.00',
    WorkflowLevel: Number(nextStep.nextLevel).toFixed(2),
    CurrentApproverID: nextStep.nextApprover.ID
  });

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

    await createS4PromotionFeedback({
      promotionRequest_ID: promotionRequestId,
      author_ID: loggedInEmployee.ID,
      authorRole: getRoleLabel(loggedInEmployee.role_ID),
      feedbackText: 'Rejected',
      recommendation: 'REJECTED'
    });

    await createPromotionFeedback({
      promotionRequest_ID: promotionRequestId,
      author_ID: loggedInEmployee.ID,
      authorRole: getRoleLabel(loggedInEmployee.role_ID),
      feedbackText: 'Rejected',
      recommendation: 'REJECTED'
    });

    const finalDecisionAt = new Date().toISOString();

    await UPDATE(PromotionRequests)
      .set({
        status: 'REJECTED',
        statusCriticality: 1,
        finalDecisionAt,
        currentApprover_ID: null
      })
      .where({ ID: promotionRequestId });

    await updateS4PromotionRequestById(promotionRequestId, {
      Status: 'REJECTED',
      StatusCriticality: '1.00',
      FinalDecisionAt: finalDecisionAt,
      CurrentApproverID: ''
    });

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

  this.on('editPromotionRequest', async (req) => {
  const promotionRequestId = req.params[0].ID;
  const {
    requestedSalary,
    justification
  } = req.data || {};

  const loggedInEmployee = await getLoggedInEmployee(req);
  if (!loggedInEmployee) return;

  const promotionRequests = await fetchPromotionRequestsFromS4();
  const promotionRequest = promotionRequests.find(r => r.ID === promotionRequestId);

  if (!promotionRequest) {
    req.error(404, 'Promotion request not found');
    return;
  }

  const isRequester = promotionRequest.requester_ID === loggedInEmployee.ID;
  const isHRAdmin = [ROLE.RH, ROLE.DRH].includes(loggedInEmployee.role_ID);

  if (!isRequester && !isHRAdmin) {
    req.error(403, 'Only the requester, RH, or DRH can edit this promotion request');
    return;
  }

  const updates = {};

  if (employeeConcerned_ID !== undefined) {
    updates.EmployeeConcernedID = employeeConcerned_ID;

    const employee = await getEmployeeById(employeeConcerned_ID);
    if (employee) {
      updates.CurrentJobTitleID = employee.jobTitle_ID || '';
      updates.CurrentSalary_V =
        employee.salary != null ? Number(employee.salary).toFixed(3) : '0.000';
      updates.CurrentSalary_C = 'TND';
    }
  }

  if (requestedJobTitle_ID !== undefined) {
    updates.RequestedJobTitleID = requestedJobTitle_ID || '';
  }

  if (requestedSalary !== undefined) {
    updates.RequestedSalary_V = Number(requestedSalary).toFixed(3);
    updates.RequestedSalary_C = 'TND';
  }

  if (justification !== undefined) {
    updates.Justification = justification;
  }

  await updateS4PromotionRequestById(promotionRequestId, updates);

  req.info('Promotion request updated successfully');
  return true;
});
  this.on('getDashboardStats', async () => {
  const [employees, leaveRequests, promotionRequests, notificationResult] = await Promise.all([
    fetchEmployeesFromS4(),
    fetchLeaveRequestsFromS4(),
    fetchPromotionRequestsFromS4(),
    SELECT.one.from(Notifications).columns`count(*) as count`.where({ isRead: false })
  ]);

  return {
    employees: employees.length,
    leaveRequests: leaveRequests.filter(r => r.status === 'SUBMITTED').length,
    promotions: promotionRequests.filter(r => r.status === 'SUBMITTED' || r.status === 'IN_REVIEW').length,
    notifications: Number(notificationResult?.count || 0)
  };
});

  this.on('getCurrentProfile', async (req) => {
    const userEmail = getCurrentUserEmail(req);
    const employees = await fetchEmployeesFromS4();

    let employee = null;

    if (userEmail && userEmail !== 'anonymous') {
      employee = employees.find(e => e.email === userEmail) || null;
    }

    if (!employee) {
      employee = await getDefaultProfileEmployee();
    }

    if (!employee) {
      req.error(404, 'Current employee profile not found');
      return;
    }

    return {
      ID: employee.ID,
      fullName: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      email: employee.email,
      phone: employee.phone,
      hireDate: employee.hireDate,
      department: employee.department?.name || '',
      role: employee.role?.name || employee.role_ID || '',
      jobTitle: employee.jobTitle?.title || '',
      manager: employee.manager?.fullName || ''
    };
  });
  this.on('markAsRead', async (req) => {
    const notificationId = req.params[0].ID;

    const existingNotification = await SELECT.one
      .from(Notifications)
      .columns('ID', 'isRead')
      .where({ ID: notificationId });

    if (!existingNotification) {
      req.error(404, 'Notification not found');
      return;
    }

    if (existingNotification.isRead) {
      req.info('Notification is already marked as read');
      return;
    }

    await UPDATE(Notifications)
      .set({ isRead: true })
      .where({ ID: notificationId });

    req.info('Notification marked as read');
  });

  this.on('testS4Roles', async () => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_ROLE_CDS/YY1_ROLE'
    });

    return JSON.stringify(result);
  });

  this.on('testS4LeaveRequests', async () => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS/YY1_LEAVEREQUEST'
    });

    return JSON.stringify(result);
  });

  this.on('createS4LeaveRequest', async () => {
    const payload = {
      LeaveRequestID: `LR${Date.now().toString().slice(-5)}`,
      RequesterID: 'E001',
      StartDate: '/Date(1791590400000)/',
      EndDate: '/Date(1792022400000)/',
      Reason: 'Created from CAP test action',
      Status: 'SUBMITTED',
      StatusCriticality: '2.00',
      WorkflowLevel: '1.00',
      CurrentApproverID: 'E010',
      SubmittedAt: `/Date(${Date.now()}+0000)/`,
      FinalDecisionAt: `/Date(${Date.now()}+0000)/`
    };

    const result = await createS4({
      servicePath: '/sap/opu/odata/sap/YY1_LEAVEREQUEST_CDS',
      entitySet: 'YY1_LEAVEREQUEST',
      data: payload
    });

    return JSON.stringify(result);
  });

  this.on('testS4PromotionRequests', async () => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS/YY1_PROMOTIONREQUEST'
    });

    return JSON.stringify(result);
  });

  this.on('createS4PromotionRequest', async () => {
    const payload = {
      PromotionRequestID: `PR${Date.now().toString().slice(-5)}`,
      RequesterID: 'E010',
      EmployeeConcernedID: 'E001',
      CurrentJobTitleID: 'JT_DEV',
      RequestedJobTitleID: 'JT_BA',
      CurrentSalary_V: '1200.000',
      CurrentSalary_C: 'TND',
      RequestedSalary_V: '1500.000',
      RequestedSalary_C: 'TND',
      Justification: 'Created from CAP promotion test action',
      Status: 'SUBMITTED',
      StatusCriticality: '2.00',
      WorkflowLevel: '1.00',
      CurrentApproverID: 'E020',
      SubmittedAt: new Date().toISOString(),
      FinalDecisionAt: new Date().toISOString()
    };

    const result = await createS4({
      servicePath: '/sap/opu/odata/sap/YY1_PROMOTIONREQUEST_CDS',
      entitySet: 'YY1_PROMOTIONREQUEST',
      data: payload
    });

    return JSON.stringify(result);
  });

  this.on('testS4PromotionFeedbacks', async () => {
    const result = await callS4({
      path: '/sap/opu/odata/sap/YY1_PROMOTIONFEEDBACK_CDS/YY1_PROMOTIONFEEDBACK'
    });

    return JSON.stringify(result);
  });
});