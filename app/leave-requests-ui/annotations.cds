using EmployeeService as service from '../../srv/employee-service';

annotate service.LeaveRequests with {
    requester       @Common.Text : requester.fullName
                    @Common.TextArrangement : #TextOnly;

    currentApprover @Common.Text : currentApprover.fullName
                    @Common.TextArrangement : #TextOnly;
};

annotate service.LeaveRequests with @(
    UI.HeaderInfo : {
        TypeName : '{@i18n>LeaveRequest}',
        TypeNamePlural : '{@i18n>LeaveRequests}',
        Title : {
            $Type : 'UI.DataField',
            Value : ID
        }
    },

    UI.SelectionFields : [
        ID,
        status
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>requester}',
            Value : requester.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>startDate}',
            Value : startDate
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>endDate}',
            Value : endDate
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>reason}',
            Value : reason
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>status}',
            Value : status,
            Criticality : statusCriticality
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

    UI.FieldGroup #CreateRequest : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>startDate}',
                Value : startDate
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>endDate}',
                Value : endDate
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>reason}',
                Value : reason
            }
        ]
    },

    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>requester}',
                Value : requester.fullName
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>currentApprover}',
                Value : currentApprover.fullName
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>startDate}',
                Value : startDate
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>endDate}',
                Value : endDate
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>reason}',
                Value : reason
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>status}',
                Value : status
            }
        ]
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'CreateRequestFacet',
            Label : '{@i18n>generalInformation}',
            Target : '@UI.FieldGroup#CreateRequest'
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
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'fullName'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email'
            }
        ]
    };

    currentApprover @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : currentApprover_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'fullName'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email'
            }
        ]
    }
};

annotate service.LeaveRequests with {
    requester       @Common.FieldControl : #ReadOnly;
    currentApprover @Common.FieldControl : #ReadOnly;
    status          @Common.FieldControl : #ReadOnly;
    workflowLevel   @Common.FieldControl : #ReadOnly;
};

annotate service.LeaveRequests with @(
    Capabilities.InsertRestrictions.Insertable : true,
    Capabilities.UpdateRestrictions.Updatable : true,
    Capabilities.DeleteRestrictions.Deletable : true
);