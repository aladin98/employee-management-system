using EmployeeService as service from '../../srv/employee-service';

annotate service.Employees with {
    ID @Common.Text : fullName
       @Common.TextArrangement : #TextOnly;
};

annotate service.LeaveRequests with {
    requester       @Common.Text : requester.fullName
                    @Common.TextArrangement : #TextOnly;

    currentApprover @Common.Text : currentApprover.fullName
                    @Common.TextArrangement : #TextOnly;
};

annotate service.LeaveRequests with @(
    UI.SelectionFields : [
        ID,
        status
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Request ID',
            Value : ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Requester',
            Value : requester_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Start Date',
            Value : startDate,
        },
        {
            $Type : 'UI.DataField',
            Label : 'End Date',
            Value : endDate,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Reason',
            Value : reason,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : status,
            Criticality : statusCriticality,
        }
    ],
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Approve',
            Action : 'EmployeeService.approveLeaveRequest'
        },
        {
            $Type : 'UI.DataFieldForAction',
            Label : 'Reject',
            Action : 'EmployeeService.rejectLeaveRequest'
        }
    ],
    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Requester',
                Value : requester_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Start Date',
                Value : startDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'End Date',
                Value : endDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Reason',
                Value : reason,
            }
        ]
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneralInformationFacet',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneralInformation',
        }
    ]
);

annotate service.LeaveRequests with {
    requester @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : requester_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'fullName',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email',
            }
        ],
    };

    currentApprover @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : currentApprover_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'fullName',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email',
            }
        ],
    }
};