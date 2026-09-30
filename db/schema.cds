namespace my.company.hr;

using { managed } from '@sap/cds/common';

entity Departments : managed {
    key ID          : String(10);
        name        : String(20);
        location    : String(100);

        employees   : Association to many Employees
                        on employees.department = $self;
}

entity Roles : managed {
    key ID          : String(10);
        name        : String(20);
        description : String(255);
}

entity JobTitles : managed {
    key ID          : String(10);
        title       : String(20);
        description : String(255);
}

entity Employees : managed {
    key ID          : String(10);
        firstName   : String(20);
        lastName    : String(20);
        fullName    : String(40);
        email       : String(50);
        phone       : String(16);
        hireDate    : Date;
        salary      : Decimal(15,2);
        isActive    : Boolean default true;
        country     : String(20);

        department  : Association to Departments;
        role        : Association to Roles;
        jobTitle    : Association to JobTitles;
        manager     : Association to Employees;
}

entity LeaveRequests : managed {
    key ID               : String(10);
        requester        : Association to Employees;
        startDate        : Date;
        endDate          : Date;
        reason           : String(1000);
        status           : String(30);
        statusCriticality: Integer;
        workflowLevel    : Integer;
        currentApprover  : Association to Employees;
        submittedAt      : Timestamp;
        finalDecisionAt  : Timestamp;

        approvals        : Composition of many LeaveApprovals
                             on approvals.leaveRequest = $self;
}

entity LeaveApprovals : managed {
    key ID              : String(10);
        leaveRequest    : Association to LeaveRequests;
        approver        : Association to Employees;
        approverRole    : String(30);
        decision        : String(30);
        comment         : String(1000);
        level           : Integer;
        decidedAt       : Timestamp;
}

entity PromotionRequests : managed {
    key ID                  : String(10);
        requester           : Association to Employees;
        employeeConcerned   : Association to Employees;
        currentJobTitle     : Association to JobTitles;
        requestedJobTitle   : Association to JobTitles;
        currentSalary       : Decimal(15,2);
        requestedSalary     : Decimal(15,2);
        justification       : String(2000);
        status              : String(30);
        statusCriticality   : Integer;
        workflowLevel       : Integer;
        currentApprover     : Association to Employees;
        submittedAt         : Timestamp;
        finalDecisionAt     : Timestamp;

        feedbacks           : Composition of many PromotionFeedbacks
                                on feedbacks.promotionRequest = $self;
}

entity PromotionFeedbacks : managed {
    key ID                  : UUID;
        promotionRequest    : Association to PromotionRequests;
        author              : Association to Employees;
        authorRole          : String(30);
        feedbackText        : String(2000);
        recommendation      : String(30);
        createdAt           : Timestamp;
}

entity Notifications : managed {
    key ID                : String(10);
        recipient         : Association to Employees;
        type              : String(50);
        title             : String(255);
        message           : String(1000);
        relatedEntityType : String(50);
        relatedEntityID   : String(50);
        isRead            : Boolean default false;
        createdAt         : Timestamp;
}