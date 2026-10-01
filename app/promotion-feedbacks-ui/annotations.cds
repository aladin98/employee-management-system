using EmployeeService as service from '../../srv/employee-service';

annotate service.PromotionFeedbacks with {
    author           @Common.Text : author.fullName
                     @Common.TextArrangement : #TextOnly;

    promotionRequest @Common.Text : promotionRequest.ID
                     @Common.TextArrangement : #TextOnly;
};

annotate service.PromotionFeedbacks with @(
    UI.SelectionFields : [
        ID,
        authorRole,
        recommendation
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>promotionRequest}',
            Value : promotionRequest_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>author}',
            Value : author_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>authorRole}',
            Value : authorRole,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>feedback}',
            Value : feedbackText,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>recommendation}',
            Value : recommendation,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>createdAt}',
            Value : createdAt,
        }
    ],
    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>promotionRequest}',
                Value : promotionRequest_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>author}',
                Value : author_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>authorRole}',
                Value : authorRole,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>feedback}',
                Value : feedbackText,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>recommendation}',
                Value : recommendation,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>createdAt}',
                Value : createdAt,
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

annotate service.PromotionFeedbacks with {
    promotionRequest @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'PromotionRequests',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : promotionRequest_ID,
                ValueListProperty : 'ID',
            }
        ],
    };

    author @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : author_ID,
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