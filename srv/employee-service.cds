using { my.company.hr as hr } from '../db/schema';

service EmployeeService {
    type DashboardStats {
        employees     : Integer;
        leaveRequests : Integer;
        promotions    : Integer;
        notifications : Integer;
    }

    type CurrentProfile {
        ID         : String(10);
        fullName   : String(40);
        email      : String(50);
        phone      : String(16);
        hireDate   : Date;
        department : String(100);
        role       : String(50);
        jobTitle   : String(50);
        manager    : String(100);
    }

    entity Departments as projection on hr.Departments;
    entity Roles       as projection on hr.Roles;
    entity JobTitles   as projection on hr.JobTitles;

    @odata.draft.enabled
    entity Employees as projection on hr.Employees {
        *,
        manager.fullName as managerName
    };

    @odata.draft.enabled
    entity LeaveRequests as projection on hr.LeaveRequests {
        *,
        false as canApprove : Boolean,
        false as canReject  : Boolean
    } actions {
        action approveLeaveRequest();
        action rejectLeaveRequest();
    };

    entity LeaveApprovals as projection on hr.LeaveApprovals;

    @odata.draft.enabled
    entity PromotionRequests as projection on hr.PromotionRequests {
        *,
        false as canApprove : Boolean,
        false as canReject  : Boolean
    } actions {
        action approvePromotionRequest();
        action rejectPromotionRequest();
    };

    entity PromotionFeedbacks as projection on hr.PromotionFeedbacks;

    entity Notifications as projection on hr.Notifications;

    function getDashboardStats() returns DashboardStats;
    function getCurrentProfile() returns CurrentProfile;
}