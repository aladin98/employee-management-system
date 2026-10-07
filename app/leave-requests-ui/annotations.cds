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
            Label : '{@i18n>requester}',
            Value : requester_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>startDate}',
            Value : startDate,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>endDate}',
            Value : endDate,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>reason}',
            Value : reason,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>status}',
            Value : status,
            Criticality : statusCriticality,
        }
    ],
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Label : '{@i18n>approve}',
            Action : 'EmployeeService.approveLeaveRequest',
            ![@Core.OperationAvailable] : canApprove
        },
        {
            $Type : 'UI.DataFieldForAction',
            Label : '{@i18n>reject}',
            Action : 'EmployeeService.rejectLeaveRequest',
            ![@Core.OperationAvailable] : canReject
        }
    ],
    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>requester}',
                Value : requester_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>startDate}',
                Value : startDate,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>endDate}',
                Value : endDate,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>reason}',
                Value : reason,
            }
        ]
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneralInformationFacet',
            Label : '{@i18n>generalInformation}',
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

annotate service.LeaveRequests with {
    requester       @Common.FieldControl : #ReadOnly;
    currentApprover @Common.FieldControl : #ReadOnly;
    status          @Common.FieldControl : #ReadOnly;
    workflowLevel   @Common.FieldControl : #ReadOnly;
};