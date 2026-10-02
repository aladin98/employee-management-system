using EmployeeService as service from '../../srv/employee-service';

annotate service.Notifications with {
    recipient @Common.Text : recipient.fullName
              @Common.TextArrangement : #TextOnly;
};

annotate service.Notifications with @(
    UI.SelectionFields : [
        type,
        isRead
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>recipient}',
            Value : recipient_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>type}',
            Value : type,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>title}',
            Value : title,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>message}',
            Value : message,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>read}',
            Value : isRead,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>createdAt}',
            Value : createdAt,
        }
    ],
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Label : '{@i18n>markAsRead}',
            Action : 'EmployeeService.markAsRead'
        }
    ],
    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>recipient}',
                Value : recipient_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>type}',
                Value : type,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>title}',
                Value : title,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>message}',
                Value : message,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>relatedEntityType}',
                Value : relatedEntityType,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>relatedEntityID}',
                Value : relatedEntityID,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>read}',
                Value : isRead,
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

annotate service.Notifications with {
    recipient @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : recipient_ID,
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