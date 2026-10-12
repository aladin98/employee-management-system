using EmployeeService as service from '../../srv/employee-service';

annotate service.Departments with {
    ID @Common.Text : name
       @Common.TextArrangement : #TextOnly;
};

annotate service.Roles with {
    ID @Common.Text : name
       @Common.TextArrangement : #TextOnly;
};

annotate service.JobTitles with {
    ID @Common.Text : title
       @Common.TextArrangement : #TextOnly;
};

annotate service.Employees with {
    department @Common.Text : department.name
               @Common.TextArrangement : #TextOnly;

    role       @Common.Text : role.name
               @Common.TextArrangement : #TextOnly;

    jobTitle   @Common.Text : jobTitle.title
               @Common.TextArrangement : #TextOnly;

    manager    @Common.Text : manager.fullName
               @Common.TextArrangement : #TextOnly;
};

annotate service.Employees with @(
    UI.SelectionFields : [
        ID,
        firstName
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>firstName}',
            Value : firstName
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>lastName}',
            Value : lastName
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>department}',
            Value : department.name
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>role}',
            Value : role.name
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>jobTitle}',
            Value : jobTitle.title
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>manager}',
            Value : manager.fullName
        }
    ],
    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>firstName}',
                Value : firstName
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>lastName}',
                Value : lastName
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>email}',
                Value : email
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>phone}',
                Value : phone
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>hireDate}',
                Value : hireDate
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>salary}',
                Value : salary
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>active}',
                Value : isActive
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>country}',
                Value : country
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>department}',
                Value : department.name
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>role}',
                Value : role.name
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>jobTitle}',
                Value : jobTitle.title
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>manager}',
                Value : manager.fullName
            }
        ]
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneralInformationFacet',
            Label : '{@i18n>generalInformation}',
            Target : '@UI.FieldGroup#GeneralInformation'
        }
    ]
);

annotate service.Employees with {
    department @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Departments',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : department_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'location'
            }
        ]
    };

    role @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Roles',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : role_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'description'
            }
        ]
    };

    jobTitle @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'JobTitles',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : jobTitle_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'title'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'description'
            }
        ]
    };

    manager @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : manager_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'fullName'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'phone'
            }
        ]
    };
};

annotate service.Employees with @(
    Capabilities.UpdateRestrictions.Updatable : false,
    Capabilities.DeleteRestrictions.Deletable : false
);