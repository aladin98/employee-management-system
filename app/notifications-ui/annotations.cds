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
            Label : 'Recipient',
            Value : recipient_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Type',
            Value : type,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Title',
            Value : title,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Message',
            Value : message,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Read',
            Value : isRead,
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
                Label : 'Recipient',
                Value : recipient_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Type',
                Value : type,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Title',
                Value : title,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Message',
                Value : message,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Related Entity Type',
                Value : relatedEntityType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Related Entity ID',
                Value : relatedEntityID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Read',
                Value : isRead,
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