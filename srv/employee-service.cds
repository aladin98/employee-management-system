using { my.company.hr as hr } from '../db/schema';

service EmployeeService {
    entity Departments as projection on hr.Departments;
    entity Roles       as projection on hr.Roles;
    entity JobTitles   as projection on hr.JobTitles;

    @odata.draft.enabled
    entity Employees as projection on hr.Employees {
        *,
        manager.fullName as managerName
    };

    @odata.draft.enabled
    entity LeaveRequests as projection on hr.LeaveRequests actions {
        action approveLeaveRequest();
        action rejectLeaveRequest();
    };

    entity LeaveApprovals as projection on hr.LeaveApprovals;

    @odata.draft.enabled
    entity PromotionRequests as projection on hr.PromotionRequests actions {
        action approvePromotionRequest();
        action rejectPromotionRequest();
};

    entity PromotionFeedbacks as projection on hr.PromotionFeedbacks;
}