using EmployeeService as service from '../../srv/employee-service';

annotate service.PromotionRequests with {
    requester         @Common.Text : requester.fullName
                      @Common.TextArrangement : #TextOnly;

    employeeConcerned @Common.Text : employeeConcerned.fullName
                      @Common.TextArrangement : #TextOnly;

    currentJobTitle   @Common.Text : currentJobTitle.title
                      @Common.TextArrangement : #TextOnly;

    requestedJobTitle @Common.Text : requestedJobTitle.title
                      @Common.TextArrangement : #TextOnly;

    currentApprover   @Common.Text : currentApprover.fullName
                      @Common.TextArrangement : #TextOnly;
};

annotate service.PromotionRequests with @(
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
            Label : '{@i18n>employeeConcerned}',
            Value : employeeConcerned_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>currentJobTitle}',
            Value : currentJobTitle_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>requestedJobTitle}',
            Value : requestedJobTitle_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>currentSalary}',
            Value : currentSalary,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>requestedSalary}',
            Value : requestedSalary,
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
            Action : 'EmployeeService.approvePromotionRequest',
            ![@Core.OperationAvailable] : canApprove
        },
        {
            $Type : 'UI.DataFieldForAction',
            Label : '{@i18n>reject}',
            Action : 'EmployeeService.rejectPromotionRequest',
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
                Label : '{@i18n>employeeConcerned}',
                Value : employeeConcerned_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>currentJobTitle}',
                Value : currentJobTitle_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>requestedJobTitle}',
                Value : requestedJobTitle_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>currentSalary}',
                Value : currentSalary,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>requestedSalary}',
                Value : requestedSalary,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>justification}',
                Value : justification,
            }
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneralInformationFacet',
            Label : '{@i18n>generalInformation}',
            Target : '@UI.FieldGroup#GeneralInformation',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'FeedbacksFacet',
            Label : '{@i18n>feedbacks}',
            Target : 'feedbacks/@UI.LineItem',
        }
    ]
);

annotate service.PromotionRequests with {
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

    employeeConcerned @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : employeeConcerned_ID,
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

    currentJobTitle @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'JobTitles',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : currentJobTitle_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'title',
            }
        ],
    };

    requestedJobTitle @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'JobTitles',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : requestedJobTitle_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'title',
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

annotate service.PromotionRequests with {
    currentJobTitle @Common.FieldControl : #ReadOnly;
    currentSalary   @Common.FieldControl : #ReadOnly;
};

annotate service.PromotionRequests with @Common.SideEffects #EmployeeConcernedChanged : {
    SourceProperties : [ employeeConcerned_ID ],
    TargetProperties : [ currentJobTitle_ID, currentSalary ]
};