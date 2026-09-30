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
            Label : 'Promotion Request',
            Value : promotionRequest_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Author',
            Value : author_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Author Role',
            Value : authorRole,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Feedback',
            Value : feedbackText,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Recommendation',
            Value : recommendation,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Created At',
            Value : createdAt,
        }
    ],
    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Promotion Request',
                Value : promotionRequest_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Author',
                Value : author_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Author Role',
                Value : authorRole,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Feedback',
                Value : feedbackText,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Recommendation',
                Value : recommendation,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Created At',
                Value : createdAt,
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